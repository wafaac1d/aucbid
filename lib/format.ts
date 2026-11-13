const ACRONYMS = new Set([
  "BMW",
  "GMC",
  "RAM",
  "KIA",
  "MG",
  "VW",
  "MINI",
  "BYD",
  "ATV",
  "UTV",
  "AMG",
]);

const PHRASES: Record<string, string> = {
  "FRONT END": "Передняя часть",
  "REAR END": "Задняя часть",
  REAR: "Задняя часть",
  "RIGHT FRONT": "Передняя правая",
  "LEFT FRONT": "Передняя левая",
  "RIGHT REAR": "Задняя правая",
  "LEFT REAR": "Задняя левая",
  "FRONT & REAR": "Перед и зад",
  "LEFT SIDE": "Левый бок",
  "RIGHT SIDE": "Правый бок",
  SIDE: "Бок",
  UNDERCARRIAGE: "Днище",
  "ALL OVER": "По кругу",
  ROLLOVER: "Переворот",
  MECHANICAL: "Механика",
  "NORMAL WEAR": "Естественный износ",
  "NORMAL WEAR & TEAR": "Естественный износ",
  "MINOR DENT/SCRATCHES": "Мелкие царапины",
  "MINOR DENTS/SCRATCHES": "Мелкие царапины",
  "WATER/FLOOD": "Затопление",
  FLOOD: "Затопление",
  HAIL: "Град",
  VANDALISM: "Вандализм",
  "BURN": "Пожар",
  "BURN - ENGINE": "Пожар двигателя",
  "FRAME DAMAGE": "Повреждение рамы",
  "BIOHAZARD/CHEMICAL": "Биоопасность",
  "STRIPPED": "Разобран",
  "PARTIAL REPAIR": "Частичный ремонт",
  "RUNS AND DRIVES": "На ходу",
  "RUN & DRIVE": "На ходу",
  "RUN AND DRIVE": "На ходу",
  STARTS: "Заводится",
  STATIONARY: "Не на ходу",
  "ENHANCED VEHICLES": "Проверенный лот",
  "KEY AVAILABLE": "Ключ есть",
  "KEY MISSING": "Ключа нет",
  "NO KEY": "Ключа нет",
  YES: "Да",
  NO: "Нет",
  UNKNOWN: "",
  "N/A": "",
  NONE: "",
  GASOLINE: "Бензин",
  DIESEL: "Дизель",
  ELECTRIC: "Электро",
  HYBRID: "Гибрид",
  FLEXIBLE: "Гибкое топливо",
  AUTOMATIC: "Автомат",
  MANUAL: "Механика",
  "FRONT-WHEEL DRIVE": "Передний привод",
  "FRONT WHEEL DRIVE": "Передний привод",
  "REAR-WHEEL DRIVE": "Задний привод",
  "REAR WHEEL DRIVE": "Задний привод",
  "ALL-WHEEL DRIVE": "Полный привод",
  "ALL WHEEL DRIVE": "Полный привод",
  "FOUR-WHEEL DRIVE": "Полный привод",
  "FOUR WHEEL DRIVE": "Полный привод",
  "4X4": "Полный привод",
  "SALVAGE TITLE": "Salvage",
  "CLEAN TITLE": "Чистый титул",
  "NON-REPAIRABLE": "Не подлежит ремонту",
  CLEAR: "Чистый титул",
  SALVAGE: "Salvage",
};

