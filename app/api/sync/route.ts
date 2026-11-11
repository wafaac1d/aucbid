import { getSyncStatus, requestSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getSyncStatus());
}

export function POST() {
  const result = requestSync();
  const headers = new Headers();
  if (!result.accepted && result.status.retryAfterMs > 0) {
    headers.set("Retry-After", String(Math.ceil(result.status.retryAfterMs / 1000)));
  }
  return Response.json(result.status, { status: result.accepted ? 202 : 429, headers });
}
