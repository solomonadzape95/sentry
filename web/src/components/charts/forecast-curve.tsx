"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import { useElementWidth } from "@/components/charts/use-measure";

export type CurvePoint = {
  date: string;
  actual?: number | null;
  predicted?: number | null;
  lower80?: number | null;
  upper80?: number | null;
};

type HoverPoint = {
  point: CurvePoint;
  x: number;
  y: number;
};

const COLORS = {
  actual: "#190f0a",
  forecast: "#8e775c",
  band: "#ccb7a3",
  grid: "#bfb3ab",
  label: "#6c4833",
  today: "#a4988e",
  stockout: "#8b2f1f",
};

function formatTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

export function ForecastCurve({
  data,
  unit = "units",
  stockoutDate,
  height = 248,
  className,
}: {
  data: CurvePoint[];
  unit?: string;
  stockoutDate?: string | null;
  height?: number;
  className?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<HoverPoint | null>(null);

  const chart = useMemo(() => {
    if (!data.length || width <= 0) return null;

    const pad = { top: 18, right: 12, bottom: 26, left: 38 };
    const innerW = Math.max(1, width - pad.left - pad.right);
    const innerH = Math.max(1, height - pad.top - pad.bottom);
    const values = data.flatMap((point) => [
      point.actual ?? 0,
      point.predicted ?? 0,
      point.lower80 ?? 0,
      point.upper80 ?? 0,
    ]);
    const max = Math.max(...values, 1);
    const yMax = niceCeil(max);
    const xAt = (index: number) =>
      pad.left + (index / Math.max(1, data.length - 1)) * innerW;
    const yAt = (value: number) =>
      pad.top + (1 - Math.min(1, Math.max(0, value / yMax))) * innerH;

    const actual = data
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => point.actual !== null && point.actual !== undefined);
    const forecast = data
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => point.predicted !== null && point.predicted !== undefined);

    const lastActual = actual.at(-1);
    const forecastPath = [
      ...(lastActual
        ? [{ point: { ...lastActual.point, predicted: lastActual.point.actual }, index: lastActual.index }]
        : []),
      ...forecast,
    ]
      .map(({ point, index }, position) =>
        `${position === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(point.predicted ?? 0).toFixed(1)}`,
      )
      .join(" ");

    const actualPath = actual
      .map(
        ({ point, index }, position) =>
          `${position === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(point.actual ?? 0).toFixed(1)}`,
      )
      .join(" ");

    const band =
      forecast.length > 1
        ? [
            ...forecast.map(
              ({ point, index }, position) =>
                `${position === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(point.upper80 ?? 0).toFixed(1)}`,
            ),
            ...forecast
              .slice()
              .reverse()
              .map(
                ({ point, index }) =>
                  `L${xAt(index).toFixed(1)},${yAt(point.lower80 ?? 0).toFixed(1)}`,
              ),
            "Z",
          ].join(" ")
        : "";

    const firstForecast = forecast[0];
    const todayX = lastActual ? xAt(lastActual.index) : null;
    const stockoutIndex = stockoutDate
      ? data.findIndex((point) => point.date.slice(0, 10) === stockoutDate.slice(0, 10))
      : -1;

    const xTicks = [0, 0.34, 0.67, 1].map((fraction) => {
      const index = Math.round((data.length - 1) * fraction);
      return {
        x: xAt(index),
        label: formatShortDate(data[index]?.date),
      };
    });

    const yTicks = [0, 0.5, 1].map((fraction) => ({
      y: pad.top + (1 - fraction) * innerH,
      label: formatTick(yMax * fraction),
    }));

    return {
      pad,
      innerH,
      innerW,
      yMax,
      xAt,
      yAt,
      actualPath,
      forecastPath,
      band,
      todayX,
      stockoutX: stockoutIndex >= 0 ? xAt(stockoutIndex) : null,
      xTicks,
      yTicks,
      lastActual,
      firstForecast,
      lastPoint: data.at(-1),
    };
  }, [data, height, stockoutDate, width]);

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!chart || !data.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const fraction = (relativeX - chart.pad.left) / chart.innerW;
    const index = Math.round(fraction * (data.length - 1));
    const clamped = Math.min(data.length - 1, Math.max(0, index));
    const point = data[clamped];
    setHover({ point, x: chart.xAt(clamped), y: chart.yAt(point.actual ?? point.predicted ?? 0) });
  }

  function handleKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (!chart || !data.length) return;
    const currentIndex = hover ? data.findIndex((point) => point.date === hover.point.date) : -1;

    if (event.key === "Escape") {
      setHover(null);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = Math.min(
      data.length - 1,
      Math.max(0, (currentIndex < 0 ? data.length - 1 : currentIndex) + direction),
    );
    const point = data[nextIndex];
    setHover({
      point,
      x: chart.xAt(nextIndex),
      y: chart.yAt(point.actual ?? point.predicted ?? 0),
    });
  }

  const tooltipLeft =
    hover && chart
      ? Math.min(Math.max(8, hover.x - 86), Math.max(8, width - 184))
      : 0;

  return (
    <div ref={ref} className={cn("relative w-full", className)} style={{ height }}>
      {width > 0 && chart ? (
        <svg
          width={width}
          height={height}
          className="block touch-pan-y"
          role="img"
          aria-label={`Demand history and forecast. ${data.length} points, ${unit}.`}
          tabIndex={0}
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={handleKey}
          onBlur={() => setHover(null)}
        >
          {chart.yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={chart.pad.left}
                x2={width - chart.pad.right}
                y1={tick.y}
                y2={tick.y}
                stroke={COLORS.grid}
                strokeWidth="1"
                strokeDasharray="2 6"
                opacity="0.65"
              />
              <text
                x={chart.pad.left - 8}
                y={tick.y + 3}
                textAnchor="end"
                fill={COLORS.label}
                fontSize="9"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {chart.xTicks.map((tick) => (
            <text
              key={tick.label + tick.x}
              x={tick.x}
              y={height - 7}
              textAnchor={
                tick.x <= chart.pad.left + 4
                  ? "start"
                  : tick.x >= width - chart.pad.right - 4
                    ? "end"
                    : "middle"
              }
              fill={COLORS.label}
              fontSize="9"
            >
              {tick.label}
            </text>
          ))}

          {chart.band ? (
            <path d={chart.band} fill={COLORS.band} opacity="0.38" className="chart-fade-in" />
          ) : null}

          <path
            d={chart.actualPath}
            fill="none"
            stroke={COLORS.actual}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="chart-line-draw"
          />

          {chart.forecastPath ? (
            <path
              d={chart.forecastPath}
              fill="none"
              stroke={COLORS.forecast}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="5 4"
              className="chart-fade-in"
            />
          ) : null}

          {chart.todayX !== null ? (
            <g>
              <line
                x1={chart.todayX}
                x2={chart.todayX}
                y1={chart.pad.top - 3}
                y2={height - chart.pad.bottom}
                stroke={COLORS.today}
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <text
                x={chart.todayX + 5}
                y={chart.pad.top - 6}
                fill={COLORS.label}
                fontSize="8.5"
                fontWeight="500"
              >
                Today
              </text>
            </g>
          ) : null}

          {chart.stockoutX !== null ? (
            <g>
              <line
                x1={chart.stockoutX}
                x2={chart.stockoutX}
                y1={chart.pad.top - 2}
                y2={height - chart.pad.bottom}
                stroke={COLORS.stockout}
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.8"
              />
              <circle cx={chart.stockoutX} cy={chart.pad.top + 2} r="3" fill={COLORS.stockout} />
              <text
                x={
                  chart.stockoutX > width - 78
                    ? chart.stockoutX - 6
                    : chart.stockoutX + 6
                }
                y={
                  chart.todayX !== null && Math.abs(chart.stockoutX - chart.todayX) < 74
                    ? chart.pad.top + 12
                    : chart.pad.top - 6
                }
                textAnchor={chart.stockoutX > width - 78 ? "end" : "start"}
                fill={COLORS.stockout}
                fontSize="8.5"
                fontWeight="600"
              >
                Stockout
              </text>
            </g>
          ) : null}

          {hover ? (
            <g>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={chart.pad.top}
                y2={height - chart.pad.bottom}
                stroke={COLORS.actual}
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity="0.28"
              />
              <circle cx={hover.x} cy={hover.y} r="3.4" fill={COLORS.actual} stroke="#e3dcd7" strokeWidth="2" />
            </g>
          ) : null}
        </svg>
      ) : (
        <div className="h-full w-full animate-pulse rounded-xl bg-ink/[0.035]" aria-hidden="true" />
      )}

      {hover ? (
        <div
          className="pointer-events-none absolute top-1 z-10 w-[176px] rounded-xl border border-line bg-panel/95 p-2.5 shadow-[0_16px_35px_-24px_rgba(25,15,10,0.7)] backdrop-blur"
          style={{ left: tooltipLeft }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
              {formatShortDate(hover.point.date)}
            </p>
            {hover.point.predicted !== null && hover.point.predicted !== undefined ? (
              <span className="text-[8px] uppercase tracking-[0.1em] text-clay">Forecast</span>
            ) : null}
          </div>
          {(hover.point.actual !== null && hover.point.actual !== undefined) ||
          (hover.point.predicted !== null && hover.point.predicted !== undefined) ? (
            <p className="mt-1.5 font-display text-[21px] leading-none tracking-[-0.03em] text-ink">
              {Math.round(hover.point.actual ?? hover.point.predicted ?? 0)}
              <span className="ml-1 text-[9px] font-medium tracking-normal text-muted">{unit}</span>
            </p>
          ) : null}
          {hover.point.lower80 !== null &&
          hover.point.lower80 !== undefined &&
          hover.point.upper80 !== null &&
          hover.point.upper80 !== undefined ? (
            <p className="mt-1.5 text-[9px] text-muted">
              80% interval {Math.round(hover.point.lower80)}–{Math.round(hover.point.upper80)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function niceCeil(value: number): number {
  if (value <= 10) return Math.ceil(value);
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}
