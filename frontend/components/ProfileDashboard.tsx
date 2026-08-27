"use client";

import { Suspense, useState } from "react";
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
import type { FullProfile, RecentRun, RunDetail } from "@/lib/types";
import { fetchRunDetail, ApiError } from "@/lib/api";

export default function ProfileDashboard({
  username,
  profile,
}: {
  username: string;
  profile: FullProfile;
}) {
  const [activeRun, setActiveRun] = useState<RunDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const { hasMatchData, meta } = profile;
  const hasData = hasMatchData ?? (profile.recentRuns?.length ?? 0) > 0;

  async function handleSelectRun(run: RecentRun) {
    if (run.isDecay) return;
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
      setActiveRun(null);
    } finally {
      setLoadingRun(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-8 py-4 border-b border-border">
        <SearchBar size="compact" initialValue={username} />
      </header>

      <div className="flex-1 px-4 sm:px-8 py-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <PlayerSummary profile={profile} />

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
            />
            <SplitBreakdownTable splits={profile.splits} />
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
          ? `Season ${meta.selectedSeason} · last ${meta.matchCount} ranked matches analyzed`
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
