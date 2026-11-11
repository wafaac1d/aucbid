import { existsSync } from "fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { cleanText, displayName, moneyOrNull, normalizeMake } from "../lib/format";
import type { Category, Lot } from "../lib/types";

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
      sort: ["auction_date_utc asc"],
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
      sort: ["auction_date_utc asc"],
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
    fuel: "",
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
            sort: ["auction_date_utc asc"],
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

export async function pullCopart(pages: number, log: (message: string) => void): Promise<Lot[]> {
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

  const byId = new Map<string, Lot>();
  try {
    for (const query of QUERIES) {
      for (let page = 0; page < pages; page += 1) {
        const result = await search(query.filters, page, 100);
        const lots = result.lots
          .map((lot) => mapLot(lot, query.category))
          .filter((lot): lot is Lot => Boolean(lot));
        log(`Copart ${query.label}: страница ${page + 1}, лотов с датой ${lots.length} из ${result.total}`);
        for (const lot of lots) byId.set(lot.id, lot);
        if (lots.length < 80 || (page + 1) * 100 >= result.total) break;
      }
    }
  } finally {
    await browser?.close();
  }
  return [...byId.values()];
}
