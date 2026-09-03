"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRateLimitStatus } from "@/lib/api";
import { EMPTY_API_RATE_LIMIT, type ApiRateLimit } from "@/lib/types";

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

function ageLabel(observedAt: string | null): string {
  if (!observedAt) return "";
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(observedAt).getTime()) / 1000)
  );
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function useApiRateLimit(initial: ApiRateLimit = EMPTY_API_RATE_LIMIT) {
  const [status, setStatus] = useState(initial);
  const [unavailable, setUnavailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setStatus(await fetchRateLimitStatus());
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setChecking(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(
      () => void refresh(),
      status.syncState === "updating" ? 2000 : 15000
    );
    return () => window.clearInterval(interval);
  }, [refresh, status.syncState]);

  return { status, setStatus, refresh, unavailable, checking };
}

export default function ApiRateLimitMeter({
  status,
  unavailable = false,
  checking = false,
}: {
  status: ApiRateLimit;
  unavailable?: boolean;
  checking?: boolean;
}) {
  const [seconds, setSeconds] = useState(() => secondsUntil(status.resetAt));
  const [, setClock] = useState(0);
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
      () => {
        setSeconds(secondsUntil(status.resetAt));
        setClock((value) => value + 1);
      },
      1000
    );
    return () => window.clearInterval(timer);
  }, [status.resetAt]);

  const syncLabel = unavailable
    ? `Status unavailable${status.observedAt ? " · last known" : ""}`
    : checking
      ? "Checking…"
      : status.syncState === "updating"
        ? `Updating…${status.activeOperations > 1 ? ` · ${status.activeOperations} active` : ""}`
        : status.syncState === "estimated"
          ? `Estimated${status.observedAt ? ` · ${ageLabel(status.observedAt)}` : ""}`
          : `Up to date${status.observedAt ? ` · ${ageLabel(status.observedAt)}` : ""}`;
  const dotClass = unavailable
    ? "bg-bad"
    : checking || status.syncState === "updating"
      ? "bg-gold animate-pulse"
      : status.syncState === "estimated"
        ? "bg-gold"
        : "bg-green";

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
      <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-ink-faint tabular">
        <span className="flex items-center gap-1.5" aria-live="polite">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
          {syncLabel}
        </span>
        <span>{formatResetCountdown(seconds)}</span>
      </div>
    </div>
  );
}

export function LiveApiRateLimitMeter() {
  const { status, unavailable, checking } = useApiRateLimit();
  return (
    <ApiRateLimitMeter
      status={status}
      unavailable={unavailable}
      checking={checking}
    />
  );
}
