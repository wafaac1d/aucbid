const SLOTS = new Set(["16:00", "23:00"]);

const globalForSchedule = globalThis as unknown as { aucbidSchedule?: boolean };

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

export function startSyncSchedule(): void {
  if (globalForSchedule.aucbidSchedule) return;
  globalForSchedule.aucbidSchedule = true;

  void import("./sync").then(({ requestSync }) => {
    console.log("Синхронизация при запуске");
    const result = requestSync({ ignoreCooldown: true });
    if (!result.accepted) console.log("Синхронизация при запуске пропущена: уже выполняется");
  });

  let lastSlot: string | null = null;
  const tick = () => {
    const slot = moscowSyncSlot();
    if (!slot || slot === lastSlot) return;
    lastSlot = slot;
    void import("./sync").then(({ requestSync }) => {
      console.log(`Плановая синхронизация ${slot} МСК`);
      const result = requestSync();
      if (!result.accepted) console.log("Плановая синхронизация пропущена: уже выполняется или недавно запускалась");
    });
  };

  tick();
  const timer = setInterval(tick, 15_000);
  if (typeof timer === "object" && timer !== null && "unref" in timer) timer.unref();
}
