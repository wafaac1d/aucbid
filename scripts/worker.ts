import { refreshEveryMs } from "../lib/digest";
import { moscowSyncSlot } from "../lib/schedule";
import { runSync } from "../lib/sync";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log("Фоновая синхронизация запущена. При старте каталог не обновляется.");
  let lastRefresh = Date.now();
  let lastSlot = moscowSyncSlot();
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
