"use client";

import { Suspense, useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import PlayerSummary from "./PlayerSummary";
import ProfileFilters from "./ProfileFilters";
import StatsOverview from "./StatsOverview";
import NoSeasonDataBanner from "./NoSeasonDataBanner";
import CheckpointSection from "./CheckpointSection";
import SplitBreakdownTable from "./SplitBreakdownTable";
import SeedTypePerformance from "./SeedTypePerformance";
import RecentRunsList from "./RecentRunsList";
import RunDetailModal from "./RunDetailModal";
import ApiRateLimitMeter from "./ApiRateLimitMeter";
import type { ApiRateLimit, FullProfile, RecentRun, RunDetail } from "@/lib/types";
import { fetchRateLimitStatus, fetchRunDetail, ApiError } from "@/lib/api";

function newestStatus(a: ApiRateLimit, b: ApiRateLimit): ApiRateLimit {
  const aTime = a.observedAt ? new Date(a.observedAt).getTime() : 0;
  const bTime = b.observedAt ? new Date(b.observedAt).getTime() : 0;
  return bTime >= aTime ? b : a;
}

export default function ProfileDashboard({
  username,
  profile,
  initialRateLimit,
}: {
  username: string;
  profile: FullProfile;
  initialRateLimit: ApiRateLimit;
}) {
  const [activeRun, setActiveRun] = useState<RunDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [rateLimit, setRateLimit] = useState(() =>
    newestStatus(initialRateLimit, profile.meta.apiRateLimit)
  );
  const [rateWarning, setRateWarning] = useState<string | null>(null);
  const { hasMatchData, meta } = profile;
  const hasData = hasMatchData ?? (profile.recentRuns?.length ?? 0) > 0;

  useEffect(() => {
    async function refreshRateLimit() {
      try {
        setRateLimit(await fetchRateLimitStatus());
      } catch {
        // Keep the last known authoritative value.
      }
    }
    const timer = window.setInterval(refreshRateLimit, 15000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleSelectRun(run: RecentRun) {
    if (run.isDecay) return;
    if (rateLimit.exhausted) {
      setRateWarning("The shared API limit has been reached. Run details will be available after reset.");
      return;
    }
    setRateWarning(null);
    setModalOpen(true);
    setLoadingRun(true);
    setActiveRun(null);
    try {
      const detail = await fetchRunDetail(username, run.id, {
        season: meta.selectedSeason,
        count: meta.matchCount,
      });
      setActiveRun(detail);
    } catch (err) {
      console.error(
        err instanceof ApiError ? `${err.status}: ${err.message}` : err
      );
      if (err instanceof ApiError && err.status === 429) {
        if (err.rateLimit) setRateLimit(err.rateLimit);
        setRateWarning(err.message);
      }
      setActiveRun(null);
    } finally {
      setLoadingRun(false);
      try {
        setRateLimit(await fetchRateLimitStatus());
      } catch {
        // Keep the last known value.
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-8 py-4 border-b border-border flex flex-col sm:flex-row sm:items-end gap-4">
        <SearchBar size="compact" initialValue={username} />
        <ApiRateLimitMeter status={rateLimit} />
      </header>

      <div className="flex-1 px-4 sm:px-8 py-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <PlayerSummary profile={profile} />

        {meta.partialData && (
          <div className="card border-bad/50 px-4 py-3 text-sm text-ink-muted leading-relaxed">
            <span className="text-bad font-semibold">API limit reached.</span>{" "}
            Showing {meta.analyzedMatchCount} of {meta.requestedMatchCount} requested matches.
          </div>
        )}

        {rateWarning && (
          <div className="card border-bad/50 px-4 py-3 text-sm text-bad">
            {rateWarning}
          </div>
        )}

        <Suspense fallback={<div className="card h-24 animate-pulse-glow" />}>
          <ProfileFilters username={username} meta={meta} />
        </Suspense>

        {!hasData && <NoSeasonDataBanner meta={meta} />}

        <StatsOverview
          seasonProfile={profile.player.seasonMatchesInfo}
          allTime={profile.player.allTime}
          meta={meta}
        />

        {hasData && (
          <>
            <CheckpointSection
              checkpoints={profile.checkpoints}
              matchCount={meta.matchCount}
              bestFromSeasonPb={profile.checkpointBestFromPb ?? false}
            />
            <SplitBreakdownTable
              splits={profile.splits}
              matchCount={meta.matchCount}
              bestFromSeasonPb={profile.checkpointBestFromPb ?? false}
            />
            <SeedTypePerformance seedTypes={profile.seedTypes} />
        <RecentRunsList
          runs={profile.recentRuns}
          onSelectRun={handleSelectRun}
        />
          </>
        )}
      </div>

      <footer className="px-6 py-4 border-t border-border text-center text-[10px] text-ink-faint">
        {hasData
          ? `Season ${meta.selectedSeason} · ${meta.analyzedMatchCount} ranked matches analyzed`
          : `Season ${meta.selectedSeason} · no ranked match data found`}
      </footer>

      {modalOpen && (
        <RunDetailModal
          run={activeRun}
          loading={loadingRun}
          playerName={profile.player.name}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
