import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { baseModelName, driveKey, fuelKey, MILES_MAX, modelKey, nameKey, vinKey } from "./format";
import type { Category, Filters, Lot, NamedCount, Source } from "./types";

const globalForDb = globalThis as unknown as { aucbid?: DatabaseSync };

function databasePath(): string {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "aucbid.db");
}

function openDatabase(): DatabaseSync {
  const db = new DatabaseSync(databasePath());
  db.exec(`
    PRAGMA journal_mode = WAL;
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
      url TEXT NOT NULL DEFAULT '',
      seen_at INTEGER,
      fuel_key TEXT NOT NULL DEFAULT '',
      drive_key TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_lots_browse ON lots(category, make_key, model_key, year, auction_at);
    CREATE INDEX IF NOT EXISTS idx_lots_source ON lots(source, auction_at);
    CREATE INDEX IF NOT EXISTS idx_lots_lot ON lots(lot_number);
    CREATE INDEX IF NOT EXISTS idx_lots_vin ON lots(vin_key);
  `);
  ensureColumn(db, "seen_at", "ALTER TABLE lots ADD COLUMN seen_at INTEGER");
  ensureColumn(db, "fuel_key", "ALTER TABLE lots ADD COLUMN fuel_key TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "drive_key", "ALTER TABLE lots ADD COLUMN drive_key TEXT NOT NULL DEFAULT ''");
  rekeyLots(db);
  return db;
}

function ensureColumn(db: DatabaseSync, name: string, statement: string): void {
  const columns = db.prepare("PRAGMA table_info(lots)").all() as { name: string }[];
  if (!columns.some((column) => column.name === name)) db.exec(statement);
}

function rekeyLots(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const version = db.prepare("SELECT value FROM meta WHERE key = 'lot_keys'").get() as { value: string } | undefined;
  if (version?.value === "6") return;
  const rows = db.prepare("SELECT id, model, fuel, drive FROM lots").all() as {
    id: string;
    model: string;
    fuel: string;
    drive: string;
  }[];
  const update = db.prepare("UPDATE lots SET model_key = ?, fuel_key = ?, drive_key = ? WHERE id = ?");
  db.exec("BEGIN");
  try {
    for (const row of rows) update.run(modelKey(row.model), fuelKey(row.fuel), driveKey(row.drive), row.id);
    db.prepare("INSERT INTO meta (key, value) VALUES ('lot_keys', '6') ON CONFLICT(key) DO UPDATE SET value = '6'").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getDb(): DatabaseSync {
  if (!globalForDb.aucbid) globalForDb.aucbid = openDatabase();
  return globalForDb.aucbid;
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
  auction_at: string;
  timezone: string;
  location: string;
  city: string;
  state: string;
  odometer: number | null;
  odometer_unit: "mi" | "km";
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

export function rowToLot(row: LotRow): Lot {
  return {
    id: row.id,
    source: row.source,
    category: row.category,
    lotNumber: row.lot_number,
    stockNumber: row.stock_number,
    vin: row.vin,
    year: row.year,
    make: row.make,
    model: row.model,
    series: row.series,
    auctionAt: row.auction_at,
    timezone: row.timezone,
    location: row.location,
    city: row.city,
    state: row.state,
    odometer: row.odometer,
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
    currentBid: row.current_bid,
    acv: row.acv,
    image: row.image,
    url: row.url,
  };
}

const INSERT = `INSERT OR REPLACE INTO lots (
  id, source, category, lot_number, stock_number, vin, vin_key, year, make, make_key,
  model, model_key, series, auction_at, timezone, location, city, state, odometer,
  odometer_unit, primary_damage, secondary_damage, title_doc, condition, keys, fuel,
  transmission, drive, engine, color, lane, current_bid, acv, image, url, seen_at,
  fuel_key, drive_key
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?
)`;

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
  ];
}

export function saveLots(lots: Lot[], seenAt: number): number {
  const db = getDb();
  const unique = new Map<string, Lot>();
  for (const lot of lots) {
    if (!lot.auctionAt || !lot.make) continue;
    unique.set(lot.id, lot);
  }
  const insert = db.prepare(INSERT);
  db.exec("BEGIN");
  try {
    for (const lot of unique.values()) insert.run(...lotValues(lot, seenAt));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return unique.size;
}

export function pruneSource(source: Source, seenAt: number): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM lots WHERE source = ? AND IFNULL(seen_at, 0) != ?").run(source, seenAt);
  return Number(result.changes ?? 0);
}

export function replaceSource(source: Source, lots: Lot[]): number {
  const db = getDb();
  const unique = new Map<string, Lot>();
  for (const lot of lots) {
    if (lot.source !== source || !lot.auctionAt || !lot.make) continue;
    unique.set(lot.id, lot);
  }
  const seenAt = Date.now();
  const insert = db.prepare(INSERT);
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM lots WHERE source = ?").run(source);
    for (const lot of unique.values()) insert.run(...lotValues(lot, seenAt));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return unique.size;
}

const freshAuction = "datetime('now', '-36 hours')";

const milesExpr = `(CASE WHEN odometer IS NULL THEN NULL WHEN odometer_unit = 'km' THEN odometer * 0.621371 ELSE odometer END)`;

export function buildWhere(filters: Filters): { sql: string; params: Array<string | number> } {
  const clauses = [`auction_at >= ${freshAuction}`];
  const params: Array<string | number> = [];
  const q = filters.q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (q) {
    clauses.push(`(
      lot_number = ? OR stock_number = ?
      OR replace(replace(upper(lot_number), '-', ''), ' ', '') = ?
      OR replace(replace(upper(stock_number), '-', ''), ' ', '') = ?
      OR id = 'iaai-' || ? OR id = 'copart-' || ?
      OR vin_key = ?
      OR (length(?) >= 6 AND length(vin_key) >= 6 AND (vin_key LIKE ? || '%' OR ? LIKE vin_key || '%' OR instr(vin_key, ?) > 0))
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
  if (filters.milesTo != null && filters.milesTo < MILES_MAX) {
    clauses.push(`${milesExpr} <= ?`);
    params.push(filters.milesTo);
  }
  return { sql: clauses.join(" AND "), params };
}

export function searchLots(filters: Filters, pageSize = 24): { items: Lot[]; total: number } {
  const db = getDb();
  const where = buildWhere(filters);
  const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM lots WHERE ${where.sql}`).get(...where.params) as { total: number };
  const page = Math.max(1, filters.page || 1);
  const rows = db
    .prepare(
      `SELECT * FROM lots WHERE ${where.sql} ORDER BY auction_at ASC, make ASC LIMIT ? OFFSET ?`,
    )
    .all(...where.params, pageSize, (page - 1) * pageSize) as unknown as LotRow[];
  return { items: rows.map(rowToLot), total: totalRow?.total ?? 0 };
}

export function getLot(id: string): Lot | null {
  const row = getDb().prepare("SELECT * FROM lots WHERE id = ?").get(id) as LotRow | undefined;
  return row ? rowToLot(row) : null;
}

export function listMakes(filters: Pick<Filters, "category" | "source">): NamedCount[] {
  const clauses = [`auction_at >= ${freshAuction}`];
  const params: string[] = [];
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }
  const rows = getDb()
    .prepare(
      `SELECT make_key AS key, MAX(make) AS name, COUNT(*) AS count
       FROM lots WHERE ${clauses.join(" AND ")}
       GROUP BY make_key
       ORDER BY name COLLATE NOCASE`,
    )
    .all(...params) as unknown as NamedCount[];
  return rows.map((row) => ({ key: row.key, name: row.name, count: Number(row.count) }));
}

export function listModels(filters: Pick<Filters, "category" | "source" | "make">): NamedCount[] {
  if (!filters.make) return [];
  const clauses = [`auction_at >= ${freshAuction}`, "make_key = ?", "model_key != ''"];
  const params: string[] = [filters.make];
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }
  const rows = getDb()
    .prepare(
      `SELECT model_key AS key, MAX(model) AS name, COUNT(*) AS count
       FROM lots WHERE ${clauses.join(" AND ")}
       GROUP BY model_key
       ORDER BY name COLLATE NOCASE`,
    )
    .all(...params) as unknown as NamedCount[];
  return rows.map((row) => ({
    key: row.key,
    name: baseModelName(row.name) || row.name,
    count: Number(row.count),
  }));
}

export function yearBounds(filters: Pick<Filters, "category" | "source">): { min: number; max: number } {
  const clauses = [`auction_at >= ${freshAuction}`, "year BETWEEN 1901 AND 2035"];
  const params: string[] = [];
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }
  const row = getDb()
    .prepare(`SELECT MIN(year) AS min, MAX(year) AS max FROM lots WHERE ${clauses.join(" AND ")}`)
    .get(...params) as { min: number | null; max: number | null };
  const current = new Date().getFullYear();
  return {
    min: row?.min || current - 25,
    max: row?.max || current + 1,
  };
}

export function categoryCounts(): Record<Category, number> {
  const rows = getDb()
    .prepare(
      `SELECT category, COUNT(*) AS count FROM lots WHERE auction_at >= ${freshAuction} GROUP BY category`,
    )
    .all() as unknown as { category: Category; count: number }[];
  const counts: Record<Category, number> = { car: 0, motorcycle: 0, atv: 0 };
  for (const row of rows) counts[row.category] = row.count;
  return counts;
}

export function relatedLots(lot: Lot, limit = 4): Lot[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM lots
       WHERE id != ? AND make_key = ? AND auction_at >= ${freshAuction}
       ORDER BY CASE WHEN model_key = ? THEN 0 ELSE 1 END, auction_at ASC
       LIMIT ?`,
    )
    .all(lot.id, nameKey(lot.make), modelKey(lot.model), limit) as unknown as LotRow[];
  return rows.map(rowToLot);
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
  let milesTo = milesToText !== "" && Number.isFinite(milesToRaw) && milesToRaw >= 0 && milesToRaw < MILES_MAX ? Math.round(milesToRaw) : null;
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
