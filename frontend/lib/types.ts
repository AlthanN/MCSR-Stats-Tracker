// Mirrors the Pydantic models served by the FastAPI backend.

export interface SeasonMatchesInfo {
  bestTime: number | null;
  averageCompletionTime: number | null;
  highestWinStreak: number | null;
  currentWinStreak: number | null;
  forfeits: number | null;
  wins: number | null;
  losses: number | null;
  playedMatches: number | null;
  completions: number | null;
}

export interface AllTimeStats {
  wins: number | null;
  losses: number | null;
  playTime: number | null;
  forfeits: number | null;
  bestTime: number | null;
  completions: number | null;
  playedMatches: number | null;
  averageCompletionTime: number | null;
  highestWinStreak: number | null;
}

export interface PlayerData {
  name: string | null;
  country: string | null;
  highestElo: number | null;
  currentElo: number | null;
  seasonElo?: number | null;
  playTime: number | null;
  seasonMatchesInfo: SeasonMatchesInfo;
  allTime: AllTimeStats;
  firstOnline: number | null;
  lastOnline: number | null;
}

export type CheckpointKey =
  | "netherEnter"
  | "bastion"
  | "fortress"
  | "blindTravel"
  | "strongholdEnter"
  | "finish";

export const CHECKPOINT_ORDER: CheckpointKey[] = [
  "netherEnter",
  "bastion",
  "fortress",
  "blindTravel",
  "strongholdEnter",
  "finish",
];

export const CHECKPOINT_LABELS: Record<CheckpointKey, string> = {
  netherEnter: "Nether Enter",
  bastion: "Bastion",
  fortress: "Fortress",
  blindTravel: "Blind Travel",
  strongholdEnter: "Stronghold Enter",
  finish: "Finish",
};

export const CHECKPOINT_SHORT_LABELS: Record<CheckpointKey, string> = {
  netherEnter: "Nether",
  bastion: "Bastion",
  fortress: "Fortress",
  blindTravel: "Blind",
  strongholdEnter: "Stronghold",
  finish: "Finish",
};

export interface CheckpointStat {
  average: number | null;
  best: number | null;
  consistency: number | null;
}

export type CheckpointStats = Record<CheckpointKey, CheckpointStat>;

export interface SplitStat {
  splitName: string;
  average: number | null;
  best: number | null;
  worst: number | null;
  consistency: number | null;
}

export interface SeedTypePerformance {
  seedType: string;
  runsEncountered: number;
  avgImpactMs: number | null;
  winRate: number | null;
}

export interface RunSplitEntry {
  checkpoint: CheckpointKey | string;
  label: string;
  kind?: string;
  playerTimeMs?: number | null;
  opponentTimeMs?: number | null;
  timeMs: number | null;
  deltaVsAverageMs: number | null;
}

export interface MatchEvent {
  kind: string;
  label: string;
  playerName: string;
  timeMs: number;
}

export type RunResult = "completed" | "forfeit" | "reset" | "decay";

export interface RecentRun {
  id: string;
  date: string;
  finalTimeMs: number | null;
  result: RunResult;
  opponent: string | null;
  seedType: string | null;
  won?: boolean;
  winnerName?: string | null;
  isDraw?: boolean;
  isDecay?: boolean;
  eloChange?: number | null;
}

export interface RunDetail extends RecentRun {
  playerName?: string | null;
  opponentFinishTimeMs?: number | null;
  splits: RunSplitEntry[];
  events?: MatchEvent[];
}

export interface ProfileMeta {
  currentSeason: number;
  selectedSeason: number;
  matchCount: number;
}

export interface SeasonStatsSummary {
  bestTime: number | null;
  averageCompletionTime: number | null;
  wins: number | null;
  losses: number | null;
  draws?: number | null;
  playedMatches: number | null;
  completions: number | null;
  forfeits: number | null;
  highestWinStreak: number | null;
  currentWinStreak: number | null;
}

export const EMPTY_SEASON_STATS: SeasonStatsSummary = {
  bestTime: null,
  averageCompletionTime: null,
  wins: null,
  losses: null,
  draws: null,
  playedMatches: null,
  completions: null,
  forfeits: null,
  highestWinStreak: null,
  currentWinStreak: null,
};

export interface ProfileQuery {
  season?: number;
  count?: number;
}

export interface FullProfile {
  player: PlayerData;
  meta: ProfileMeta;
  seasonStats: SeasonStatsSummary;
  hasMatchData: boolean;
  checkpoints: CheckpointStats;
  splits: SplitStat[];
  seedTypes: SeedTypePerformance[];
  recentRuns: RecentRun[];
}

export interface MatchSummary {
  id: string | number | null;
  bastionType: string | null;
  seedType: string | null;
  forfeited: boolean | null;
  players: {
    country: string | null;
    eloRate: number | null;
    nickname: string | null;
    uuid: string | null;
  }[];
}

export interface MatchListResponse {
  matches: MatchSummary[];
  bastionCounts: Record<string, number>;
  seedCounts: Record<string, number>;
}

export interface TimelineEvent {
  type: string;
  time: number | null;
  uuid: string | null;
}

export interface MatchDetail {
  id: string | number | null;
  date: number | null;
  result: Record<string, unknown> | null;
  players: MatchSummary["players"];
  timeline: TimelineEvent[];
}
