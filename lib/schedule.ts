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

  void import("./sync").then(({ needsFullSync, refreshEveryMs, requestSync }) => {
    const full = needsFullSync();
    console.log(full ? "Полная синхронизация при запуске" : "Короткое обновление при запуске");
    const result = requestSync({ mode: full ? "full" : "refresh", ignoreCooldown: true });
    if (!result.accepted) console.log("Синхронизация при запуске пропущена: уже выполняется");

    const refresh = setInterval(() => {
      const next = requestSync({ mode: "refresh" });
      if (next.accepted) console.log("Короткое обновление каталога");
    }, refreshEveryMs());
    if (typeof refresh === "object" && refresh !== null && "unref" in refresh) refresh.unref();
  });

  let lastSlot: string | null = null;
  const tick = () => {
    const slot = moscowSyncSlot();
    if (!slot || slot === lastSlot) return;
    void import("./sync").then(({ requestSync }) => {
      console.log(`Полная синхронизация ${slot} МСК`);
      const result = requestSync({ mode: "full", ignoreCooldown: true });
      if (result.accepted) lastSlot = slot;
      else console.log("Полная синхронизация пропущена: уже выполняется");
    });
  };

  tick();
  const timer = setInterval(tick, 15_000);
  if (typeof timer === "object" && timer !== null && "unref" in timer) timer.unref();
}
