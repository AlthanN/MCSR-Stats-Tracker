import Link from "next/link";
import { notFound } from "next/navigation";
import ProfileDashboard from "@/components/ProfileDashboard";
import { fetchPlayerProfile, ApiError } from "@/lib/api";
import type { ProfileQuery } from "@/lib/types";

function parseQuery(
  searchParams: Record<string, string | string[] | undefined>
): ProfileQuery {
  const query: ProfileQuery = {};

  const season = searchParams.season;
  if (typeof season === "string" && season !== "") {
    const parsed = Number(season);
    if (!Number.isNaN(parsed)) query.season = parsed;
  }

  const count = searchParams.count;
  if (typeof count === "string" && count !== "") {
    const parsed = Number(count);
    if (!Number.isNaN(parsed)) query.count = parsed;
  }

  return query;
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { username } = params;
  const query = parseQuery(searchParams);

  try {
    const profile = await fetchPlayerProfile(username, query);
    return <ProfileDashboard username={username} profile={profile} />;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-bad text-sm">
          Couldn&apos;t load stats for &quot;{username}&quot; right now.
        </p>
        <p className="text-ink-faint text-xs max-w-sm">
          {err instanceof ApiError
            ? err.message
            : "The stats backend may be unreachable. Try again in a moment."}
        </p>
        <Link
          href="/"
          className="mt-2 text-xs text-green border border-green-muted rounded-sm px-3 py-1.5 hover:bg-green hover:text-bg transition-colors"
        >
          back to search
        </Link>
      </div>
    );
  }
}
