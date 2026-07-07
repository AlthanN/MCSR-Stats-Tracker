import type { AllTimeStats, ProfileMeta, SeasonStatsSummary } from "@/lib/types";
import { EMPTY_SEASON_STATS } from "@/lib/types";
import {
  formatTime,
  formatPlayTime,
  computeWinRate,
  computeDraws,
  computeCompletionRate,
} from "@/lib/format";
import { SectionHeading } from "./CheckpointSection";

function buildSeasonStatsRows(seasonStats: SeasonStatsSummary) {
  return [
    { label: "PB", value: formatTime(seasonStats.bestTime), highlight: true },
    {
      label: "Avg finish",
      value: formatTime(seasonStats.averageCompletionTime),
    },
    { label: "Wins", value: String(seasonStats.wins ?? "—") },
    { label: "Losses", value: String(seasonStats.losses ?? "—") },
    {
      label: "Draws",
      value:
        seasonStats.draws != null
          ? String(seasonStats.draws)
          : computeDraws(
              seasonStats.playedMatches,
              seasonStats.wins,
              seasonStats.losses
            ),
    },
    {
      label: "Win rate",
      value: computeWinRate(
        seasonStats.wins,
        seasonStats.losses,
        seasonStats.forfeits
      ),
    },
    {
      label: "Matches",
      value: String(seasonStats.playedMatches ?? "—"),
    },
    {
      label: "Completions",
      value: String(seasonStats.completions ?? "—"),
    },
    {
      label: "Completion rate",
      value: computeCompletionRate(
        seasonStats.completions ?? 0,
        seasonStats.playedMatches ?? 0
      ),
    },
    { label: "Forfeits", value: String(seasonStats.forfeits ?? "—") },
    {
      label: "Best streak",
      value: String(seasonStats.highestWinStreak ?? "—"),
    },
    {
      label: "Current streak",
      value: String(seasonStats.currentWinStreak ?? "—"),
    },
  ];
}

function buildAllTimeStatsRows(allTime: AllTimeStats) {
  return [
    {
      label: "PB",
      value: formatTime(allTime.bestTime),
      highlight: true,
    },
    {
      label: "Avg finish",
      value: formatTime(allTime.averageCompletionTime),
    },
    { label: "Wins", value: String(allTime.wins ?? "—") },
    { label: "Losses", value: String(allTime.losses ?? "—") },
    {
      label: "Draws",
      value: computeDraws(
        allTime.playedMatches,
        allTime.wins,
        allTime.losses
      ),
    },
    {
      label: "Win rate",
      value: computeWinRate(
        allTime.wins,
        allTime.losses,
        allTime.forfeits
      ),
    },
    {
      label: "Matches",
      value: String(allTime.playedMatches ?? "—"),
    },
    {
      label: "Completions",
      value: String(allTime.completions ?? "—"),
    },
    {
      label: "Completion rate",
      value: computeCompletionRate(
        allTime.completions ?? 0,
        allTime.playedMatches ?? 0
      ),
    },
    { label: "Forfeits", value: String(allTime.forfeits ?? "—") },
    {
      label: "Play time",
      value: formatPlayTime(allTime.playTime),
    },
    {
      label: "Best streak",
      value: String(allTime.highestWinStreak ?? "—"),
    },
  ];
}

export default function StatsOverview({
  seasonStats,
  allTime,
  meta,
  hasMatchData,
}: {
  seasonStats?: SeasonStatsSummary;
  allTime: AllTimeStats;
  meta: ProfileMeta;
  hasMatchData: boolean;
}) {
  const stats = seasonStats ?? EMPTY_SEASON_STATS;
  const isCurrentSeason = meta.selectedSeason === meta.currentSeason;
  const showSeasonEmpty = !hasMatchData;

  return (
    <section>
      <SectionHeading
        title="Player Statistics"
        sub={
          hasMatchData
            ? `season ${meta.selectedSeason} (last ${meta.matchCount} matches) vs all-time`
            : `no ranked data for season ${meta.selectedSeason}`
        }
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <StatsCard
          title={`Season ${meta.selectedSeason}`}
          badge={isCurrentSeason ? "current" : "historical"}
          accent="green"
          empty={showSeasonEmpty}
          emptyMessage={`No season information found for this user in Season ${meta.selectedSeason}.`}
          stats={showSeasonEmpty ? [] : buildSeasonStatsRows(stats)}
        />

        <StatsCard
          title="All-Time"
          badge="career"
          accent="gold"
          stats={buildAllTimeStatsRows(allTime)}
        />
      </div>
    </section>
  );
}

function StatsCard({
  title,
  badge,
  accent,
  stats,
  empty,
  emptyMessage,
}: {
  title: string;
  badge: string;
  accent: "green" | "gold";
  stats: { label: string; value: string; highlight?: boolean }[];
  empty?: boolean;
  emptyMessage?: string;
}) {
  const borderClass =
    accent === "green" ? "border-border-bright" : "border-gold-dim/40";
  const badgeClass =
    accent === "green"
      ? "text-green-dim border-green-muted"
      : "text-gold-dim border-gold-dim/40";

  return (
    <div className={`card px-4 py-4 ${borderClass}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold tracking-widest text-ink uppercase">
          {title}
        </h3>
        <span
          className={`text-[9px] uppercase tracking-widest border rounded-sm px-1.5 py-px ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      {empty && emptyMessage ? (
        <p className="text-sm text-ink-faint leading-relaxed py-4">
          {emptyMessage}
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[10px] tracking-widest text-ink-muted uppercase">
                {stat.label}
              </dt>
              <dd
                className={[
                  "text-sm font-bold tabular mt-0.5",
                  stat.highlight
                    ? accent === "green"
                      ? "text-green"
                      : "text-gold"
                    : "text-ink",
                ].join(" ")}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
