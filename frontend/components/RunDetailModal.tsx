"use client";

import { useEffect, useRef } from "react";
import type { RunDetail } from "@/lib/types";
import { formatTime, formatDelta, formatSeedType } from "@/lib/format";

const EVENT_STYLES: Record<string, string> = {
  death: "text-bad border-bad-dim/40",
  reset: "text-ink-faint border-border",
  forfeit: "text-gold-dim border-gold-dim/40",
};

export default function RunDetailModal({
  run,
  loading,
  playerName,
  onClose,
}: {
  run: RunDetail | null;
  loading: boolean;
  playerName: string | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const youLabel = run?.playerName ?? playerName ?? "You";
  const oppLabel = run?.opponent ?? "Opponent";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Run detail"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        aria-label="Close run detail"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl border border-border-bright bg-surface rounded-sm shadow-glow max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold tracking-widest text-ink uppercase">
            Run Detail
          </h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-green text-lg leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4">
          {loading && (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-full h-8 bg-surface-raised animate-pulse-glow rounded-sm" />
              <div className="w-full h-24 bg-surface-raised animate-pulse-glow rounded-sm" />
              <p className="text-ink-faint text-xs tracking-widest">
                LOADING SPLITS…
              </p>
            </div>
          )}

          {!loading && run && (
            <>
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <div className="text-xs text-ink-muted">
                    {new Date(run.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {run.opponent && (
                    <div className="text-xs text-ink-faint mt-0.5">
                      {youLabel} vs {run.opponent}
                    </div>
                  )}
                  {run.seedType && (
                    <div className="text-[10px] text-green-dim mt-1 capitalize">
                      {formatSeedType(run.seedType)}
                    </div>
                  )}
                  {run.winnerName && (
                    <div
                      className={[
                        "text-xs mt-2 font-semibold",
                        run.won ? "text-green" : "text-bad-dim",
                      ].join(" ")}
                    >
                      Winner: {run.winnerName}
                      {run.won ? " (you)" : ""}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-ink-faint uppercase tracking-wide mb-1">
                    {youLabel}
                  </div>
                  <div className="font-bold text-xl text-gold tabular">
                    {formatTime(run.finalTimeMs)}
                  </div>
                  {run.opponentFinishTimeMs != null && (
                    <>
                      <div className="text-[10px] text-ink-faint uppercase tracking-wide mt-2 mb-1">
                        {oppLabel}
                      </div>
                      <div className="font-bold text-lg text-ink-muted tabular">
                        {formatTime(run.opponentFinishTimeMs)}
                      </div>
                    </>
                  )}
                  <div className="text-[10px] text-ink-faint uppercase tracking-wide mt-1">
                    {run.result}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-ink-faint tracking-widest mb-2 grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3">
                <span>SPLIT</span>
                <span className="w-20 text-right">{youLabel}</span>
                <span className="w-20 text-right">{oppLabel}</span>
                <span className="w-16 text-right">VS AVG</span>
              </div>

              <div className="space-y-1">
                {run.splits.map((split) => {
                  const delta = split.deltaVsAverageMs;
                  const isFaster = delta !== null && delta < 0;
                  const isSlower = delta !== null && delta > 0;
                  const playerTime = split.playerTimeMs ?? split.timeMs;
                  return (
                    <div
                      key={`${split.checkpoint}-${split.label}`}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center py-2 px-3 rounded-sm bg-surface-raised/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={[
                            "w-1 h-8 rounded-sm shrink-0",
                            isFaster
                              ? "bg-green shadow-glow"
                              : isSlower
                                ? "bg-bad"
                                : "bg-border-bright",
                          ].join(" ")}
                          aria-hidden
                        />
                        <span className="text-sm text-ink truncate">
                          {split.label}
                        </span>
                      </div>
                      <span className="text-sm tabular text-ink w-20 text-right">
                        {formatTime(playerTime)}
                      </span>
                      <span className="text-sm tabular text-ink-muted w-20 text-right">
                        {formatTime(split.opponentTimeMs)}
                      </span>
                      <span
                        className={[
                          "text-xs tabular w-16 text-right",
                          isFaster
                            ? "text-green"
                            : isSlower
                              ? "text-bad"
                              : "text-ink-faint",
                        ].join(" ")}
                      >
                        {formatDelta(delta)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {run.splits.length === 0 && (
                <p className="text-ink-faint text-xs py-4 text-center">
                  no split timeline available for this run
                </p>
              )}

              {run.events && run.events.length > 0 && (
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="text-[10px] text-ink-faint tracking-widest mb-2">
                    MATCH EVENTS
                  </div>
                  <div className="space-y-1">
                    {run.events.map((event, i) => (
                      <div
                        key={`${event.kind}-${event.timeMs}-${i}`}
                        className={[
                          "flex items-center justify-between px-3 py-2 rounded-sm border text-sm",
                          EVENT_STYLES[event.kind] ?? "text-ink-faint border-border",
                        ].join(" ")}
                      >
                        <span>
                          <span className="font-semibold uppercase text-[10px] tracking-wide mr-2">
                            {event.label}
                          </span>
                          {event.playerName}
                        </span>
                        <span className="tabular">{formatTime(event.timeMs)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !run && (
            <p className="text-bad text-xs py-8 text-center">
              couldn&apos;t load this run&apos;s splits.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
