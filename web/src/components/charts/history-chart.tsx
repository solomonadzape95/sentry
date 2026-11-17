"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/format";

export function HistoryChart({
  data,
  height = 230,
  color = "#0d7666",
  unit = "units",
}: {
  data: { date: string; label: string; value: number }[];
  height?: number;
  color?: string;
  unit?: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id="history-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eef3f1" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#71847c" }}
            tickLine={false}
            axisLine={{ stroke: "#e4ece8" }}
            minTickGap={30}
            tickFormatter={(value: string) => formatShortDate(value)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#71847c" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`)}
          />
          <Tooltip
            cursor={{ stroke: "#b9ccc5", strokeDasharray: "3 3" }}
            content={(props) => {
              const active = props.active;
              const payload = props.payload as
                | readonly { payload?: { date: string; value: number } }[]
                | undefined;
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-lg">
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    Week of {formatShortDate(p.date)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-ink">
                    {Math.round(p.value).toLocaleString()} {unit}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#history-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
