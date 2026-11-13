import { existsSync } from "fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import type { CatalogProbe } from "../lib/digest";
import { headUnchanged, lotPageDigest } from "../lib/digest";
import { cleanText, displayName, moneyOrNull, normalizeFuel, normalizeMake } from "../lib/format";
import type { Category, Lot } from "../lib/types";
import type { PullResult } from "./iaai";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const CHROME = [
  process.env.CHROME_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].find((candidate) => candidate && existsSync(candidate));

type CopartRaw = {
  ln: number;
  vin: string;
  year: number;
  make: string;
  model: string;
  series: string;
  ad: number;
  tz: string;
  yard: string;
  city: string;
  state: string;
  country: string;
  odo: number;
  odoUom: string;
  damage: string;
  damage2: string;
  title: string;
  condition: string;
  keys: string;
  engine: string;
  transmission: string;
  drive: string;
  fuel: string;
  color: string;
  bid: number;
  acv: number;
  image: string;
};

type CopartPage = { total: number; lots: CopartRaw[] };

const QUERIES: { category: Category; label: string; filters: string[] }[] = [
  { category: "car", label: "автомобили", filters: ["vehicle_type_code:VEHTYPE_V"] },
  { category: "motorcycle", label: "мотоциклы", filters: ['member_vehicle_type:"MOTORCYCLE"'] },
  { category: "atv", label: "ATV", filters: ['member_vehicle_type:"ATV"'] },
];

async function searchInPage(filters: string[], pageIndex: number, size: number): Promise<CopartPage> {
  const response = await fetch("/public/lots/search-results", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
    body: JSON.stringify({
      query: ["*"],
      filter: { MISC: [...filters, "auction_date_utc:[NOW/DAY TO *]"] },
      sort: ["auction_date_utc asc", "lot_number asc"],
      page: pageIndex,
      size,
      watchListOnly: false,
      freeFormSearch: false,
      hideImages: false,
      defaultSort: false,
      specificRowProvided: false,
      displayName: "",
      searchName: "",
      backUrl: "",
      includeTagByField: {},
      rawParams: {},
    }),
  });
  const json = await response.json();
  const content = json?.data?.results?.content || [];
  return {
    total: json?.data?.results?.totalElements ?? 0,
    lots: content.map((lot: Record<string, unknown>) => {
      const dynamic = (lot.dynamicLotDetails || {}) as { currentBid?: number };
      return {
        ln: Number(lot.ln),
        vin: String(lot.fv || ""),
        year: Number(lot.lcy || 0),
        make: String(lot.mkn || ""),
        model: String(lot.lm || ""),
        series: String(lot.lmg || ""),
        ad: Number(lot.ad || 0),
        tz: String(lot.tz || ""),
        yard: String(lot.yn || ""),
        city: String(lot.locCity || ""),
        state: String(lot.locState || ""),
        country: String(lot.locCountry || ""),
        odo: Number(lot.orr || 0),
        odoUom: String(lot.odometerUOM || ""),
        damage: String(lot.dd || ""),
        damage2: String(lot.sdd || ""),
        title: String(lot.tgd || lot.td || ""),
        condition: String(lot.lcd || ""),
        keys: String(lot.hk || ""),
        engine: String(lot.egn || ""),
        transmission: String(lot.tmtp || ""),
        drive: String(lot.drv || ""),
        fuel: String(lot.ft || ""),
        color: String(lot.clr || ""),
        bid: Number(dynamic.currentBid || lot.hb || 0),
        acv: Number(lot.la || 0),
        image: String(lot.tims || ""),
      };
    }),
  };
}

