/** Formats milliseconds as MM:SS.mmm — standard speedrun split format. */
export function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const totalMs = Math.round(ms);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(
    millis
  ).padStart(3, "0")}`;
}

/** Signed delta, e.g. "-1.240s" or "+0.890s". */
export function formatDelta(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const sign = ms <= 0 ? "-" : "+";
  const seconds = Math.abs(ms) / 1000;
  return `${sign}${seconds.toFixed(3)}s`;
}

/** Coefficient of variation — lower is more consistent. */
export function formatConsistency(cv: number | null | undefined): string {
  if (cv === null || cv === undefined) return "—";
  return `${(cv * 100).toFixed(1)}%`;
}

export function formatElo(elo: number | null | undefined): string {
  if (elo === null || elo === undefined) return "—";
  return Math.round(elo).toString();
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export function formatCountry(code: string | null | undefined): string {
  if (!code) return "—";
  return code.toUpperCase();
}

export function formatWinRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function formatSeedType(seed: string | null | undefined): string {
  if (!seed) return "—";
  return seed.replace(/_/g, " ").toLowerCase();
}

export function avatarUrl(username: string | null | undefined): string {
  const name = encodeURIComponent(username ?? "steve");
  return `https://mc-heads.net/avatar/${name}/64`;
}

export function computeCompletionRate(
  completed: number,
  total: number
): string {
  if (total <= 0) return "—";
  return `${((completed / total) * 100).toFixed(1)}%`;
}

export function computeWinRate(
  wins: number | null | undefined,
  losses: number | null | undefined,
  forfeits?: number | null | undefined
): string {
  const w = wins ?? 0;
  const l = Math.max(0, (losses ?? 0) - (forfeits ?? 0));
  const total = w + l;
  if (total <= 0) return "—";
  return `${((w / total) * 100).toFixed(1)}%`;
}

/** draws = playedMatches - wins - losses */
export function computeDraws(
  played: number | null | undefined,
  wins: number | null | undefined,
  losses: number | null | undefined
): string {
  const p = played ?? 0;
  const w = wins ?? 0;
  const l = losses ?? 0;
  if (p <= 0) return "—";
  return String(Math.max(0, p - w - l));
}

/** playTime from MCSR is in milliseconds. */
export function formatPlayTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)}m`;
  if (hours < 100) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours)}h`;
}
