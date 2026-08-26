"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CHECKPOINT_ORDER,
  CHECKPOINT_LABELS,
  CHECKPOINT_SHORT_LABELS,
  type CheckpointStats,
} from "@/lib/types";
import { formatTime, formatConsistency } from "@/lib/format";

export default function CheckpointSection({
  checkpoints,
}: {
  checkpoints: CheckpointStats;
}) {
  const chartData = CHECKPOINT_ORDER.map((key) => ({
    name: CHECKPOINT_SHORT_LABELS[key],
    fullName: CHECKPOINT_LABELS[key],
    avgMs: checkpoints[key]?.average ?? 0,
    bestMs: checkpoints[key]?.best ?? 0,
  })).filter((d) => d.avgMs > 0);

  return (
    <section>
      <SectionHeading title="Key Checkpoints" sub="run progression, in order" />

      <div className="relative card px-6 py-8 overflow-x-auto">
        

        <div className="relative flex justify-between min-w-[720px] gap-1">
          {CHECKPOINT_ORDER.map((key) => {
            const stat = checkpoints[key];
            const consistencyValue = stat?.consistency ?? null;
            const isTight =
              consistencyValue !== null && consistencyValue < 0.08;

            return (
              <div
                key={key}
                className="flex flex-col items-center text-center w-full min-w-0"
              >
                <div className="text-[10px] tracking-wide text-ink-muted mb-3 min-h-[2.5rem] flex items-end leading-tight px-0.5">
                  {CHECKPOINT_LABELS[key]}
                </div>

                <div
                  className={[
                    "w-3 h-3 rounded-full border-2 mb-3 z-10",
                    isTight
                      ? "bg-green border-green shadow-glow"
                      : "bg-surface-raised border-border-bright",
                  ].join(" ")}
                />

                <div className="font-bold text-ink tabular text-sm">
                  {formatTime(stat?.average)}
                </div>
                <div className="text-[10px] text-gold-dim tabular mt-1">
                  best {formatTime(stat?.best)}
                </div>
                <div className="text-[10px] text-ink-faint tabular mt-0.5">
                  cv {formatConsistency(stat?.consistency)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="card mt-3 p-4">
          <div className="text-[10px] text-ink-faint tracking-widest mb-3">
            CHECKPOINT PROGRESSION (AVG)
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8A8F8A", fontSize: 10 }}
                  axisLine={{ stroke: "#2A2E2A" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8A8F8A", fontSize: 10 }}
                  axisLine={{ stroke: "#2A2E2A" }}
                  tickLine={false}
                  tickFormatter={(v) => formatTime(v)}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1A1A1A",
                    border: "1px solid #2F4A2F",
                    borderRadius: 2,
                    fontSize: 11,
                    fontFamily: "var(--font-jbm)",
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName ?? ""
                  }
                  formatter={(value: number) => [formatTime(value), "avg"]}
                />
                <Line
                  type="monotone"
                  dataKey="avgMs"
                  stroke="#55FF55"
                  strokeWidth={2}
                  dot={{ fill: "#55FF55", r: 3 }}
                  activeDot={{ fill: "#FFD700", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="bestMs"
                  stroke="#FFD700"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}

export function SectionHeading({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-sm font-bold tracking-widest text-ink uppercase">
        {title}
      </h2>
      {sub && <span className="text-[11px] text-ink-faint">{sub}</span>}
    </div>
  );
}
