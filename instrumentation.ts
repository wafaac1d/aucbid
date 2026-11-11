export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startSyncSchedule } = await import("./lib/schedule");
  startSyncSchedule();
}
