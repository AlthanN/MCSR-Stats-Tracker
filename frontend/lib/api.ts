import type {
  FullProfile,
  RunDetail,
  MatchListResponse,
  MatchDetail,
  PlayerData,
  ProfileQuery,
  SeasonStatsSummary,
  ApiRateLimit,
} from "./types";
import { EMPTY_API_RATE_LIMIT, EMPTY_SEASON_STATS } from "./types";

function getApiBaseUrl(): string {
  // Vercel injects this private service binding for server-side requests.
  // Browser requests stay on the current origin and are routed by Vercel (or
  // the development rewrite in next.config.js) to the FastAPI service.
  if (typeof window === "undefined") {
    return (process.env.BACKEND_URL ?? "http://localhost:8000").replace(
      /\/$/,
      ""
    );
  }
  return "";
}

export class ApiError extends Error {
  status: number;
  code?: string;
  rateLimit?: ApiRateLimit;
  constructor(
    message: string,
    status: number,
    options: { code?: string; rateLimit?: ApiRateLimit } = {}
  ) {
    super(message);
    this.status = status;
    this.code = options.code;
    this.rateLimit = options.rateLimit;
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string, revalidate = 30): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    next: { revalidate },
  });

  if (!res.ok) {
    let detail = res.statusText;
    let code: string | undefined;
    let rateLimit: ApiRateLimit | undefined;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (body.detail && typeof body.detail === "object") {
        detail = body.detail.message ?? detail;
        code = body.detail.code;
        rateLimit = body.detail.rateLimit;
      }
    } catch {
      // body wasn't JSON
    }
    throw new ApiError(detail, res.status, { code, rateLimit });
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
    checkpointBestFromPb: raw.checkpointBestFromPb ?? false,
    meta: {
      ...raw.meta,
      requestedMatchCount: raw.meta.requestedMatchCount ?? raw.meta.matchCount,
      analyzedMatchCount:
        raw.meta.analyzedMatchCount ?? raw.recentRuns?.length ?? 0,
      partialData: raw.meta.partialData ?? false,
      partialReason: raw.meta.partialReason ?? null,
      apiRateLimit: raw.meta.apiRateLimit ?? EMPTY_API_RATE_LIMIT,
    },
  };
}

/** Full dashboard payload: summary + checkpoints + splits + seed types + recent runs. */
export function fetchPlayerProfile(
  username: string,
  query: ProfileQuery = {}
): Promise<FullProfile> {
  return getJson<FullProfile>(
    `/api/players/${encodeURIComponent(username)}${buildQuery(query)}`
  ).then(normalizeProfile);
}

/** Active MCSR ranked season. */
export function fetchCurrentSeason(): Promise<{ currentSeason: number }> {
  return getJson<{ currentSeason: number }>("/api/meta/current-season", 300);
}

/** Shared MCSR API budget. This endpoint does not consume an MCSR request. */
export function fetchRateLimitStatus(): Promise<ApiRateLimit> {
  return getJson<ApiRateLimit>("/api/meta/rate-limit", 0);
}

/** Lightweight player summary without match analytics. */
export function fetchPlayerSummary(username: string): Promise<PlayerData> {
  return getJson<PlayerData>(
    `/api/players/${encodeURIComponent(username)}/summary`
  );
}

/** Recent ranked matches with bastion/seed counts. */
export function fetchPlayerMatches(
  username: string,
  query: ProfileQuery = {}
): Promise<MatchListResponse> {
  return getJson<MatchListResponse>(
    `/api/players/${encodeURIComponent(username)}/matches${buildQuery(query)}`
  );
}

/** Single match detail with filtered timeline. */
export function fetchMatchDetail(matchId: string): Promise<MatchDetail> {
  return getJson<MatchDetail>(`/api/matches/${encodeURIComponent(matchId)}`);
}

/** Expanded split timeline for a single run. */
export function fetchRunDetail(
  username: string,
  runId: string,
  query: ProfileQuery = {}
): Promise<RunDetail> {
  return getJson<RunDetail>(
    `/api/players/${encodeURIComponent(username)}/runs/${encodeURIComponent(runId)}${buildQuery(query)}`,
    0
  );
}