async function directSearch(filters: string[], pageIndex: number, size: number): Promise<CopartPage> {
  const response = await fetch("https://www.copart.com/public/lots/search-results", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://www.copart.com",
      Referer: "https://www.copart.com/lotSearchResults/",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({
      query: ["*"],
      filter: { MISC: [...filters, "auction_date_utc:[NOW/DAY TO *]"] },
      sort: ["auction_date_utc asc", "lot_number asc"],
      page: pageIndex,
      size,
      watchListOnly: false,
      freeFormSearch: false,
      hideImages: false,
      defaultSort: false,
      specificRowProvided: false,
      displayName: "",
      searchName: "",
      backUrl: "",
      includeTagByField: {},
      rawParams: {},
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!text.trim().startsWith("{")) throw new Error("Copart закрыл прямой запрос");
  const json = JSON.parse(text) as { returnCode?: number; data?: { results?: { totalElements?: number; content?: Record<string, unknown>[] } } };
  if (json.returnCode !== 1) throw new Error("Copart не вернул лоты");
  const content = json.data?.results?.content || [];
  return {
    total: json.data?.results?.totalElements ?? 0,
    lots: content.map((lot) => {
      const dynamic = (lot.dynamicLotDetails || {}) as { currentBid?: number };
      return {
        ln: Number(lot.ln),
        vin: String(lot.fv || ""),
        year: Number(lot.lcy || 0),
        make: String(lot.mkn || ""),
        model: String(lot.lm || ""),
        series: String(lot.lmg || ""),
        ad: Number(lot.ad || 0),
        tz: String(lot.tz || ""),
        yard: String(lot.yn || ""),
        city: String(lot.locCity || ""),
        state: String(lot.locState || ""),
        country: String(lot.locCountry || ""),
        odo: Number(lot.orr || 0),
        odoUom: String(lot.odometerUOM || ""),
        damage: String(lot.dd || ""),
        damage2: String(lot.sdd || ""),
        title: String(lot.tgd || lot.td || ""),
        condition: String(lot.lcd || ""),
        keys: String(lot.hk || ""),
        engine: String(lot.egn || ""),
        transmission: String(lot.tmtp || ""),
        drive: String(lot.drv || ""),
        fuel: String(lot.ft || ""),
        color: String(lot.clr || ""),
        bid: Number(dynamic.currentBid || lot.hb || 0),
        acv: Number(lot.la || 0),
        image: String(lot.tims || ""),
      };
    }),
  };
}

function mapLot(raw: CopartRaw, category: Category): Lot | null {
  if (!raw.ln || !raw.ad || !raw.make) return null;
  const auctionAt = new Date(raw.ad).toISOString();
  if (Number.isNaN(new Date(auctionAt).getTime())) return null;
  if (raw.ad < Date.now() - 36 * 60 * 60 * 1000) return null;
  const make = normalizeMake(raw.make);
  if (!make) return null;
  const unit = /^(k|km)$/i.test(raw.odoUom) ? "km" : "mi";
  const city = displayName(raw.city);
  const state = raw.state.trim().toUpperCase();
  return {
    id: `copart-${raw.ln}`,
    source: "copart",
    category,
    lotNumber: String(raw.ln),
    stockNumber: String(raw.ln),
    vin: cleanText(raw.vin),
    year: raw.year >= 1900 && raw.year <= 2035 ? raw.year : 0,
    make,
    model: displayName(raw.model),
    series: displayName(raw.series),
    auctionAt,
    timezone: raw.tz.trim().toUpperCase(),
    location: [raw.yard, city, state].filter(Boolean).join(", "),
    city,
    state,
    odometer: raw.odo > 0 ? Math.round(raw.odo) : null,
    odometerUnit: unit,
    primaryDamage: cleanText(raw.damage),
    secondaryDamage: cleanText(raw.damage2),
    titleDoc: cleanText(raw.title),
    condition: cleanText(raw.condition),
    keys: cleanText(raw.keys),
    fuel: normalizeFuel(raw.fuel),
    transmission: cleanText(raw.transmission),
    drive: cleanText(raw.drive),
    engine: cleanText(raw.engine),
    color: cleanText(raw.color),
    lane: "",
    currentBid: moneyOrNull(raw.bid),
    acv: moneyOrNull(raw.acv),
    image: raw.image.replace("_thb.", "_ful."),
    url: `https://www.copart.com/lot/${raw.ln}`,
  };
}

async function openBrowser(): Promise<{ page: Page; browser: Browser }> {
  if (!CHROME) throw new Error("Google Chrome не найден, прямой доступ к Copart закрыт");
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto("https://www.copart.com/lotSearchResults/", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const ready = await page.evaluate(async () => {
      try {
        const response = await fetch("/public/lots/search-results", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "include",
          body: JSON.stringify({
            query: ["*"],
            filter: { MISC: ['member_vehicle_type:"ATV"', "auction_date_utc:[NOW/DAY TO *]"] },
            sort: ["auction_date_utc asc", "lot_number asc"],
            page: 0,
            size: 1,
            watchListOnly: false,
            freeFormSearch: false,
            hideImages: false,
            defaultSort: false,
            specificRowProvided: false,
            displayName: "",
            searchName: "",
            backUrl: "",
            includeTagByField: {},
            rawParams: {},
          }),
        });
        const json = await response.json();
        return json?.returnCode === 1;
      } catch {
        return false;
      }
    });
    if (ready) return { page, browser };
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  await browser.close();
  throw new Error("Copart не открыл публичный поиск");
}

export async function pullCopart(
  pages: number,
  log: (message: string) => void,
  onPage: (lots: Lot[]) => number,
  probe?: CatalogProbe,
): Promise<PullResult> {
  let search: (filters: string[], page: number, size: number) => Promise<CopartPage> = directSearch;
  let browser: Browser | null = null;
  try {
    await directSearch(QUERIES[2].filters, 0, 1);
    log("Copart: прямой поиск доступен");
  } catch {
    log("Copart: открываю Chrome, прямой запрос закрыт защитой сайта");
    const opened = await openBrowser();
    browser = opened.browser;
    const page = opened.page;
    search = (filters, pageIndex, size) => page.evaluate(searchInPage, filters, pageIndex, size);
  }

  let complete = true;
  let saved = 0;
  const refresh = probe?.mode === "refresh";
  const pageLimit = refresh ? probe.headPages : pages;

  async function loadPage(filters: string[], page: number, label: string): Promise<CopartPage | null> {
    try {
      return await search(filters, page, 100);
    } catch {
      try {
        await sleep(1500);
        return await search(filters, page, 100);
      } catch (retryError) {
        log(`Copart ${label}, страница ${page + 1}: ${retryError instanceof Error ? retryError.message : retryError}`);
        return null;
      }
    }
  }

  try {
    for (const query of QUERIES) {
      const key = `copart:${query.label}`;
      const stored = probe?.read(key) ?? null;
      let finished = false;
      let coveredUntil = -1;
      let headDigest = "";
      let total = 0;
      for (let page = 0; page < pageLimit; page += 1) {
        const result = await loadPage(query.filters, page, query.label);
        if (!result) {
          complete = false;
          finished = true;
          break;
        }
        const lots = result.lots.map((lot) => mapLot(lot, query.category)).filter((lot): lot is Lot => Boolean(lot));
        if (page === 0) {
          headDigest = lotPageDigest(lots);
          total = result.total;
          if (refresh && headUnchanged(headDigest, total, stored)) {
            log(`Copart ${query.label}: хеш совпал, середину каталога не запрашиваю`);
            coveredUntil = 0;
            finished = true;
            break;
          }
        }
        saved += onPage(lots);
        log(`Copart ${query.label}: страница ${page + 1}, лотов с датой ${lots.length} из ${result.total}`);
        coveredUntil = page;
        if (result.lots.length < 100 || (page + 1) * 100 >= result.total) {
          finished = true;
          break;
        }
        await sleep(refresh ? 700 : 120);
      }
      const tailIndex = total > 0 ? Math.ceil(total / 100) - 1 : -1;
      let lastPage = probe?.mode === "full" && finished ? Math.max(coveredUntil, 0) : tailIndex;
      if (refresh && tailIndex > coveredUntil) {
        const tail = await loadPage(query.filters, tailIndex, query.label);
        if (tail) {
          const tailLots = tail.lots.map((lot) => mapLot(lot, query.category)).filter((lot): lot is Lot => Boolean(lot));
          saved += onPage(tailLots);
          log(`Copart ${query.label}: хвост, страница ${tailIndex + 1}, лотов с датой ${tailLots.length}`);
          await sleep(700);
          if (tail.lots.length >= 100) {
            const extra = await loadPage(query.filters, tailIndex + 1, query.label);
            if (extra && extra.lots.length > 0) {
              const extraLots = extra.lots.map((lot) => mapLot(lot, query.category)).filter((lot): lot is Lot => Boolean(lot));
              saved += onPage(extraLots);
              lastPage = tailIndex + 1;
              log(`Copart ${query.label}: новая последняя страница ${tailIndex + 2}`);
            }
          }
        }
      }
      if (probe && headDigest && lastPage >= 0) probe.write(key, { head: headDigest, total, lastPage });
      else if (probe && headDigest) probe.write(key, { head: headDigest, total });
      if (!finished) {
        complete = false;
        log(`Copart ${query.label}: достигнут предел страниц, выборка неполная`);
      }
      if (!complete && !refresh) break;
    }
  } finally {
    await browser?.close();
  }
  return { complete: !refresh && complete, saved };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type CopartImage = { fullUrl?: string; imageSeqNumber?: number; imageTypeEnum?: string; imageTypeCode?: string };

function imageUrls(payload: unknown): string[] {
  const data = payload as { data?: { imagesList?: { content?: CopartImage[] } } };
  const content = data.data?.imagesList?.content || [];
  return content
    .filter((item) => item.fullUrl && (item.imageTypeEnum === "IMAGE" || item.imageTypeCode === "IMG"))
    .sort((left, right) => (left.imageSeqNumber || 0) - (right.imageSeqNumber || 0))
    .map((item) => String(item.fullUrl));
}

async function directGallery(lotNumber: string): Promise<string[]> {
  try {
    const response = await fetch(`https://www.copart.com/public/data/lotdetails/solr/lotImages/${lotNumber}`, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Origin: "https://www.copart.com",
        Referer: `https://www.copart.com/lot/${lotNumber}`,
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: AbortSignal.timeout(12_000),
    });
    const text = await response.text();
    if (!text.trim().startsWith("{")) return [];
    return imageUrls(JSON.parse(text));
  } catch {
    return [];
  }
}

let gallerySession: Promise<{ page: Page; browser: Browser }> | null = null;

async function galleryPage(): Promise<Page> {
  if (!gallerySession) {
    gallerySession = openBrowser().catch((error) => {
      gallerySession = null;
      throw error;
    });
  }
  return (await gallerySession).page;
}

export async function copartGallery(lotNumber: string): Promise<string[]> {
  const direct = await directGallery(lotNumber);
  if (direct.length > 0) return [...new Set(direct)];
  const page = await galleryPage();
  const text = await page.evaluate(async (lot) => {
    const response = await fetch(`/public/data/lotdetails/solr/lotImages/${lot}`, {
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      credentials: "include",
    });
    return response.text();
  }, lotNumber);
  if (!text.trim().startsWith("{")) return [];
  return [...new Set(imageUrls(JSON.parse(text)))];
}
