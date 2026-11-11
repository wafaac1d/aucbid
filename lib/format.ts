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

const ZONES: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  AKST: "America/Anchorage",
  AKDT: "America/Anchorage",
  HST: "Pacific/Honolulu",
  AST: "America/Puerto_Rico",
};

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

export function normalizeMake(raw: string): string {
  const display = displayName(raw);
  const key = display.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (key === "YAMA" || key === "YAMAHA") return "Yamaha";
  if (key === "HARLEYDAVIDSON") return "Harley-Davidson";
  if (key === "MERCEDES" || key === "MERCEDESBENZ") return "Mercedes-Benz";
  if (key === "CANAM") return "Can-Am";
  if (key === "ROLLSROYCE") return "Rolls-Royce";
  if (key === "LANDROVER") return "Land Rover";
  if (key === "ALFAROMEO") return "Alfa Romeo";
  if (key === "ASTONMARTIN") return "Aston Martin";
  if (key === "VOLKSWAGEN" || key === "VW") return "Volkswagen";
  if (key === "CHEV" || key === "CHEVROLET") return "Chevrolet";
  return display;
}

export function nameKey(raw: string): string {
  return decodeHtml(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
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

export function formatAuction(iso: string, timezone = ""): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  const abbrev = timezone.toUpperCase();
  const zone = ZONES[abbrev];
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone || "UTC",
  }).format(date);
  return `${formatted} ${zone ? abbrev : "UTC"}`;
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
