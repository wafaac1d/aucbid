"use client";

import { useEffect, useState } from "react";
import { formatAuction, formatRemaining } from "@/lib/format";

export function AuctionTime({ iso, soon = false, variant = "card" }: { iso: string; soon?: boolean; variant?: "card" | "lot" }) {
  const [remaining, setRemaining] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setRemaining(formatRemaining(iso));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [iso]);
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
