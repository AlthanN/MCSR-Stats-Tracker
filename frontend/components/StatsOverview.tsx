import type {
  AllTimeStats,
  ProfileMeta,
  SeasonMatchesInfo,
} from "@/lib/types";
import {
  formatTime,
  formatPlayTime,
  computeWinRate,
  computeDraws,
  computeCompletionRate,
} from "@/lib/format";
import { SectionHeading } from "./CheckpointSection";

function hasSeasonProfileStats(info: SeasonMatchesInfo): boolean {
  return (
    (info.playedMatches ?? 0) > 0 ||
    (info.wins ?? 0) > 0 ||
    (info.losses ?? 0) > 0 ||
    info.bestTime != null
  );
}

function buildSeasonStatsRows(seasonProfile: SeasonMatchesInfo) {
  return [
    {
      label: "PB",
      value: formatTime(seasonProfile.bestTime),
      highlight: true,
    },
    {
      label: "Avg finish",
      value: formatTime(seasonProfile.averageCompletionTime),
    },
    { label: "Wins", value: String(seasonProfile.wins ?? "—") },
    { label: "Losses", value: String(seasonProfile.losses ?? "—") },
    {
      label: "Draws",
      value: computeDraws(
        seasonProfile.playedMatches,
        seasonProfile.wins,
        seasonProfile.losses
      ),
    },
    {
      label: "Win rate",
      value: computeWinRate(
        seasonProfile.wins,
        seasonProfile.losses,
        seasonProfile.forfeits
      ),
    },
    {
      label: "Matches",
      value: String(seasonProfile.playedMatches ?? "—"),
    },
    {
      label: "Completions",
      value: String(seasonProfile.completions ?? "—"),
    },
    {
      label: "Completion rate",
      value: computeCompletionRate(
        seasonProfile.completions ?? 0,
        seasonProfile.playedMatches ?? 0
      ),
    },
    { label: "Forfeits", value: String(seasonProfile.forfeits ?? "—") },
    {
      label: "Best streak",
      value: String(seasonProfile.highestWinStreak ?? "—"),
    },
    {
      label: "Current streak",
      value: String(seasonProfile.currentWinStreak ?? "—"),
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
  seasonProfile,
  allTime,
  meta,
}: {
  seasonProfile: SeasonMatchesInfo;
  allTime: AllTimeStats;
  meta: ProfileMeta;
}) {
  const isCurrentSeason = meta.selectedSeason === meta.currentSeason;
  const showSeasonEmpty = !hasSeasonProfileStats(seasonProfile);

  return (
    <section>
      <SectionHeading
        title="Player Statistics"
        sub={`season ${meta.selectedSeason} vs all-time`}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <StatsCard
          title={`Season ${meta.selectedSeason}`}
          badge={isCurrentSeason ? "current" : "historical"}
          accent="green"
          empty={showSeasonEmpty}
          emptyMessage={`No season information found for this user in Season ${meta.selectedSeason}.`}
          stats={showSeasonEmpty ? [] : buildSeasonStatsRows(seasonProfile)}
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
