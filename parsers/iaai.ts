import { cleanText, decodeHtml, displayName, moneyOrNull, normalizeMake } from "../lib/format";
import type { Category, Lot } from "../lib/types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type IaaiFacet = { Group: string; Value: string };

const SALE_DATE: IaaiFacet = { Group: "Availability", Value: "Items With a Sale Date" };

export const IAAI_QUERIES: { category: Category; label: string; facets: IaaiFacet[] }[] = [
  { category: "car", label: "легковые", facets: [{ Group: "InventoryTypes", Value: "Automobiles" }, SALE_DATE] },
  { category: "car", label: "SUV", facets: [{ Group: "InventoryTypes", Value: "SUVs" }, SALE_DATE] },
  { category: "car", label: "пикапы", facets: [{ Group: "InventoryTypes", Value: "Pick-up Trucks" }, SALE_DATE] },
  { category: "car", label: "вэны", facets: [{ Group: "InventoryTypes", Value: "Vans" }, SALE_DATE] },
  { category: "motorcycle", label: "мотоциклы", facets: [{ Group: "InventoryTypes", Value: "Motorcycles" }, SALE_DATE] },
  { category: "atv", label: "ATV", facets: [{ Group: "InventorySubType", Value: "ATV" }, SALE_DATE] },
  { category: "atv", label: "side-by-side", facets: [{ Group: "InventorySubType", Value: "Side By Side" }, SALE_DATE] },
];

export async function fetchIaaiPage(facets: IaaiFacet[], page: number, pageSize = 100): Promise<string> {
  const response = await fetch("https://www.iaai.com/Search", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Content-Type": "application/json",
      Origin: "https://www.iaai.com",
      Referer: "https://www.iaai.com/Search",
    },
    body: JSON.stringify({
      Searches: [{ Facets: facets, FullSearch: null }],
      ZipCode: "",
      miles: 0,
      PageSize: pageSize,
      CurrentPage: page,
      Sort: [{ IsGeoSort: false, SortField: "AuctionDateTime", IsDescending: false }],
      ShowRecommendations: false,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`IAAI ответил ${response.status}`);
  return response.text();
}

function field(chunk: string, label: string): string {
  const match = chunk.match(new RegExp(`title="${label}\\s*:\\s*([^"]*)"`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function parseAuction(raw: string): string | null {
  const value = decodeHtml(raw);
  const match = value.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\s*([+-]\d{2}:\d{2})/i,
  );
  if (!match) return null;
  let hour = Number(match[4]);
  const ampm = match[7].toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const iso = `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}T${String(hour).padStart(2, "0")}:${match[5]}:${match[6]}${match[8]}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseMoney(raw: string): number | null {
  const digits = raw.replace(/[^0-9.]/g, "");
  return moneyOrNull(Number(digits));
}

function parseOdometer(raw: string): { value: number | null; unit: "mi" | "km" } {
  const unit = /km/i.test(raw) ? "km" : "mi";
  const value = Number(raw.replace(/[^0-9]/g, ""));
  return { value: value > 0 ? value : null, unit };
}

export function parseIaaiHtml(html: string, category: Category): Lot[] {
  const lots: Lot[] = [];
  const cutoff = Date.now() - 36 * 60 * 60 * 1000;
  for (const chunk of html.split('id="btnShowWatch').slice(1)) {
    const slice = chunk.slice(0, 24_000);
    const modal = slice.match(
      /ImageModalClicked\(\s*'([^']*)'\s*,\s*'(\d+)~US'\s*,\s*'([^']*)'\s*,\s*'[^']*'\s*,\s*'(\d{4})'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/,
    );
    const when = slice.match(/AddDelWatch\(\s*this,\s*'(\d+)~US',\s*'[^']*',\s*'([^']*)'/);
    if (!modal || !when) continue;
    const auctionAt = parseAuction(when[2]);
    if (!auctionAt || new Date(auctionAt).getTime() < cutoff) continue;

    const salvageId = modal[2];
    const stock = cleanText(modal[1]) || field(slice, "Stock #");
    const make = normalizeMake(modal[5]);
    const model = displayName(modal[6]);
    if (!make) continue;

    const place = decodeHtml(slice.match(/aria-label="Branch Name">([^<]+)</)?.[1] || "") || field(slice, "Branch");
    const stateMatch = place.match(/\(([^)]+)\)\s*$/);
    const action = decodeHtml(slice.match(/data-list__value--action">([^<]+)</)?.[1] || "");
    const timezone = action.match(/\b([A-Z]{2,4})\s*$/)?.[1] || "";
    const odometer = parseOdometer(field(slice, "Odometer"));
    const engine = cleanText(field(slice, "Engine"));
    const image = decodeHtml(slice.match(/data-src="(https:\/\/vis\.iaai\.com[^"]+)"/)?.[1] || "")
      .replace(/width=\d+/, "width=845")
      .replace(/height=\d+/, "height=633");
    const year = Number(modal[4]);
    const badge = decodeHtml(slice.match(/class="badge[^"]*">([^<]+)</)?.[1] || "");

    lots.push({
      id: `iaai-${salvageId}`,
      source: "iaai",
      category,
      lotNumber: stock || salvageId,
      stockNumber: stock,
      vin: cleanText(modal[3]),
      year: year >= 1900 && year <= 2035 ? year : 0,
      make,
      model,
      series: displayName(modal[7]),
      auctionAt,
      timezone,
      location: place,
      city: stateMatch ? place.replace(/\s*\([^)]+\)\s*$/, "") : place,
      state: stateMatch?.[1] || "",
      odometer: odometer.value,
      odometerUnit: odometer.unit,
      primaryDamage: cleanText(field(slice, "Primary Damage")),
      secondaryDamage: cleanText(field(slice, "Secondary Damage")),
      titleDoc: cleanText(field(slice, "Title/Sale Doc")),
      condition: cleanText(badge),
      keys: cleanText(field(slice, "Key")),
      fuel: cleanText(field(slice, "Fuel Type")),
      transmission: cleanText(field(slice, "Transmission")),
      drive: cleanText(field(slice, "Driveline Type")),
      engine: /^\d{1,2}$/.test(engine) ? "" : engine,
      color: cleanText(field(slice, "Exterior Color")),
      lane: cleanText(field(slice, "Lane/Run#")),
      currentBid: null,
      acv: parseMoney(field(slice, "ACV")),
      image,
      url: `https://www.iaai.com/VehicleDetail/${salvageId}~US`,
    });
  }
  return lots;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pullIaai(pages: number, log: (message: string) => void): Promise<Lot[]> {
  const byId = new Map<string, Lot>();
  for (const query of IAAI_QUERIES) {
    for (let page = 1; page <= pages; page += 1) {
      let html = "";
      try {
        html = await fetchIaaiPage(query.facets, page);
      } catch (error) {
        log(`IAAI ${query.label}, страница ${page}: ${error instanceof Error ? error.message : error}`);
        break;
      }
      const lots = parseIaaiHtml(html, query.category);
      log(`IAAI ${query.label}: страница ${page}, лотов с датой ${lots.length}`);
      for (const lot of lots) byId.set(lot.id, lot);
      if (lots.length < 80) break;
      await sleep(350);
    }
  }
  return [...byId.values()];
}
