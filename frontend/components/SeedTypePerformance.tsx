"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { SeedTypePerformance as SeedTypePerf } from "@/lib/types";
import { formatWinRate, formatSeedType } from "@/lib/format";
import { SectionHeading } from "./CheckpointSection";

export default function SeedTypePerformance({
  seedTypes,
}: {
  seedTypes: SeedTypePerf[];
}) {
  const chartData = seedTypes.map((s) => ({
    name: formatSeedType(s.seedType),
    rawName: s.seedType,
    impactSeconds: s.avgImpactMs !== null ? s.avgImpactMs / 1000 : 0,
    winRate: s.winRate,
    runs: s.runsEncountered,
  }));

  return (
    <section>
      <SectionHeading
        title="Seed Type Performance"
        sub="avg time impact vs. runs without that structure"
      />
      <div className="card p-4">
        {chartData.length === 0 ? (
          <p className="text-ink-faint text-xs py-8 text-center">
            no seed type data yet
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#2A2E2A" vertical={false} />
                <ReferenceLine y={0} stroke="#2F4A2F" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8A8F8A", fontSize: 10 }}
                  axisLine={{ stroke: "#2A2E2A" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8A8F8A", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2E2A" }}
                  tickLine={false}
                  tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}s`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(85,255,85,0.06)" }}
                  contentStyle={{
                    background: "#99A0A3",
                    border: "1px solid #2F4A2F",
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "var(--font-jbm)",
                    
                  }}
                  labelStyle={{ color: "#E8E8E0" }}
                  formatter={(value: number) => [
                    `${value > 0 ? "+" : ""}${value.toFixed(2)}s`,
                    "avg impact",
                  ]}
                />
                <Bar dataKey="impactSeconds" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.impactSeconds <= 0 ? "#55FF55" : "#FF5555"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            {chartData.map((s) => (
              <div
                key={s.rawName}
                className="bg-surface-raised/50 border border-border rounded-sm px-3 py-2"
              >
                <div className="text-ink font-medium text-xs capitalize">
                  {s.name}
                </div>
                <div className="text-ink-faint text-[10px] mt-0.5">
                  {s.runs} runs · {formatWinRate(s.winRate)} wr
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
