import { getDb, replaceSource } from "./db";
import { pullCopart } from "../parsers/copart";
import { pullIaai } from "../parsers/iaai";

export const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const STALE_RUNNING_MS = 15 * 60 * 1000;

export type SyncPublicStatus = {
  running: boolean;
  canStart: boolean;
  startedAt: string | null;
  retryAfterMs: number;
  message: string;
};

type SyncRow = {
  started_at: number | null;
  finished_at: number | null;
  status: string;
  message: string;
};

function ensureSyncTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      started_at INTEGER,
      finished_at INTEGER,
      status TEXT NOT NULL DEFAULT 'idle',
      message TEXT NOT NULL DEFAULT ''
    );
    INSERT OR IGNORE INTO sync_state (id, status, message) VALUES (1, 'idle', '');
  `);
}

function readRow(): SyncRow {
  ensureSyncTable();
  const row = getDb()
    .prepare("SELECT started_at, finished_at, status, message FROM sync_state WHERE id = 1")
    .get() as SyncRow | undefined;
  return {
    started_at: row?.started_at ?? null,
    finished_at: row?.finished_at ?? null,
    status: row?.status || "idle",
    message: row?.message || "",
  };
}

function isRunning(row: SyncRow, now: number): boolean {
  return row.status === "running" && row.started_at != null && now - row.started_at < STALE_RUNNING_MS;
}

export function toPublicStatus(row: SyncRow, now = Date.now()): SyncPublicStatus {
  const running = isRunning(row, now);
  const retryAfterMs = row.started_at == null ? 0 : Math.max(0, row.started_at + SYNC_COOLDOWN_MS - now);
  return {
    running,
    canStart: !running && retryAfterMs === 0,
    startedAt: row.started_at == null ? null : new Date(row.started_at).toISOString(),
    retryAfterMs,
    message: row.message,
  };
}

export function getSyncStatus(): SyncPublicStatus {
  return toPublicStatus(readRow());
}

export function clampPages(raw: string | undefined): number {
  const pages = Number(raw || 3);
  if (!Number.isFinite(pages) || pages < 1) return 1;
  return Math.min(30, Math.floor(pages));
}

function tryBegin(): { accepted: boolean; startedAt: number; status: SyncPublicStatus } {
  ensureSyncTable();
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db.prepare("SELECT started_at, finished_at, status, message FROM sync_state WHERE id = 1").get() as SyncRow;
    const now = Date.now();
    const status = toPublicStatus(
      {
        started_at: row?.started_at ?? null,
        finished_at: row?.finished_at ?? null,
        status: row?.status || "idle",
        message: row?.message || "",
      },
      now,
    );
    if (!status.canStart) {
      db.exec("COMMIT");
      return { accepted: false, startedAt: row?.started_at ?? now, status };
    }
    db.prepare("UPDATE sync_state SET started_at = ?, finished_at = NULL, status = 'running', message = '' WHERE id = 1").run(now);
    db.exec("COMMIT");
    return { accepted: true, startedAt: now, status: getSyncStatus() };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* the transaction may already be closed */
    }
    throw error;
  }
}

function finishSync(startedAt: number, ok: boolean, message: string): void {
  ensureSyncTable();
  getDb()
    .prepare(
      `UPDATE sync_state
       SET finished_at = ?, status = ?, message = ?
       WHERE id = 1 AND started_at = ? AND status = 'running'`,
    )
    .run(Date.now(), ok ? "ok" : "error", message.slice(0, 500), startedAt);
}

export async function executeSync(pages: number, log: (message: string) => void): Promise<{ ok: boolean; message: string }> {
  log(`Синхронизация: до ${pages} стр. на каждый запрос, только лоты с датой торгов`);
  const iaai = await pullIaai(pages, log);
  const iaaiSaved = replaceSource("iaai", iaai);
  log(`IAAI сохранено: ${iaaiSaved}`);
  try {
    const copart = await pullCopart(pages, log);
    const copartSaved = replaceSource("copart", copart);
    log(`Copart сохранено: ${copartSaved}`);
    return { ok: true, message: `IAAI ${iaaiSaved}, Copart ${copartSaved}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Copart пропущен: ${message}`);
    return { ok: false, message: `IAAI ${iaaiSaved}. Copart: ${message}` };
  }
}

function beginOrBusy(): { accepted: boolean; startedAt: number; status: SyncPublicStatus } {
  try {
    return tryBegin();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/busy|locked/i.test(message)) throw error;
    return { accepted: false, startedAt: Date.now(), status: getSyncStatus() };
  }
}

export function requestSync(): { accepted: boolean; status: SyncPublicStatus } {
  const start = beginOrBusy();
  if (!start.accepted) return { accepted: false, status: start.status };
  const pages = clampPages(process.env.SYNC_PAGES);
  void executeSync(pages, (message) => console.log(message))
    .then((result) => finishSync(start.startedAt, result.ok, result.message))
    .catch((error) => finishSync(start.startedAt, false, error instanceof Error ? error.message : String(error)));
  return { accepted: true, status: getSyncStatus() };
}

export async function runCliSync(pages: number): Promise<number> {
  const start = beginOrBusy();
  if (!start.accepted) {
    if (start.status.running) console.log("Синхронизация уже выполняется, повторный запрос не отправлен");
    else console.log(`Данные обновлялись меньше 5 минут назад. Повтор через ${Math.ceil(start.status.retryAfterMs / 1000)} с`);
    return 0;
  }
  try {
    const result = await executeSync(pages, (message) => console.log(message));
    finishSync(start.startedAt, result.ok, result.message);
    return result.ok ? 0 : 1;
  } catch (error) {
    finishSync(start.startedAt, false, error instanceof Error ? error.message : String(error));
    throw error;
  }
}