export function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCharCode(Number(num)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayName(raw: string): string {
  const cleaned = decodeHtml(raw).replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(/(\s+|-|\/)/)
    .map((part) => {
      if (/^(\s+|-|\/)$/.test(part)) return part;
      const upper = part.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      if (/\d/.test(part) && part.length <= 6) return upper;
      if (part.length <= 3 && part === upper) return upper;
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

const MAKE_ALIAS: Record<string, string> = {
  YAMA: "Yamaha",
  YAMAHA: "Yamaha",
  YAMYAMA: "Yamaha",
  HARLEYDAVIDSON: "Harley-Davidson",
  MERCEDES: "Mercedes-Benz",
  MERCEDESBENZ: "Mercedes-Benz",
  CANA: "Can-Am",
  CANAM: "Can-Am",
  ROLLSROYCE: "Rolls-Royce",
  LANDROVER: "Land Rover",
  ALFAROMEO: "Alfa Romeo",
  ASTONMARTIN: "Aston Martin",
  VOLKSWAGEN: "Volkswagen",
  VW: "Volkswagen",
  CHEV: "Chevrolet",
  CHEVROLET: "Chevrolet",
  HOND: "Honda",
  HONDA: "Honda",
  TOYT: "Toyota",
  TOYOTA: "Toyota",
  LEXS: "Lexus",
  LEXUS: "Lexus",
  POLA: "Polaris",
  POLARIS: "Polaris",
  CFMO: "CFMoto",
  CFMOTO: "CFMoto",
  JOHNDEERE: "John Deere",
  ARTICCAT: "Arctic Cat",
  INDIAN: "Indian",
  TRIUMPH: "Triumph",
  ROYALENFIELD: "Royal Enfield",
  FISKER: "Fisker",
  LUCID: "Lucid",
  OTHER: "Other",
  STINGRAY: "Stingray",
};

const MAKE_TAILS = ["MOTORCYCLECO", "MOTORCYCLES", "MOTORCYCLE", "AUTOMOBILE", "MOTORS", "BOATS", "CORP", "LLC", "INC", "CO"];

function stripMakeSuffix(key: string): string {
  for (const tail of MAKE_TAILS) {
    if (key.endsWith(tail) && key.length - tail.length >= 4) return key.slice(0, -tail.length);
  }
  return key;
}

export function normalizeMake(raw: string): string {
  const display = displayName(raw);
  const original = display.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const key = stripMakeSuffix(original);
  return MAKE_ALIAS[key] || MAKE_ALIAS[original] || (key === original ? display : displayName(key));
}

const MAKE_FOLD_BLOCK = new Set(["OTHER", "OTHE", "ATV", "BMW", "GMC", "KIA", "MINI", "RAM", "SAAB", "FIAT", "JEEP", "FORD", "AUDI"]);

export function foldMakeKeys(keys: string[]): Map<string, string> {
  const unique = [...new Set(keys)].sort((left, right) => right.length - left.length);
  const fold = new Map(unique.map((key) => [key, key]));
  for (const key of unique) {
    if (key.length < 4 || MAKE_FOLD_BLOCK.has(key)) continue;
    const longer = unique.filter((other) => other !== key && other.startsWith(key) && other.length - key.length <= 8);
    if (longer.length === 1) fold.set(key, fold.get(longer[0]) || longer[0]);
  }
  return fold;
}

const TRIM_WORDS = new Set([
  "LT", "LTZ", "LS", "RS", "PREMIER", "XLT", "LARIAT", "LIMITED", "SE", "SEL", "LE", "XLE",
  "SR", "SV", "SL", "EX", "EXL", "TOURING", "BASE", "SR5", "TRD", "PLATINUM", "DENALI",
  "AT4", "SLE", "SLT", "ELEVATION", "CUSTOM", "RST", "SS", "Z71", "SXT", "LUXURY",
  "PREMIUM", "ULTIMATE", "PREFERRED", "ACTIV", "ESSENCE", "CONVENIENCE", "LARAMIE",
  "1LT", "2LT", "3LT", "1LS", "2LS", "1RS", "2RS", "LT1", "LT2", "LTD",
  "2D", "4D", "2DR", "4DR", "5DR", "2DOOR", "4DOOR", "5DOOR", "5DOOR",
  "SEDAN", "COUPE", "CONVERTIBLE", "CONV", "WAGON", "HATCHBACK", "HATCH",
  "CAB", "PASSENGER", "KOUP", "SPORTWAGEN", "HERITAGE", "CLASSIC", "HD", "LD",
  "UNLIMITED", "HYBRID", "PHEV", "PRIME", "PLUGIN", "HV", "AUTOMATIC", "SELECT",
  "CLASS", "PREMIU", "PREM", "PKG", "PACKAGE", "DOOR",
  "1500", "2500", "3500", "4500", "5500",
]);

const TRIM_PAIRS = [
  ["HIGH", "COUNTRY"],
  ["KING", "RANCH"],
  ["SUPER", "CAB"],
  ["DOUBLE", "CAB"],
  ["CREW", "CAB"],
  ["QUAD", "CAB"],
  ["EXTENDED", "CAB"],
  ["KING", "CAB"],
  ["ACCESS", "CAB"],
  ["REGULAR", "CAB"],
  ["MEDIUM", "DUTY"],
  ["F", "SPORT"],
];

const TRIM_LETTERS = new Set(["S", "L", "X", "I", "D", "E", "H"]);

const PROTECTED_MODELS = new Set(["MARK LT", "AMP 4X4"]);

function modelTokens(raw: string): string[] {
  const tokens: string[] = [];
  for (const part of displayName(raw).split(/\s+/).filter(Boolean)) {
    const split = part.match(/^([A-Za-z]{3,})-(\d{3,4}|class|cab|door)$/i);
    if (split) tokens.push(split[1], split[2]);
    else tokens.push(part);
  }
  return tokens.map((token) => {
    const key = token.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const series = key.match(/^(\d{3})(I|D|E|H|XI|LI|CI|XE|X|T|H)$/);
    return series ? series[1] : token;
  });
}

export function baseModelName(raw: string): string {
  const cleaned = displayName(raw);
  if (!cleaned) return "";
  if (PROTECTED_MODELS.has(cleaned.toUpperCase())) return cleaned;
  const tokens = modelTokens(raw);
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1].toUpperCase().replace(/[^A-Z0-9]/g, "");
    const prev = tokens[tokens.length - 2].toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (TRIM_PAIRS.some(([left, right]) => prev === left && last === right)) {
      tokens.splice(-2, 2);
      continue;
    }
    const duty = /^(G?\d{4})$/.test(last) || (/^[A-Z]{2,}$/.test(prev) && /^\d{3}$/.test(last));
    const engine = /^\d+\.\d+[A-Z]{0,2}$/.test(last) || /^\d+[A-Z]{1,2}$/.test(last);
    const junk = /[^A-Z0-9]/.test(tokens[tokens.length - 1]) && /\d/.test(last);
    if (TRIM_WORDS.has(last) || TRIM_LETTERS.has(last) || duty || junk || engine || /^(AWD|FWD|RWD|4WD|2WD|4X4|4X2)$/.test(last)) {
      tokens.pop();
      continue;
    }
    break;
  }
  return tokens.join(" ");
}

export function nameKey(raw: string): string {
  return decodeHtml(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function modelKey(raw: string): string {
  return nameKey(baseModelName(raw));
}

export function fuelKey(raw: string): "" | "gas" | "diesel" | "hybrid" | "electric" {
  const text = decodeHtml(raw).toUpperCase();
  if (!text) return "";
  if (/HYBRID/.test(text)) return "hybrid";
  if (/ELECTRIC|\bEV\b|\bBEV\b/.test(text)) return "electric";
  if (/DIESEL/.test(text)) return "diesel";
  if (/GAS|PETROL|FLEX|UNLEADED/.test(text)) return "gas";
  return "";
}

export function driveKey(raw: string): "" | "awd" | "fwd" | "rwd" {
  const text = decodeHtml(raw).toUpperCase();
  if (!text) return "";
  if (/ALL[ -]?WHEEL|AWD|FOUR[ -]?WHEEL|4WD|4X4|FOUR BY FOUR|QUATTRO/.test(text)) return "awd";
  if (/FRONT/.test(text)) return "fwd";
  if (/REAR/.test(text)) return "rwd";
  return "";
}

export const MILES_MAX = 500_000;

export function normalizeFuel(raw: string): string {
  const key = fuelKey(raw);
  if (key === "gas") return "Gasoline";
  if (key === "diesel") return "Diesel";
  if (key === "hybrid") return "Hybrid";
  if (key === "electric") return "Electric";
  return cleanText(raw);
}

export function fuelName(key: string): string {
  if (key === "gas") return "Бензин";
  if (key === "diesel") return "Дизель";
  if (key === "hybrid") return "Гибрид";
  if (key === "electric") return "Электро";
  return "";
}

export function driveName(key: string): string {
  if (key === "awd") return "Полный привод";
  if (key === "rwd") return "Задний привод";
  if (key === "fwd") return "Передний привод";
  return "";
}

export function vinKey(vin: string): string {
  return vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function cleanText(value: string): string {
  const text = decodeHtml(value);
  if (!text || /^(unknown|n\/a|none|not available|null|-)$/i.test(text)) return "";
  return text;
}

export function translate(value: string): string {
  const text = cleanText(value);
  if (!text) return "";
  return PHRASES[text.toUpperCase()] ?? text;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatMoney(value: number | null): string {
  if (value == null) return "—";
  return `$${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatOdometer(value: number | null, unit: string): string {
  if (!value) return "—";
  return `${formatNumber(value)} ${unit === "km" ? "км" : "миль"}`;
}

export function formatOdometerDetail(value: number | null, unit: string): string {
  if (!value) return "";
  const miles = unit === "km" ? Math.round(value * 0.621371) : Math.round(value);
  const km = unit === "km" ? Math.round(value) : Math.round(value * 1.60934);
  return `${formatNumber(miles)} миль (${formatNumber(km)} км)`;
}

const MINSK = "Europe/Minsk";

export function formatAuction(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MINSK,
  }).format(date);
  return `${formatted}, Минск`;
}

export function formatRemaining(iso: string, now = Date.now()): string {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return "";
  const diff = start - now;
  if (diff <= 0) return "Торги уже начались";
  const minutesTotal = Math.floor(diff / 60_000);
  const days = Math.floor(minutesTotal / (60 * 24));
  const hours = Math.floor((minutesTotal % (60 * 24)) / 60);
  const minutes = minutesTotal % 60;
  if (days > 0) return `через ${days} д ${hours} ч`;
  if (hours > 0) return `через ${hours} ч ${minutes} мин`;
  return `через ${Math.max(minutes, 1)} мин`;
}

export function moneyOrNull(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0 || value > 2_000_000) return null;
  return Math.round(value);
}

export function categoryLabel(category: string): string {
  if (category === "car") return "Автомобиль";
  if (category === "motorcycle") return "Мотоцикл";
  if (category === "atv") return "ATV";
  return category;
}

export function sourceLabel(source: string): string {
  if (source === "iaai") return "IAAI";
  if (source === "copart") return "Copart";
  return source;
}
