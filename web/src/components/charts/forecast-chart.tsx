"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/format";

export type ForecastChartPoint = {
  date: string;
  label: string;
  actual?: number | null;
  predicted?: number | null;
  lower80?: number | null;
  upper80?: number | null;
};

type TooltipPayload = { payload?: ForecastChartPoint };

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-lg">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {formatShortDate(point.date)}
      </p>
      <div className="mt-1 space-y-0.5 text-xs">
        {point.actual !== null && point.actual !== undefined ? (
          <p className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-0.5 w-3 bg-ink" /> Actual
            </span>
            <span className="tabular font-medium text-ink">{Math.round(point.actual)}</span>
          </p>
        ) : null}
        {point.predicted !== null && point.predicted !== undefined ? (
          <p className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-0.5 w-3 bg-brand" /> Forecast
            </span>
            <span className="tabular font-medium text-ink">{Math.round(point.predicted)}</span>
          </p>
        ) : null}
        {point.lower80 !== null && point.lower80 !== undefined && point.upper80 ? (
          <p className="flex items-center justify-between gap-4 text-[11px] text-muted">
            <span>80% interval</span>
            <span className="tabular">
              {Math.round(point.lower80)}–{Math.round(point.upper80)}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ForecastChart({
  data,
  stockoutDate,
  height = 300,
  unit = "units",
}: {
  data: ForecastChartPoint[];
  stockoutDate?: string | null;
  height?: number;
  unit?: string;
}) {
  const today = data.find((d) => d.actual != null && d.predicted != null)?.label;
  const chartData = data.map((d) => ({
    ...d,
    band:
      d.upper80 !== null && d.upper80 !== undefined && d.lower80 !== null && d.lower80 !== undefined
        ? Math.max(0, d.upper80 - d.lower80)
        : undefined,
  }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 14, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#eef3f1" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#71847c" }}
            tickLine={false}
            axisLine={{ stroke: "#e4ece8" }}
            minTickGap={34}
            tickFormatter={(value: string) => formatShortDate(value)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#71847c" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#b9ccc5", strokeDasharray: "3 3" }} />
          <Area
            type="monotone"
            dataKey="lower80"
            stackId="band"
            stroke="none"
            fill="transparent"
            fillOpacity={0}
            isAnimationActive={false}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="band"
            stackId="band"
            stroke="none"
            fill="#0f3b2c"
            fillOpacity={0.12}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#10241e"
            strokeWidth={1.9}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#0f3b2c"
            strokeWidth={2.2}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          {today ? (
            <ReferenceLine
              x={today}
              stroke="#9aaea6"
              strokeDasharray="3 3"
              label={{ value: "Today", position: "insideTopRight", fontSize: 9, fill: "#71847c" }}
            />
          ) : null}
          {stockoutDate ? (
            <ReferenceLine
              x={data.find((d) => d.date === stockoutDate)?.label}
              stroke="#b42318"
              strokeDasharray="4 3"
              label={{
                value: "Projected stockout",
                position: "insideTopLeft",
                fontSize: 9,
                fill: "#b42318",
              }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-ink" /> Recorded consumption
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-brand" /> Forecast ({unit}/day)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-brand/10" /> 80% uncertainty interval
        </span>
      </div>
    </div>
  );
}
