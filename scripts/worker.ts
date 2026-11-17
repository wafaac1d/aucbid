import { countLots } from "../lib/db";
import { refreshEveryMs } from "../lib/digest";
import { moscowSyncSlot } from "../lib/schedule";
import { runSync } from "../lib/sync";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  let lastRefresh = Date.now();
  let lastSlot = moscowSyncSlot();
  if ((await countLots()) === 0) {
    console.log("Таблица машин пуста. Запускаю полную синхронизацию.");
    await runSync("full");
    lastRefresh = Date.now();
    lastSlot = moscowSyncSlot() ?? lastSlot;
  } else {
    console.log("Фоновая синхронизация запущена. Каталог уже есть, при старте он не обновляется.");
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
        const accepted = await runSync("full");
        if (!accepted) continue;
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
