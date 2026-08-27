import type { SplitStat } from "@/lib/types";
import { formatTime, formatConsistency } from "@/lib/format";
import { SectionHeading } from "./CheckpointSection";

export default function SplitBreakdownTable({
  splits,
  matchCount,
  bestFromSeasonPb,
}: {
  splits: SplitStat[];
  matchCount?: number;
  bestFromSeasonPb?: boolean;
}) {
  return (
    <section>
      <SectionHeading
        title="Full Split Breakdown"
        sub={`${splits.length} splits tracked`}
      />
      <p className="text-[11px] text-ink-faint leading-relaxed mb-3">
        {bestFromSeasonPb ? (
          <>
            Best is from this season&apos;s PB run. Average, worst, and
            consistency use the last{" "}
            <span className="text-ink-muted">{matchCount}</span> ranked
            matches fetched — not the full season.
          </>
        ) : (
          <>
            Average, worst, and consistency are based on the last{" "}
            <span className="text-ink-muted">{matchCount}</span> ranked matches
            fetched for this season.
          </>
        )}
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-border text-[10px] tracking-widest text-ink-muted uppercase">
              <th className="text-left font-medium px-4 py-3">Split</th>
              <th className="text-right font-medium px-4 py-3">Avg</th>
              <th className="text-right font-medium px-4 py-3">Best</th>
              <th className="text-right font-medium px-4 py-3">Worst</th>
              <th className="text-right font-medium px-4 py-3">Consistency</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((s, i) => {
              let skip = s.splitName != "Death"
              const isTight =
                s.consistency !== null && s.consistency < 0.08;
              return (
                <tr
                  key={s.splitName}
                  className={[
                    "tabular",
                    i % 2 === 1 ? "bg-surface-raised/40" : "",
                    "hover:bg-surface-raised transition-colors",
                  ].join(" ")}
                >
                  <td className="px-4 py-2.5 text-ink font-medium">
                    <span className="inline-flex items-center gap-2">
                      {isTight && skip && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-green shadow-glow"
                          aria-label="consistent split"
                        />
                      )}
                      {s.splitName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-ink">
                    {formatTime(s.average)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gold">
                    {formatTime(s.best)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-bad-dim">
                    {formatTime(s.worst)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-ink-muted">
                    {formatConsistency(s.consistency)}
                  </td>
                </tr>
              );
            })}
            {splits.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-ink-faint text-xs"
                >
                  no split data for this player yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
