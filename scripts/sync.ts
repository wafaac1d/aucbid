import { replaceSource } from "../lib/db";
import { pullCopart } from "../parsers/copart";
import { pullIaai } from "../parsers/iaai";

function pageLimit(): number {
  const fromArg = process.argv.find((arg) => arg.startsWith("--pages="));
  const raw = fromArg ? fromArg.split("=")[1] : process.env.SYNC_PAGES;
  const pages = Number(raw || 3);
  if (!Number.isFinite(pages) || pages < 1) return 1;
  return Math.min(30, Math.floor(pages));
}

async function main(): Promise<void> {
  const pages = pageLimit();
  const log = (message: string) => console.log(message);
  log(`Синхронизация: до ${pages} стр. на каждый запрос, только лоты с датой торгов`);

  const iaai = await pullIaai(pages, log);
  const iaaiSaved = replaceSource("iaai", iaai);
  log(`IAAI сохранено: ${iaaiSaved}`);

  try {
    const copart = await pullCopart(pages, log);
    const copartSaved = replaceSource("copart", copart);
    log(`Copart сохранено: ${copartSaved}`);
  } catch (error) {
    log(`Copart пропущен: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
