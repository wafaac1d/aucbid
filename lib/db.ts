import fs from "fs";
import path from "path";
import { types, Pool, type PoolClient, type QueryResultRow } from "pg";
import { driveKey, foldMakeKeys, fuelKey, MILES_MAX, modelKey, nameKey, normalizeMake, vinKey } from "./format";
import { canonicalLotNames, preferredModelName } from "./names";
import type { Category, Filters, Lot, NamedCount, Sale, SaleSummary, Source } from "./types";

types.setTypeParser(20, (value) => Number(value));

type Sql = Pick<Pool | PoolClient, "query">;

const globalForDb = globalThis as unknown as { aucbidPool?: Pool; aucbidReady?: Promise<void> };

const LOT_COLUMNS = [
  "id",
  "source",
  "category",
  "lot_number",
  "stock_number",
  "vin",
  "vin_key",
  "year",
  "make",
  "make_key",
  "model",
  "model_key",
  "series",
  "auction_at",
  "timezone",
  "location",
  "city",
  "state",
  "odometer",
  "odometer_unit",
  "primary_damage",
  "secondary_damage",
  "title_doc",
  "condition",
  "keys",
  "fuel",
  "transmission",
  "drive",
  "engine",
  "color",
  "lane",
  "current_bid",
  "acv",
  "image",
  "url",
  "seen_at",
  "fuel_key",
  "drive_key",
  "name",
] as const;

const INSERT_BATCH = 400;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Нужна переменная DATABASE_URL с адресом Postgres");
  return url;
}

function getPool(): Pool {
  if (!globalForDb.aucbidPool) globalForDb.aucbidPool = new Pool({ connectionString: databaseUrl(), max: 8 });
  return globalForDb.aucbidPool;
}

function toPg(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

async function query<T extends QueryResultRow>(db: Sql, sql: string, params: unknown[] = []): Promise<{ rows: T[]; count: number }> {
  const result = await db.query<T>(toPg(sql), params);
  return { rows: result.rows, count: result.rowCount ?? 0 };
}

export type Tx = {
  all<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<number>;
};

function txFrom(db: Sql): Tx {
  return {
    async all<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
      return (await query<T>(db, sql, params)).rows;
    },
    async get<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
      const row = (await query<T>(db, sql, params)).rows[0];
      return row as T | undefined;
    },
    async run(sql: string, params: unknown[] = []) {
      return (await query(db, sql, params)).count;
    },
  };
}

async function ready(): Promise<void> {
  if (!globalForDb.aucbidReady) globalForDb.aucbidReady = ensureSchema().catch((error) => {
    globalForDb.aucbidReady = undefined;
    throw error;
  });
  return globalForDb.aucbidReady;
}

export async function dbAll<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  return txFrom(getPool()).all<T>(sql, params);
}

export async function dbGet<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  await ready();
  return txFrom(getPool()).get<T>(sql, params);
}

export async function dbRun(sql: string, params: unknown[] = []): Promise<number> {
  await ready();
  return txFrom(getPool()).run(sql, params);
}

