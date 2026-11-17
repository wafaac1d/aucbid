const SLOTS = new Set(["16:00", "23:00"]);

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

export function moscowSyncSlot(now = new Date()): string | null {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const stamp = `${part(parts, "hour").padStart(2, "0")}:${part(parts, "minute").padStart(2, "0")}`;
  if (!SLOTS.has(stamp)) return null;
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")} ${stamp}`;
}
