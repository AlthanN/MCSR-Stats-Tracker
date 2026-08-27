"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import type { ProfileMeta } from "@/lib/types";
import PlayerLoadingSkeleton from "./PlayerLoadingSkeleton";

export const MATCH_COUNT_OPTIONS = [100, 250, 500] as const;

export default function ProfileFilters({
  username,
  meta,
}: {
  username: string;
  meta: ProfileMeta;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [season, setSeason] = useState(String(meta.selectedSeason));
  const [count, setCount] = useState(String(meta.matchCount));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSeason(String(meta.selectedSeason));
    setCount(String(meta.matchCount));
  }, [meta.selectedSeason, meta.matchCount]);

  function navigateWithParams(params: URLSearchParams) {
    startTransition(() => {
      router.push(
        `/player/${encodeURIComponent(username)}?${params.toString()}`
      );
    });
  }

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", season);
    params.set("count", count);
    navigateWithParams(params);
  }

  function resetToCurrent() {
    setSeason(String(meta.currentSeason));
    const params = new URLSearchParams(searchParams.toString());
    params.delete("season");
    params.set("count", count);
    navigateWithParams(params);
  }

  const isCurrentSeason = meta.selectedSeason === meta.currentSeason;
  const countOptions = MATCH_COUNT_OPTIONS.includes(
    meta.matchCount as (typeof MATCH_COUNT_OPTIONS)[number]
  )
    ? MATCH_COUNT_OPTIONS
    : ([...MATCH_COUNT_OPTIONS, meta.matchCount] as number[]).sort(
        (a, b) => a - b
      );

  if (isPending) {
    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-busy="true"
        aria-live="polite"
      >
        <PlayerLoadingSkeleton message="APPLYING FILTERS…" />
      </div>
    );
  }

  return (
    <section className="card px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <form
          onSubmit={applyFilters}
          className="flex-1 flex flex-col sm:flex-row gap-3 sm:items-end"
        >
          <label className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
            <span className="text-[10px] tracking-widest text-ink-muted uppercase">
              Season
            </span>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="bg-surface-raised border border-border rounded-sm px-3 py-2 text-sm text-ink outline-none focus:border-green"
            >
              {Array.from(
                { length: meta.currentSeason + 1 },
                (_, i) => meta.currentSeason - i
              ).map((s) => (
                <option key={s} value={s}>
                  Season {s}
                  {s === meta.currentSeason ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
            <span className="text-[10px] tracking-widest text-ink-muted uppercase">
              Match range
            </span>
            <select
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="bg-surface-raised border border-border rounded-sm px-3 py-2 text-sm text-ink outline-none focus:border-green"
            >
              {countOptions.map((n) => (
                <option key={n} value={n}>
                  Last {n} matches
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="shrink-0 border border-green-muted text-green hover:bg-green hover:text-bg transition-colors rounded-sm font-semibold tracking-wide px-4 py-2 text-sm"
          >
            APPLY
          </button>
        </form>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-faint">
        <span>
          Analytics: Season {meta.selectedSeason} ·
          {isCurrentSeason && (
            <span className="text-green-dim"> current</span>
          )}
          {" · "} NOTE * Match range reflects data for key checkpoints in {meta.matchCount} ranked matches 
        </span>
        {!isCurrentSeason && (
          <button
            type="button"
            onClick={resetToCurrent}
            className="text-green-dim hover:text-green transition-colors"
          >
            reset to current season
          </button>
        )}
      </div>
    </section>
  );
}
