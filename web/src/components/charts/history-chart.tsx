"use client";

import { useId } from "react";
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
  color = "#492415",
  unit = "units",
}: {
  data: { date: string; label: string; value: number }[];
  height?: number;
  color?: string;
  unit?: string;
}) {
  const gradientId = `history-fill-${useId().replaceAll(":", "")}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#bfb3ab" strokeOpacity={0.55} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#6c4833" }}
            tickLine={false}
            axisLine={{ stroke: "#bcb1aa" }}
            minTickGap={30}
            tickFormatter={(value: string) => formatShortDate(value)}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#6c4833" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`
            }
          />
          <Tooltip
            cursor={{ stroke: "#a4988e", strokeDasharray: "3 3" }}
            content={(props) => {
              const active = props.active;
              const payload = props.payload as
                | readonly { payload?: { date: string; value: number } }[]
                | undefined;
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload;
              if (!point) return null;
              return (
                <div className="rounded-xl border border-line bg-panel px-3 py-2 shadow-[0_12px_28px_-20px_rgba(25,15,10,0.6)]">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted">
                    Week of {formatShortDate(point.date)}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-ink">
                    {Math.round(point.value).toLocaleString()} {unit}
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
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