export async function dbTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  await ready();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await fn(txFrom(client));
    await client.query("COMMIT");
    return value;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* the transaction may already be closed */
    }
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSchema(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lots (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      lot_number TEXT NOT NULL,
      stock_number TEXT NOT NULL DEFAULT '',
      vin TEXT NOT NULL DEFAULT '',
      vin_key TEXT NOT NULL DEFAULT '',
      year INTEGER NOT NULL DEFAULT 0,
      make TEXT NOT NULL,
      make_key TEXT NOT NULL,
      model TEXT NOT NULL,
      model_key TEXT NOT NULL,
      series TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      auction_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      odometer INTEGER,
      odometer_unit TEXT NOT NULL DEFAULT 'mi',
      primary_damage TEXT NOT NULL DEFAULT '',
      secondary_damage TEXT NOT NULL DEFAULT '',
      title_doc TEXT NOT NULL DEFAULT '',
      condition TEXT NOT NULL DEFAULT '',
      keys TEXT NOT NULL DEFAULT '',
      fuel TEXT NOT NULL DEFAULT '',
      transmission TEXT NOT NULL DEFAULT '',
      drive TEXT NOT NULL DEFAULT '',
      engine TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      lane TEXT NOT NULL DEFAULT '',
      current_bid INTEGER,
      acv INTEGER,
      image TEXT NOT NULL DEFAULT '',
      images TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      seen_at BIGINT,
      fuel_key TEXT NOT NULL DEFAULT '',
      drive_key TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_lots_browse ON lots(category, make_key, model_key, year, auction_at);
    CREATE INDEX IF NOT EXISTS idx_lots_source ON lots(source, auction_at);
    CREATE INDEX IF NOT EXISTS idx_lots_lot ON lots(lot_number);
    CREATE INDEX IF NOT EXISTS idx_lots_vin ON lots(vin_key);
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      lot_number TEXT NOT NULL,
      vin TEXT NOT NULL DEFAULT '',
      year INTEGER NOT NULL DEFAULT 0,
      make TEXT NOT NULL,
      make_key TEXT NOT NULL,
      model TEXT NOT NULL,
      model_key TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      odometer INTEGER,
      odometer_unit TEXT NOT NULL DEFAULT 'mi',
      auction_at TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      title_doc TEXT NOT NULL DEFAULT '',
      archived_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sales_model ON sales(make_key, model_key, auction_at DESC);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      started_at BIGINT,
      finished_at BIGINT,
      status TEXT NOT NULL DEFAULT 'idle',
      message TEXT NOT NULL DEFAULT '',
      last_full_at BIGINT
    );
    INSERT INTO sync_state (id, status, message) VALUES (1, 'idle', '') ON CONFLICT (id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS sync_digest (
      key TEXT PRIMARY KEY,
      head TEXT NOT NULL DEFAULT '',
      total INTEGER NOT NULL DEFAULT 0,
      last_page INTEGER NOT NULL DEFAULT 0
    );
  `);
  await importSqliteIfEmpty();
  await rekeyLots();
}

async function rekeyLots(): Promise<void> {
  const pool = getPool();
  const version = await txFrom(pool).get<{ value: string }>("SELECT value FROM meta WHERE key = 'lot_keys'");
  if (version?.value === "9") return;
  const rows = await txFrom(pool).all<{ id: string; make: string; model: string; fuel: string; drive: string }>(
    "SELECT id, make, model, fuel, drive FROM lots",
  );
  const named = rows.map((row) => {
    const names = canonicalLotNames(row.make, row.model);
    const model = names.model === null ? row.model : names.model;
    return { ...row, make: names.make || row.make, model, makeKey: nameKey(names.make || row.make) };
  });
  const fold = foldMakeKeys(named.map((row) => row.makeKey));
  const display = new Map<string, string>();
  for (const row of named) {
    const target = fold.get(row.makeKey) || row.makeKey;
    if (row.makeKey === target || !display.has(target)) display.set(target, row.make);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tx = txFrom(client);
    const chunk = 2000;
    for (let index = 0; index < named.length; index += chunk) {
      const slice = named.slice(index, index + chunk);
      const makeKeys = slice.map((row) => fold.get(row.makeKey) || row.makeKey);
      await tx.run(
        `UPDATE lots AS l SET
           make = v.make, make_key = v.make_key, model = v.model, model_key = v.model_key,
           fuel_key = v.fuel_key, drive_key = v.drive_key
         FROM unnest(?::text[], ?::text[], ?::text[], ?::text[], ?::text[], ?::text[], ?::text[])
           AS v(id, make, make_key, model, model_key, fuel_key, drive_key)
         WHERE l.id = v.id`,
        [
          slice.map((row) => row.id),
          makeKeys.map((makeKey, item) => display.get(makeKey) || slice[item].make),
          makeKeys,
          slice.map((row) => row.model),
          slice.map((row) => modelKey(row.model)),
          slice.map((row) => fuelKey(row.fuel)),
          slice.map((row) => driveKey(row.drive)),
        ],
      );
    }
    await tx.run("INSERT INTO meta (key, value) VALUES ('lot_keys', '9') ON CONFLICT (key) DO UPDATE SET value = '9'");
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* the transaction may already be closed */
    }
    throw error;
  } finally {
    client.release();
  }
}

async function importSqliteIfEmpty(): Promise<void> {
  const file = path.join(process.cwd(), "data", "aucbid.db");
  if (!fs.existsSync(file)) return;
  const client = await getPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock(641209)");
    const existing = await client.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM lots");
    if (Number(existing.rows[0]?.count) > 0) return;
    const { DatabaseSync } = await import("node:sqlite");
    let sqlite: InstanceType<typeof DatabaseSync> | null = null;
    try {
      sqlite = new DatabaseSync(file, { readOnly: true });
      const lots = sqlite.prepare("SELECT * FROM lots").all() as Record<string, unknown>[];
      const tx = txFrom(client);
      await client.query("BEGIN");
      const seenAt = Date.now();
      await insertLots(
        tx,
        lots.map((row) => rowToLot(row as LotRow)),
        seenAt,
      );
      const withImages = lots.filter((row): row is Record<string, unknown> & { id: unknown; images: string } => typeof row.images === "string" && row.images.length > 0);
      const withSeen = lots.filter((row) => Number(row.seen_at) > 0);
      for (let index = 0; index < Math.max(withImages.length, withSeen.length); index += 2000) {
        const images = withImages.slice(index, index + 2000);
        if (images.length > 0) {
          await tx.run(
            `UPDATE lots AS l SET images = v.images
             FROM unnest(?::text[], ?::text[]) AS v(id, images)
             WHERE l.id = v.id`,
            [images.map((row) => String(row.id)), images.map((row) => row.images)],
          );
        }
        const seen = withSeen.slice(index, index + 2000);
        if (seen.length > 0) {
          await tx.run(
            `UPDATE lots AS l SET seen_at = v.seen_at::bigint
             FROM unnest(?::text[], ?::text[]) AS v(id, seen_at)
             WHERE l.id = v.id`,
            [seen.map((row) => String(row.id)), seen.map((row) => String(Number(row.seen_at)))],
          );
        }
      }
      const digestTable = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sync_digest'").get();
      if (digestTable) {
        const digests = sqlite.prepare("SELECT key, head, total, last_page FROM sync_digest").all() as Record<string, unknown>[];
        for (const row of digests) {
          await tx.run(
            `INSERT INTO sync_digest (key, head, total, last_page) VALUES (?, ?, ?, ?)
             ON CONFLICT (key) DO UPDATE SET head = EXCLUDED.head, total = EXCLUDED.total, last_page = EXCLUDED.last_page`,
            [String(row.key), String(row.head || ""), Number(row.total) || 0, Number(row.last_page) || 0],
          );
        }
      }
      await client.query("COMMIT");
      console.log(`Postgres получил ${lots.length} лотов из локального каталога`);
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* the transaction may already be closed */
      }
      console.error(`Каталог из sqlite не перенесён: ${error instanceof Error ? error.message : error}`);
    } finally {
      sqlite?.close();
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(641209)");
    client.release();
  }
}

type LotRow = {
  id: string;
  source: Source;
  category: Category;
  lot_number: string;
  stock_number: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  series: string;
  name?: string;
  images?: string;
  auction_at: string;
  timezone: string;
  location: string;
  city: string;
  state: string;
  odometer: number | null;
  odometer_unit: string;
  primary_damage: string;
  secondary_damage: string;
  title_doc: string;
  condition: string;
  keys: string;
  fuel: string;
  transmission: string;
  drive: string;
  engine: string;
  color: string;
  lane: string;
  current_bid: number | null;
  acv: number | null;
  image: string;
  url: string;
};

function storedImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function rowToLot(row: LotRow): Lot {
  return {
    id: row.id,
    source: row.source,
    category: row.category,
    lotNumber: row.lot_number,
    stockNumber: row.stock_number,
    vin: row.vin,
    year: Number(row.year) || 0,
    make: row.make,
    model: row.model,
    series: row.series,
    name: row.name || "",
    images: storedImages(row.images),
    auctionAt: row.auction_at,
    timezone: row.timezone,
    location: row.location,
    city: row.city,
    state: row.state,
    odometer: row.odometer == null ? null : Number(row.odometer),
    odometerUnit: row.odometer_unit === "km" ? "km" : "mi",
    primaryDamage: row.primary_damage,
    secondaryDamage: row.secondary_damage,
    titleDoc: row.title_doc,
    condition: row.condition,
    keys: row.keys,
    fuel: row.fuel,
    transmission: row.transmission,
    drive: row.drive,
    engine: row.engine,
    color: row.color,
    lane: row.lane,
    currentBid: row.current_bid == null ? null : Number(row.current_bid),
    acv: row.acv == null ? null : Number(row.acv),
    image: row.image,
    url: row.url,
  };
}

function lotValues(lot: Lot, seenAt: number): Array<string | number | null> {
  return [
    lot.id,
    lot.source,
    lot.category,
    lot.lotNumber,
    lot.stockNumber,
    lot.vin,
    vinKey(lot.vin),
    lot.year || 0,
    lot.make,
    nameKey(lot.make),
    lot.model,
    modelKey(lot.model),
    lot.series,
    lot.auctionAt,
    lot.timezone,
    lot.location,
    lot.city,
    lot.state,
    lot.odometer,
    lot.odometerUnit,
    lot.primaryDamage,
    lot.secondaryDamage,
    lot.titleDoc,
    lot.condition,
    lot.keys,
    lot.fuel,
    lot.transmission,
    lot.drive,
    lot.engine,
    lot.color,
    lot.lane,
    lot.currentBid,
    lot.acv,
    lot.image,
    lot.url,
    seenAt,
    fuelKey(lot.fuel),
    driveKey(lot.drive),
    lot.name,
  ];
}

async function insertLots(tx: Tx, lots: Iterable<Lot>, seenAt: number): Promise<void> {
  const pending: Lot[] = [];
  const flush = async () => {
    if (pending.length === 0) return;
    const batch = pending.splice(0, pending.length);
    const values: Array<string | number | null> = [];
    const groups = batch.map((lot) => {
      const row = lotValues(lot, seenAt);
      values.push(...row);
      return `(${row.map(() => "?").join(", ")})`;
    });
    const assignments = LOT_COLUMNS.filter((column) => column !== "id")
      .map((column) => `${column} = EXCLUDED.${column}`)
      .join(", ");
    await tx.run(`INSERT INTO lots (${LOT_COLUMNS.join(", ")}) VALUES ${groups.join(", ")} ON CONFLICT (id) DO UPDATE SET ${assignments}`, values);
  };
  for (const lot of lots) {
    pending.push(lot);
    if (pending.length >= INSERT_BATCH) await flush();
  }
  await flush();
}

export async function saveLots(lots: Lot[], seenAt: number): Promise<number> {
  const unique = new Map<string, Lot>();
  for (const lot of lots) {
    if (!lot.auctionAt || !lot.make) continue;
    unique.set(lot.id, lot);
  }
  await dbTx(async (tx) => {
    await insertLots(tx, unique.values(), seenAt);
  });
  return unique.size;
}

export async function pruneSource(source: Source, seenAt: number): Promise<number> {
  return dbTx(async (tx) => {
    await tx.run(
      `INSERT INTO sales (
        id, source, category, lot_number, vin, year, make, make_key, model, model_key, name,
        price, odometer, odometer_unit, auction_at, city, state, location, image, url, title_doc, archived_at
      )
      SELECT id, source, category, lot_number, vin, year, make, make_key, model, model_key, name,
        current_bid, odometer, odometer_unit, auction_at, city, state, location, image, url, title_doc, ?
      FROM lots
      WHERE source = ? AND COALESCE(seen_at, 0) <> ? AND current_bid > 0
      ON CONFLICT (id) DO UPDATE SET
        price = EXCLUDED.price,
        name = EXCLUDED.name,
        odometer = EXCLUDED.odometer,
        auction_at = EXCLUDED.auction_at,
        archived_at = EXCLUDED.archived_at`,
      [seenAt, source, seenAt],
    );
    return tx.run("DELETE FROM lots WHERE source = ? AND COALESCE(seen_at, 0) <> ?", [source, seenAt]);
  });
}

export async function replaceSource(source: Source, lots: Lot[]): Promise<number> {
  const unique = new Map<string, Lot>();
  for (const lot of lots) {
    if (lot.source !== source || !lot.auctionAt || !lot.make) continue;
    unique.set(lot.id, lot);
  }
  const seenAt = Date.now();
  await dbTx(async (tx) => {
    await tx.run("DELETE FROM lots WHERE source = ?", [source]);
    await insertLots(tx, unique.values(), seenAt);
  });
  return unique.size;
}

const freshAuction = "auction_at >= to_char((now() AT TIME ZONE 'utc') - interval '36 hours', 'YYYY-MM-DD HH24:MI:SS')";

const milesExpr = `(CASE WHEN odometer IS NULL THEN NULL WHEN odometer_unit = 'km' THEN odometer * 0.621371 ELSE odometer END)`;

export function buildWhere(filters: Filters): { sql: string; params: Array<string | number> } {
  const clauses = [freshAuction];
  const params: Array<string | number> = [];
  const q = filters.q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (q) {
    clauses.push(`(
      lot_number = ? OR stock_number = ?
      OR replace(replace(upper(lot_number), '-', ''), ' ', '') = ?
      OR replace(replace(upper(stock_number), '-', ''), ' ', '') = ?
      OR id = 'iaai-' || ? OR id = 'copart-' || ?
      OR vin_key = ?
      OR (length(?) >= 6 AND length(vin_key) >= 6 AND (vin_key LIKE ? || '%' OR ? LIKE vin_key || '%' OR strpos(vin_key, ?) > 0))
      OR (length(?) >= 4 AND (lot_number LIKE ? || '%' OR stock_number LIKE ? || '%' OR replace(replace(upper(lot_number), '-', ''), ' ', '') LIKE ? || '%'))
    )`);
    params.push(q, q, q, q, q, q, q, q, q, q, q, q, q, q, q);
    return { sql: clauses.join(" AND "), params };
  }
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }
  if (filters.make) {
    clauses.push("make_key = ?");
    params.push(filters.make);
  }
  if (filters.model) {
    clauses.push("model_key = ?");
    params.push(filters.model);
  }
  if (filters.yearFrom) {
    clauses.push("year >= ?");
    params.push(filters.yearFrom);
  }
  if (filters.yearTo) {
    clauses.push("year <= ?");
    params.push(filters.yearTo);
  }
  if (filters.fuel) {
    clauses.push("fuel_key = ?");
    params.push(filters.fuel);
  }
  if (filters.drive) {
    clauses.push("drive_key = ?");
    params.push(filters.drive);
  }
  if (filters.milesFrom != null && filters.milesFrom > 0) {
    clauses.push(`${milesExpr} >= ?`);
    params.push(filters.milesFrom);
  }
  if (filters.milesTo != null) {
    clauses.push(`${milesExpr} <= ?`);
    params.push(filters.milesTo);
  }
  return { sql: clauses.join(" AND "), params };
}

export async function searchLots(filters: Filters, pageSize = 24): Promise<{ items: Lot[]; total: number }> {
  const where = buildWhere(filters);
  const totalRow = await dbGet<{ total: number }>(`SELECT COUNT(*)::int AS total FROM lots WHERE ${where.sql}`, where.params);
  const page = Math.max(1, filters.page || 1);
  const rows = await dbAll<LotRow>(`SELECT * FROM lots WHERE ${where.sql} ORDER BY auction_at ASC, make ASC LIMIT ? OFFSET ?`, [
    ...where.params,
    pageSize,
    (page - 1) * pageSize,
  ]);
  return { items: rows.map(rowToLot), total: Number(totalRow?.total) || 0 };
}

export async function getLot(id: string): Promise<Lot | null> {
  const row = await dbGet<LotRow>("SELECT * FROM lots WHERE id = ?", [id]);
  return row ? rowToLot(row) : null;
}

export async function cachedImages(id: string): Promise<string[]> {
  const row = await dbGet<{ images?: string }>("SELECT images FROM lots WHERE id = ?", [id]);
  return storedImages(row?.images);
}

export async function saveImages(id: string, images: string[]): Promise<void> {
  await dbRun("UPDATE lots SET images = ? WHERE id = ?", [JSON.stringify(images), id]);
}

export async function listMakes(filters: Pick<Filters, "category" | "source">): Promise<NamedCount[]> {
  const clauses = [freshAuction];
  const params: string[] = [];
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }
  const rows = await dbAll<NamedCount>(
    `SELECT make_key AS key, MAX(make) AS name, COUNT(*)::int AS count
     FROM lots WHERE ${clauses.join(" AND ")}
     GROUP BY make_key
     ORDER BY lower(MAX(make))`,
    params,
  );
  const grouped = new Map<string, NamedCount>();
  for (const row of rows) {
    const name = normalizeMake(row.name);
    const key = nameKey(name);
    const current = grouped.get(key);
    if (current) current.count += Number(row.count);
    else grouped.set(key, { key, name, count: Number(row.count) });
  }
  return [...grouped.values()].sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export async function listModels(filters: Pick<Filters, "category" | "source" | "make">): Promise<NamedCount[]> {
  if (!filters.make) return [];
  const clauses = [freshAuction, "make_key = ?", "model_key <> ''"];
  const params: string[] = [filters.make];
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }
  const rows = await dbAll<NamedCount>(
    `SELECT model_key AS key, MAX(model) AS name, COUNT(*)::int AS count
     FROM lots WHERE ${clauses.join(" AND ")}
     GROUP BY model_key
     ORDER BY lower(MAX(model))`,
    params,
  );
  const grouped = new Map<string, NamedCount>();
  for (const row of rows) {
    const name = preferredModelName(filters.make, row.name);
    if (!name) continue;
    const key = modelKey(name);
    const current = grouped.get(key);
    if (current) current.count += Number(row.count);
    else grouped.set(key, { key, name, count: Number(row.count) });
  }
  return [...grouped.values()].sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export async function yearBounds(filters: Pick<Filters, "category" | "source">): Promise<{ min: number; max: number }> {
  const clauses = [freshAuction, "year BETWEEN 1901 AND 2035"];
  const params: string[] = [];
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }
  const row = await dbGet<{ min: number | null; max: number | null }>(
    `SELECT MIN(year)::int AS min, MAX(year)::int AS max FROM lots WHERE ${clauses.join(" AND ")}`,
    params,
  );
  const current = new Date().getFullYear();
  return {
    min: Number(row?.min) || current - 25,
    max: Number(row?.max) || current + 1,
  };
}

export async function categoryCounts(): Promise<Record<Category, number>> {
  const rows = await dbAll<{ category: Category; count: number }>(
    `SELECT category, COUNT(*)::int AS count FROM lots WHERE ${freshAuction} GROUP BY category`,
  );
  const counts: Record<Category, number> = { car: 0, motorcycle: 0, atv: 0 };
  for (const row of rows) counts[row.category] = Number(row.count);
  return counts;
}

export async function relatedLots(lot: Lot, limit = 4): Promise<Lot[]> {
  const rows = await dbAll<LotRow>(
    `SELECT * FROM lots
     WHERE id <> ? AND make_key = ? AND ${freshAuction}
     ORDER BY CASE WHEN model_key = ? THEN 0 ELSE 1 END, auction_at ASC
     LIMIT ?`,
    [lot.id, nameKey(lot.make), modelKey(lot.model), limit],
  );
  return rows.map(rowToLot);
}

type SaleRow = {
  id: string;
  source: Source;
  category: Category;
  lot_number: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  name: string;
  price: number;
  odometer: number | null;
  odometer_unit: string;
  auction_at: string;
  city: string;
  state: string;
  location: string;
  image: string;
  url: string;
};

function rowToSale(row: SaleRow): Sale {
  return {
    id: row.id,
    source: row.source,
    category: row.category,
    lotNumber: row.lot_number,
    vin: row.vin,
    year: Number(row.year) || 0,
    make: row.make,
    model: row.model,
    name: row.name,
    price: Number(row.price) || 0,
    odometer: row.odometer == null ? null : Number(row.odometer),
    odometerUnit: row.odometer_unit === "km" ? "km" : "mi",
    auctionAt: row.auction_at,
    city: row.city,
    state: row.state,
    location: row.location,
    image: row.image,
    url: row.url,
  };
}

export async function listArchiveMakes(): Promise<NamedCount[]> {
  const rows = await dbAll<NamedCount>(
    `SELECT make_key AS key, MAX(make) AS name, COUNT(*)::int AS count
     FROM sales GROUP BY make_key ORDER BY lower(MAX(make))`,
  );
  return rows
    .map((row) => ({ key: row.key, name: normalizeMake(row.name), count: Number(row.count) }))
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export async function listArchiveModels(make: string): Promise<Array<NamedCount & { average: number | null }>> {
  if (!make) return [];
  const rows = await dbAll<NamedCount & { average: number | null }>(
    `SELECT model_key AS key, MAX(model) AS name, COUNT(*)::int AS count, ROUND(AVG(price))::int AS average
     FROM sales WHERE make_key = ? AND model_key <> ''
     GROUP BY model_key ORDER BY lower(MAX(model))`,
    [make],
  );
  return rows
    .map((row) => ({
      key: row.key,
      name: row.name,
      count: Number(row.count),
      average: row.average == null ? null : Number(row.average),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export async function saleSummary(make: string, model: string): Promise<SaleSummary> {
  const row = await dbGet<{ count: number; average: number | null; min: number | null; max: number | null }>(
    `SELECT COUNT(*)::int AS count, ROUND(AVG(price))::int AS average, MIN(price)::int AS min, MAX(price)::int AS max
     FROM sales WHERE make_key = ? AND model_key = ?`,
    [make, model],
  );
  return {
    count: Number(row?.count) || 0,
    average: row?.average == null ? null : Number(row.average),
    min: row?.min == null ? null : Number(row.min),
    max: row?.max == null ? null : Number(row.max),
  };
}

export async function searchSales(make: string, model: string, page: number, pageSize = 40): Promise<{ items: Sale[]; total: number }> {
  const summary = await saleSummary(make, model);
  const rows = await dbAll<SaleRow>(
    `SELECT * FROM sales WHERE make_key = ? AND model_key = ? ORDER BY auction_at DESC LIMIT ? OFFSET ?`,
    [make, model, pageSize, (Math.max(1, page) - 1) * pageSize],
  );
  return { items: rows.map(rowToSale), total: summary.count };
}

export function filtersFromParams(params: Record<string, string | string[] | undefined>): Filters {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value || "").trim();
  };
  const category = one("category");
  const source = one("source");
  const yearFrom = Number(one("yearFrom"));
  const yearTo = Number(one("yearTo"));
  let from = Number.isFinite(yearFrom) && yearFrom >= 1900 ? yearFrom : null;
  let to = Number.isFinite(yearTo) && yearTo >= 1900 ? yearTo : null;
  if (from && to && from > to) [from, to] = [to, from];
  const fuel = one("fuel");
  const drive = one("drive");
  const milesFromText = one("milesFrom");
  const milesToText = one("milesTo");
  const milesFromRaw = Number(milesFromText);
  const milesToRaw = Number(milesToText);
  let milesFrom = milesFromText !== "" && Number.isFinite(milesFromRaw) && milesFromRaw > 0 ? Math.min(MILES_MAX, Math.round(milesFromRaw)) : null;
  let milesTo = milesToText !== "" && Number.isFinite(milesToRaw) && milesToRaw >= 0 ? Math.min(MILES_MAX, Math.round(milesToRaw)) : null;
  if (milesFrom != null && milesTo != null && milesFrom > milesTo) [milesFrom, milesTo] = [milesTo, milesFrom];
  return {
    category: category === "car" || category === "motorcycle" || category === "atv" ? category : "",
    source: source === "iaai" || source === "copart" ? source : "",
    make: nameKey(one("make")),
    model: nameKey(one("model")),
    yearFrom: from,
    yearTo: to,
    fuel: fuel === "gas" || fuel === "diesel" || fuel === "hybrid" || fuel === "electric" ? fuel : "",
    drive: drive === "awd" || drive === "fwd" || drive === "rwd" ? drive : "",
    milesFrom,
    milesTo,
    q: one("q").slice(0, 32),
    page: Math.max(1, Number(one("page")) || 1),
  };
}

export function filtersToQuery(filters: Filters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.source) params.set("source", filters.source);
  if (filters.make) params.set("make", filters.make);
  if (filters.model) params.set("model", filters.model);
  if (filters.yearFrom) params.set("yearFrom", String(filters.yearFrom));
  if (filters.yearTo) params.set("yearTo", String(filters.yearTo));
  if (filters.fuel) params.set("fuel", filters.fuel);
  if (filters.drive) params.set("drive", filters.drive);
  if (filters.milesFrom) params.set("milesFrom", String(filters.milesFrom));
  if (filters.milesTo != null) params.set("milesTo", String(filters.milesTo));
  if (filters.q) params.set("q", filters.q);
  if (page && page > 1) params.set("page", String(page));
  return params.toString();
}
