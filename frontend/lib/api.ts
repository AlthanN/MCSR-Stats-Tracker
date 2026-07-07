import type {
  FullProfile,
  RunDetail,
  TrendingPlayer,
  MatchListResponse,
  MatchDetail,
  PlayerData,
  ProfileQuery,
  SeasonStatsSummary,
} from "./types";
import { EMPTY_SEASON_STATS } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string, revalidate = 30): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    next: { revalidate },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // body wasn't JSON
    }
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

function buildQuery(params: ProfileQuery): string {
  const search = new URLSearchParams();
  if (params.season !== undefined) search.set("season", String(params.season));
  if (params.count !== undefined) search.set("count", String(params.count));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Ensure profile has seasonStats/hasMatchData even from older backend responses. */
function normalizeProfile(raw: FullProfile): FullProfile {
  const recentRuns = raw.recentRuns ?? [];
  const seasonStats: SeasonStatsSummary =
    raw.seasonStats ?? EMPTY_SEASON_STATS;
  const hasMatchData =
    raw.hasMatchData ?? recentRuns.length > 0;

  return {
    ...raw,
    recentRuns,
    seasonStats,
    hasMatchData,
    checkpoints: raw.checkpoints ?? ({} as FullProfile["checkpoints"]),
    splits: raw.splits ?? [],
    seedTypes: raw.seedTypes ?? [],
  };
}

/** Full dashboard payload: summary + checkpoints + splits + seed types + recent runs. */
export function fetchPlayerProfile(
  username: string,
  query: ProfileQuery = {}
): Promise<FullProfile> {
  return getJson<FullProfile>(
    `/players/${encodeURIComponent(username)}${buildQuery(query)}`
  ).then(normalizeProfile);
}

/** Active MCSR ranked season. */
export function fetchCurrentSeason(): Promise<{ currentSeason: number }> {
  return getJson<{ currentSeason: number }>("/meta/current-season", 300);
}

/** Lightweight player summary without match analytics. */
export function fetchPlayerSummary(username: string): Promise<PlayerData> {
  return getJson<PlayerData>(
    `/players/${encodeURIComponent(username)}/summary`
  );
}

/** Recent ranked matches with bastion/seed counts. */
export function fetchPlayerMatches(
  username: string,
  query: ProfileQuery = {}
): Promise<MatchListResponse> {
  return getJson<MatchListResponse>(
    `/players/${encodeURIComponent(username)}/matches${buildQuery(query)}`
  );
}

/** Single match detail with filtered timeline. */
export function fetchMatchDetail(matchId: string): Promise<MatchDetail> {
  return getJson<MatchDetail>(`/matches/${encodeURIComponent(matchId)}`);
}

/** Expanded split timeline for a single run. */
export function fetchRunDetail(
  username: string,
  runId: string,
  query: ProfileQuery = {}
): Promise<RunDetail> {
  return getJson<RunDetail>(
    `/players/${encodeURIComponent(username)}/runs/${encodeURIComponent(runId)}${buildQuery(query)}`,
    0
  );
}

/** Recently searched / default trending runners for the homepage. */
export function fetchTrendingPlayers(): Promise<TrendingPlayer[]> {
  return getJson<TrendingPlayer[]>("/players/trending", 60);
}

export { type TrendingPlayer };
