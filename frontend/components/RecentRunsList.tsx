"use client";

import { useEffect, useState } from "react";
import type { RecentRun } from "@/lib/types";
import {
  formatTime,
  formatRelativeDate,
  formatSeedType,
  formatEloChange,
} from "@/lib/format";
import { SectionHeading } from "./CheckpointSection";

const RUNS_PER_PAGE = 20;

function outcomeLabel(run: RecentRun): "W" | "L" | "D" | null {
  if (run.isDecay) return null;
  if (run.won) return "W";
  if (run.isDraw) return "D";
  return "L";
}

function outcomeClass(label: "W" | "L" | "D"): string {
  if (label === "W") return "text-green";
  if (label === "L") return "text-bad-dim";
  return "text-white";
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="M10 3 5 8l5 5" />
      ) : (
        <path d="M6 3l5 5-5 5" />
      )}
    </svg>
  );
}

function DecayRow({ run }: { run: RecentRun }) {
  return (
    <div
      className="w-full flex items-center justify-between px-4 py-3 text-left bg-surface-raised/30 cursor-default"
      title="ELO decay from inactivity — not a playable match"
    >
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        <span className="text-xs text-ink-faint w-20 shrink-0 tabular">
          {formatRelativeDate(run.date)}
        </span>
        <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-px border rounded-sm text-purple-400 border-purple-700/40">
          decay
        </span>
        <span className="text-xs text-ink-muted">
          ELO decay · inactivity
        </span>
      </div>
      <span className="font-bold tabular text-bad-dim shrink-0 ml-3">
        {formatEloChange(run.eloChange)} elo
      </span>
    </div>
  );
}

function MatchRow({
  run,
  onSelectRun,
}: {
  run: RecentRun;
  onSelectRun: (run: RecentRun) => void;
}) {
  const outcome = outcomeLabel(run);

  return (
    <button
      type="button"
      onClick={() => onSelectRun(run)}
      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-raised transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        <span className="text-xs text-ink-faint w-20 shrink-0 tabular">
          {formatRelativeDate(run.date)}
        </span>
        {outcome && (
          <span
            className={[
              "text-[10px] uppercase tracking-wide font-bold w-5 text-center shrink-0",
              outcomeClass(outcome),
            ].join(" ")}
            title={
              outcome === "W"
                ? run.winnerName
                  ? `Winner: ${run.winnerName}`
                  : "Win"
                : outcome === "L"
                  ? run.winnerName
                    ? `Winner: ${run.winnerName}`
                    : "Loss"
                  : "Draw"
            }
          >
            {outcome}
          </span>
        )}
        {run.result === "forfeit" && (
          <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-px border rounded-sm text-gold-dim border-gold-dim/30">
            ff
          </span>
        )}
        {run.winnerName && !run.isDraw && (
          <span className="text-[10px] text-ink-muted hidden sm:inline">
            <span className="text-gold-dim">{run.winnerName}</span> won
          </span>
        )}
        {run.seedType && (
          <span className="text-[10px] text-ink-faint capitalize hidden md:inline">
            {formatSeedType(run.seedType)}
          </span>
        )}
        {run.opponent && (
          <span className="text-xs text-ink-muted truncate">
            vs {run.opponent}
          </span>
        )}
      </div>
      <span className="font-bold tabular text-ink shrink-0 ml-3 group-hover:text-green transition-colors">
        {formatTime(run.finalTimeMs)}
      </span>
    </button>
  );
}

export default function RecentRunsList({
  runs,
  onSelectRun,
}: {
  runs: RecentRun[];
  onSelectRun: (run: RecentRun) => void;
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [runs]);

  const totalPages = Math.max(1, Math.ceil(runs.length / RUNS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * RUNS_PER_PAGE;
  const visibleRuns = runs.slice(start, start + RUNS_PER_PAGE);
  const rangeStart = runs.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + RUNS_PER_PAGE, runs.length);

  const sub =
    runs.length === 0
      ? "no matches"
      : runs.length <= RUNS_PER_PAGE
        ? `${runs.length} match${runs.length === 1 ? "" : "es"}`
        : `${rangeStart}–${rangeEnd} of ${runs.length}`;

  return (
    <section>
      <SectionHeading title="Recent Runs" sub={sub} />
      <div className="card divide-y divide-border">
        {visibleRuns.map((run) =>
          run.isDecay ? (
            <DecayRow key={run.id} run={run} />
          ) : (
            <MatchRow key={run.id} run={run} onSelectRun={onSelectRun} />
          )
        )}
        {runs.length === 0 && (
          <p className="px-4 py-6 text-center text-ink-faint text-xs">
            no recent runs found
          </p>
        )}
      </div>

      {runs.length > RUNS_PER_PAGE && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            aria-label="Previous page"
            className="inline-flex items-center justify-center h-8 w-8 rounded-sm border border-border text-ink-muted hover:text-ink hover:border-border-bright disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronIcon direction="left" />
          </button>
          <span className="text-[11px] text-ink-faint tabular min-w-[5.5rem] text-center">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((p) => Math.min(totalPages - 1, p + 1))
            }
            disabled={currentPage >= totalPages - 1}
            aria-label="Next page"
            className="inline-flex items-center justify-center h-8 w-8 rounded-sm border border-border text-ink-muted hover:text-ink hover:border-border-bright disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      )}
    </section>
  );
}
