"use client";

import { useEffect, useState } from "react";
import { formatAuction, formatRemaining } from "@/lib/format";

export function AuctionTime({ iso, soon = false, variant = "card" }: { iso: string; soon?: boolean; variant?: "card" | "lot" }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = formatRemaining(iso, now ?? Date.now());
  const started = remaining === "Торги уже начались";

  if (variant === "lot") {
    return (
      <p className="lot-date">
        <span>{formatAuction(iso)}</span>
        <span className={started ? "remain is-started" : "remain"}>{remaining}</span>
      </p>
    );
  }

  return (
    <p className={`card-date ${soon ? "is-soon" : ""}`}>
      <span>{formatAuction(iso)}</span>
      <span className={started ? "remain is-started" : "remain"}>{remaining}</span>
    </p>
  );
}
