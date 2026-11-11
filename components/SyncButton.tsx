"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SyncStatus = {
  running: boolean;
  canStart: boolean;
  retryAfterMs: number;
  message: string;
};

type ViewStatus = SyncStatus & { deadline: number };

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<ViewStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const wasRunning = useRef(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const response = await fetch("/api/sync", { cache: "no-store" });
        const data = (await response.json()) as SyncStatus;
        if (ignore) return;
        setStatus({ ...data, deadline: data.retryAfterMs > 0 ? Date.now() + data.retryAfterMs : 0 });
      } catch {
        if (!ignore) setStatus(null);
      }
    };
    void load();
    const poll = window.setInterval(() => void load(), 4000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      ignore = true;
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    const running = Boolean(status?.running);
    if (wasRunning.current && status && !running) router.refresh();
    wasRunning.current = running;
  }, [status, router]);

  const remaining = status?.deadline ? Math.max(0, status.deadline - now) : 0;
  const running = Boolean(status?.running);
  const blocked = !status || pending || running || remaining > 0;
  const countdown = remaining > 0 ? formatCountdown(remaining) : "";
  const label = countdown ? `через ${countdown}` : running || pending ? "Синхронизация…" : "Синхронизировать";

  async function onClick() {
    if (blocked) return;
    setPending(true);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = (await response.json()) as SyncStatus;
      const receivedAt = Date.now();
      setNow(receivedAt);
      setStatus({ ...data, deadline: data.retryAfterMs > 0 ? receivedAt + data.retryAfterMs : 0 });
    } catch {
      setStatus(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="sync-button"
      onClick={() => void onClick()}
      disabled={blocked}
      aria-live="polite"
      title={countdown ? `Повторная синхронизация через ${countdown}` : "Обновить лоты с IAAI и Copart"}
    >
      {label}
    </button>
  );
}
