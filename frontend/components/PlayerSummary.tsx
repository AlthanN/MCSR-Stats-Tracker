import type { FullProfile } from "@/lib/types";
import { EMPTY_SEASON_STATS } from "@/lib/types";
import {
  formatTime,
  formatElo,
  formatCountry,
  avatarUrl,
  computeCompletionRate,
  getRankTier,
  rankTierClass,
  rankTierBorderClass,
} from "@/lib/format";

export default function PlayerSummary({ profile }: { profile: FullProfile }) {
  const { player, recentRuns, meta, seasonStats: rawSeasonStats, hasMatchData } = profile;
  const seasonStats = rawSeasonStats ?? EMPTY_SEASON_STATS;
  const seasonProfile = player.seasonMatchesInfo;
  const completedRuns = recentRuns.filter((r) => r.result === "completed").length;
  const analyzedCompletion = computeCompletionRate(
    completedRuns,
    recentRuns.length
  );
  const seasonPb = hasMatchData
    ? seasonStats.bestTime
    : seasonProfile.bestTime;
  const seasonAvg = hasMatchData
    ? seasonStats.averageCompletionTime
    : seasonProfile.averageCompletionTime;
  const allTimePb = player.allTime.bestTime;
  const seasonElo = player.seasonElo ?? player.currentElo;
  const rank = getRankTier(seasonElo);
  const isCurrentSeason = meta.selectedSeason === meta.currentSeason;

  return (
    <header className="card px-6 py-5 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={avatarUrl(player.name)}
              alt={`${player.name ?? "Player"} avatar`}
              width={56}
              height={56}
              className="rounded-sm border border-border-bright image-pixelated shadow-glow"
            />
            {player.country && (
              <span className="absolute -bottom-1 -right-1 text-[8px] bg-surface-raised border border-border px-1 py-px text-ink-muted">
                {formatCountry(player.country)}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink leading-tight">
              {player.name ?? "Unknown"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <span
                className={[
                  "text-[10px] uppercase tracking-widest font-bold border rounded-sm px-1.5 py-px",
                  rankTierClass(rank.material),
                  rankTierBorderClass(rank.material),
                ].join(" ")}
              >
                {rank.label}
              </span>
              <span className="text-xs text-ink-muted">
                elo {formatElo(seasonElo)}{" "}
                <span className="text-gold-dim">
                  (peak {formatElo(player.highestElo)})
                </span>
                {!isCurrentSeason && (
                  <span className="text-ink-faint"> · S{meta.selectedSeason}</span>
                )}
              </span>
            </div>
            {isCurrentSeason &&
              seasonProfile.currentWinStreak !== null &&
              seasonProfile.currentWinStreak > 0 && (
                <div className="text-[10px] text-green-dim mt-1 tracking-wide">
                  {seasonProfile.currentWinStreak} win streak (current season)
                </div>
              )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:border-l sm:border-border sm:pl-6">
          <Stat
            label={`S${meta.selectedSeason} PB`}
            value={formatTime(seasonPb)}
            accent="green"
          />
          <Stat
            label="ALL-TIME PB"
            value={formatTime(allTimePb)}
            accent="gold"
          />
          <Stat label="AVG FINISH" value={formatTime(seasonAvg)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
        <MiniStat
          label="Analyzed runs"
          value={hasMatchData ? String(recentRuns.length) : "—"}
        />
        <MiniStat
          label="Season"
          value={`S${meta.selectedSeason}${
            meta.selectedSeason === meta.currentSeason ? " · current" : ""
          }`}
        />
        <MiniStat label="Avg finish" value={formatTime(seasonAvg)} />
        <MiniStat
          label="Completion (analyzed)"
          value={hasMatchData ? analyzedCompletion : "—"}
          accent="green"
        />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "gold";
}) {
  return (
    <div>
      <div className="text-[10px] tracking-widest text-ink-muted mb-1">
        {label}
      </div>
      <div
        className={[
          "text-lg font-bold tabular",
          accent === "gold"
            ? "text-gold"
            : accent === "green"
              ? "text-green"
              : "text-ink",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "gold";
}) {
  return (
    <div className="bg-surface-raised/50 border border-border rounded-sm px-3 py-2">
      <div className="text-[9px] tracking-widest text-ink-faint uppercase">
        {label}
      </div>
      <div
        className={[
          "text-sm font-semibold tabular mt-0.5",
          accent === "green"
            ? "text-green"
            : accent === "gold"
              ? "text-gold"
              : "text-ink-muted",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
