"use client";

import { useEffect, useState } from "react";
import type { ApiRateLimit } from "@/lib/types";

function secondsUntil(resetAt: string | null): number | null {
  if (!resetAt) return null;
  return Math.max(0, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000));
}

export function formatResetCountdown(seconds: number | null): string {
  if (seconds === null) return "reset time unknown";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `resets in ${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default function ApiRateLimitMeter({ status }: { status: ApiRateLimit }) {
  const [seconds, setSeconds] = useState(() => secondsUntil(status.resetAt));
  const percent = status.limit > 0 ? (status.used / status.limit) * 100 : 0;
  const tone =
    status.exhausted || percent >= 80
      ? "bad"
      : percent >= 60
        ? "gold"
        : "green";
  const barClass =
    tone === "bad" ? "bg-bad" : tone === "gold" ? "bg-gold" : "bg-green";
  const textClass =
    tone === "bad" ? "text-bad" : tone === "gold" ? "text-gold" : "text-green";

  useEffect(() => {
    setSeconds(secondsUntil(status.resetAt));
    const timer = window.setInterval(
      () => setSeconds(secondsUntil(status.resetAt)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [status.resetAt]);

  return (
    <div
      className="w-full sm:w-64 shrink-0"
      title="Shared MCSR API budget observed by this application's backend"
    >
      <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-widest">
        <span className="text-ink-faint">Shared API usage</span>
        <span className={`tabular font-semibold ${textClass}`}>
          {status.used}/{status.limit}
          {status.estimated ? " ~" : ""}
        </span>
      </div>
      <div className="h-1.5 bg-surface-raised border border-border mt-1 overflow-hidden rounded-sm">
        <div
          className={`h-full transition-[width] duration-300 ${barClass}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div className="mt-1 text-right text-[9px] text-ink-faint tabular">
        {formatResetCountdown(seconds)}
      </div>
    </div>
  );
}
