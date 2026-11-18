import { countFreshLots, countSeenLots, dbGet, dbRun, dbTx, pruneSource, saveLots } from "./db";
import type { Source } from "./types";
import type { CatalogProbe, PageStamp } from "./digest";
import { refreshEveryMs } from "./digest";
import { pullCopart } from "../parsers/copart";
import { pullIaai } from "../parsers/iaai";

export { refreshEveryMs };
export const REFRESH_HEAD_PAGES = 3;

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

async function readRow(): Promise<SyncRow> {
  const row = await dbGet<SyncRow>("SELECT started_at, finished_at, status, message FROM sync_state WHERE id = 1");
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

export async function getSyncStatus(): Promise<SyncPublicStatus> {
  return toPublicStatus(await readRow());
}

export const MAX_PAGES = 2000;

export function clampPages(raw: string | undefined): number {
  if (!raw) return MAX_PAGES;
  const pages = Number(raw);
  if (!Number.isFinite(pages) || pages < 1) return 1;
  return Math.min(MAX_PAGES, Math.floor(pages));
}

async function tryBegin(ignoreCooldown: boolean): Promise<{ accepted: boolean; startedAt: number; status: SyncPublicStatus }> {
  return dbTx(async (tx) => {
    const row = await tx.get<SyncRow>("SELECT started_at, finished_at, status, message FROM sync_state WHERE id = 1 FOR UPDATE");
    const now = Date.now();
    const current = {
      started_at: row?.started_at ?? null,
      finished_at: row?.finished_at ?? null,
      status: row?.status || "idle",
      message: row?.message || "",
    };
    const status = toPublicStatus(current, now);
    const blocked = (status.running || status.retryAfterMs > 0) && !ignoreCooldown;
    if (blocked) return { accepted: false, startedAt: current.started_at ?? now, status };
    await tx.run("UPDATE sync_state SET started_at = ?, finished_at = NULL, status = 'running', message = '' WHERE id = 1", [now]);
    return { accepted: true, startedAt: now, status: toPublicStatus({ ...current, started_at: now, finished_at: null, status: "running", message: "" }, now) };
  });
}

async function finishSync(startedAt: number, ok: boolean, message: string, mode: SyncMode): Promise<void> {
  const finishedAt = Date.now();
  await dbRun(
    `UPDATE sync_state
     SET finished_at = ?, status = ?, message = ?, last_full_at = CASE WHEN ? = 1 THEN ? ELSE last_full_at END
     WHERE id = 1 AND started_at = ? AND status = 'running'`,
    [finishedAt, ok ? "ok" : "error", message.slice(0, 500), ok && mode === "full" ? 1 : 0, finishedAt, startedAt],
  );
}

export type SyncMode = "full" | "refresh";

async function readStamp(key: string): Promise<PageStamp | null> {
  const row = await dbGet<{ head: string; total: number; last_page: number }>("SELECT head, total, last_page FROM sync_digest WHERE key = ?", [key]);
  if (!row) return null;
  return { head: row.head, total: Number(row.total), lastPage: Number(row.last_page) };
}

async function writeStamp(key: string, patch: Partial<PageStamp>): Promise<void> {
  const current = (await readStamp(key)) ?? { head: "", total: 0, lastPage: 0 };
  const next = { ...current, ...patch };
  await dbRun(
    `INSERT INTO sync_digest (key, head, total, last_page) VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET head = EXCLUDED.head, total = EXCLUDED.total, last_page = EXCLUDED.last_page`,
    [key, next.head, next.total, next.lastPage],
  );
}

async function pruneIfKept(
  log: (message: string) => void,
  label: string,
  source: Source,
  seenAt: number,
  before: number,
): Promise<void> {
  const kept = await countSeenLots(source, seenAt);
  if (before >= 200 && kept < before * 0.5) {
    log(`${label}: в этой выборке ${kept} лотов, в каталоге было ${before}. Выборка слишком короткая, старые лоты оставлены`);
    return;
  }
  const removed = await pruneSource(source, seenAt);
  log(`${label} сохранено ${kept}, снято с каталога ${removed}`);
}

function catalogProbe(mode: SyncMode): CatalogProbe {
  return { mode, headPages: REFRESH_HEAD_PAGES, read: readStamp, write: writeStamp };
}

export async function executeSync(
  pages: number,
  log: (message: string) => void,
  mode: SyncMode = "full",
): Promise<{ ok: boolean; message: string }> {
  const seenAt = Date.now();
  const probe = catalogProbe(mode);
  if (mode === "refresh") {
    log("Короткое обновление: хеш первой страницы, без полного обхода каталога");
  } else {
    const scope = pages >= MAX_PAGES ? "все страницы" : `до ${pages} стр.`;
    log(`Полная синхронизация: ${scope} на каждый запрос, только лоты с датой торгов`);
  }
  const save = (lots: Parameters<typeof saveLots>[0]) => saveLots(lots, seenAt);

  const iaaiBefore = mode === "full" ? await countFreshLots("iaai") : 0;
  const iaai = await pullIaai(pages, log, save, probe);
  if (mode === "full" && iaai.complete) {
    await pruneIfKept(log, "IAAI", "iaai", seenAt, iaaiBefore);
  } else if (mode === "full") {
    log(`IAAI загружен не до конца (${iaai.saved}). Прежние лоты этого аукциона оставлены`);
  } else {
    log(`IAAI обновлено ${iaai.saved}`);
  }

  try {
    const copartBefore = mode === "full" ? await countFreshLots("copart") : 0;
    const copart = await pullCopart(pages, log, save, probe);
    if (mode === "full" && copart.complete) {
      await pruneIfKept(log, "Copart", "copart", seenAt, copartBefore);
    } else if (mode === "full") {
      log(`Copart загружен не до конца (${copart.saved}). Прежние лоты этого аукциона оставлены`);
    } else {
      log(`Copart обновлено ${copart.saved}`);
    }
    const ok = mode === "refresh" || (iaai.complete && copart.complete);
    return { ok, message: `IAAI ${iaai.saved}, Copart ${copart.saved}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Copart пропущен: ${message}`);
    return { ok: false, message: `IAAI ${iaai.saved}. Copart: ${message}` };
  }
}

let syncing = false;

async function beginOrBusy(ignoreCooldown: boolean): Promise<{ accepted: boolean; startedAt: number; status: SyncPublicStatus }> {
  try {
    return await tryBegin(ignoreCooldown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/busy|locked/i.test(message)) throw error;
    return { accepted: false, startedAt: Date.now(), status: await getSyncStatus() };
  }
}

export type SyncRun = "complete" | "partial" | "busy";

export async function runSync(mode: SyncMode, pages = clampPages(process.env.SYNC_PAGES)): Promise<SyncRun> {
  if (syncing) return "busy";
  const start = await beginOrBusy(mode === "full");
  if (!start.accepted) return "busy";
  syncing = true;
  try {
    const result = await executeSync(pages, (message) => console.log(message), mode);
    await finishSync(start.startedAt, result.ok, result.message, mode);
    return result.ok ? "complete" : "partial";
  } catch (error) {
    await finishSync(start.startedAt, false, error instanceof Error ? error.message : String(error), mode);
    return "partial";
  } finally {
    syncing = false;
  }
}

export async function runCliSync(pages: number): Promise<number> {
  const start = await beginOrBusy(false);
  if (!start.accepted) {
    if (start.status.running) console.log("Синхронизация уже выполняется, повторный запрос не отправлен");
    else console.log(`Данные обновлялись меньше 5 минут назад. Повтор через ${Math.ceil(start.status.retryAfterMs / 1000)} с`);
    return 0;
  }
  syncing = true;
  try {
    const result = await executeSync(pages, (message) => console.log(message), "full");
    await finishSync(start.startedAt, result.ok, result.message, "full");
    return result.ok ? 0 : 1;
  } catch (error) {
    await finishSync(start.startedAt, false, error instanceof Error ? error.message : String(error), "full");
    throw error;
  } finally {
    syncing = false;
  }
}
