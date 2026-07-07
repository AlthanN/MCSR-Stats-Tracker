import type { ProfileMeta } from "@/lib/types";

export default function NoSeasonDataBanner({ meta }: { meta: ProfileMeta }) {
  return (
    <div className="card border-bad-dim/40 px-5 py-5 text-center">
      <p className="text-sm text-ink">
        No season information found for this user in{" "}
        <span className="text-bad font-semibold">
          Season {meta.selectedSeason}
        </span>
        .
      </p>
      <p className="text-xs text-ink-faint mt-2">
        Try selecting a different season or adjusting the match range. All-time
        career stats are still shown below.
      </p>
    </div>
  );
}
