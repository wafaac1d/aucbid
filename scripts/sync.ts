import { clampPages, runCliSync } from "../lib/sync";

const fromArg = process.argv.find((arg) => arg.startsWith("--pages="));
const pages = clampPages(fromArg ? fromArg.split("=")[1] : process.env.SYNC_PAGES);

runCliSync(pages)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
