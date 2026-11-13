import { createHash } from "node:crypto";
import type { Lot } from "./types";

export type PageStamp = { head: string; total: number; lastPage: number };

export type CatalogProbe = {
  mode: "full" | "refresh";
  headPages: number;
  read(key: string): PageStamp | null;
  write(key: string, patch: Partial<PageStamp>): void;
};

export function lotPageDigest(lots: Pick<Lot, "id" | "currentBid" | "auctionAt" | "odometer" | "titleDoc">[]): string {
  const body = lots
    .map((lot) => [lot.id, lot.currentBid ?? "", lot.auctionAt, lot.odometer ?? "", lot.titleDoc].join("|"))
    .join("\n");
  return createHash("sha256").update(body).digest("hex");
}

export function headUnchanged(digest: string, total: number | null, stored: PageStamp | null): boolean {
  if (!stored?.head || stored.head !== digest) return false;
  if (total == null || stored.total <= 0) return true;
  return stored.total === total;
}

export function refreshEveryMs(raw = process.env.SYNC_REFRESH_MINUTES): number {
  const minutes = Number(raw);
  const clamped = Number.isFinite(minutes) ? Math.min(10, Math.max(5, minutes)) : 7;
  return clamped * 60_000;
}
