import { getMeta, setMeta } from "../lib/db";
import { refreshEveryMs } from "../lib/digest";
import { moscowSyncSlot } from "../lib/schedule";
import { MAX_PAGES, runSync } from "../lib/sync";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  let lastRefresh = Date.now();
  let lastSlot = moscowSyncSlot();
  if ((await getMeta("full_catalog")) !== "1") {
    console.log("Первый сбор: скачиваю все страницы лотов с датой торгов.");
    for (;;) {
      const result = await runSync("full", MAX_PAGES);
      if (result === "complete") {
        await setMeta("full_catalog", "1");
        console.log("Весь каталог сохранён.");
        break;
      }
      const wait = result === "busy" ? 15_000 : 60_000;
      console.log(result === "busy" ? "Полный сбор уже идёт." : "Сбор остановился раньше конца. Повторяю через минуту.");
      await sleep(wait);
    }
    lastRefresh = Date.now();
    lastSlot = moscowSyncSlot() ?? lastSlot;
  } else {
    console.log("Фоновая синхронизация запущена. Полный каталог уже собран, при старте он не перечитывается.");
  }
  let pendingFull: string | null = null;
  const every = refreshEveryMs();
  for (;;) {
    await sleep(15_000);
    try {
      const slot = moscowSyncSlot();
      if (slot && slot !== lastSlot) pendingFull = slot;
      if (pendingFull && pendingFull !== lastSlot) {
        console.log(`Полная синхронизация ${pendingFull} МСК`);
        const result = await runSync("full");
        if (result === "busy") continue;
        lastSlot = pendingFull;
        pendingFull = null;
        lastRefresh = Date.now();
        continue;
      }
      if (Date.now() - lastRefresh >= every) {
        lastRefresh = Date.now();
        console.log("Короткое обновление каталога");
        await runSync("refresh");
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  }
}

void main();
