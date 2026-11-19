"use client";

import { useMemo, useState } from "react";
import { formatPct } from "@/lib/format";
import { useElementWidth } from "@/components/charts/use-measure";

export type ModelPoint = {
  id: string;
  model: string;
  label: string;
  wape: number;
  mae: number;
  notes: string;
  best: boolean;
  baseline: boolean;
};

export function ModelScatter({ points }: { points: ModelPoint[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<string | null>(null);
  const height = 310;

  const chart = useMemo(() => {
    if (!width || points.length === 0) return null;
    const pad = { top: 24, right: 24, bottom: 38, left: 46 };
    const innerW = Math.max(1, width - pad.left - pad.right);
    const innerH = Math.max(1, height - pad.top - pad.bottom);
    const xMax = Math.max(0.32, ...points.map((point) => point.wape + 0.035));
    const yMax = Math.max(6, ...points.map((point) => point.mae + 0.8));
    const x = (value: number) => pad.left + (value / xMax) * innerW;
    const y = (value: number) => pad.top + (1 - value / yMax) * innerH;
    return { pad, innerW, innerH, xMax, yMax, x, y };
  }, [points, width]);

  const hoveredPoint = points.find((point) => point.id === hovered) ?? null;

  return (
    <div ref={ref} className="relative w-full">
      {chart ? (
        <svg
          width={width}
          height={height}
          className="block touch-pan-y"
          role="img"
          aria-label="Model comparison scatter plot: WAPE versus MAE. Lower and further left is better."
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <g key={`x-${fraction}`}>
              <line
                x1={chart.x(chart.xMax * fraction)}
                x2={chart.x(chart.xMax * fraction)}
                y1={chart.pad.top}
                y2={height - chart.pad.bottom}
                stroke="#bfb3ab"
                strokeOpacity="0.45"
                strokeDasharray="2 6"
              />
              <text
                x={chart.x(chart.xMax * fraction)}
                y={height - chart.pad.bottom + 17}
                textAnchor="middle"
                fill="#6c4833"
                fontSize="9"
              >
                {formatPct(chart.xMax * fraction, 0)}
              </text>
            </g>
          ))}

          {[0, 0.33, 0.66, 1].map((fraction) => (
            <g key={`y-${fraction}`}>
              <line
                x1={chart.pad.left}
                x2={width - chart.pad.right}
                y1={chart.y(chart.yMax * fraction)}
                y2={chart.y(chart.yMax * fraction)}
                stroke="#bfb3ab"
                strokeOpacity="0.45"
                strokeDasharray="2 6"
              />
              <text
                x={chart.pad.left - 9}
                y={chart.y(chart.yMax * fraction) + 3}
                textAnchor="end"
                fill="#6c4833"
                fontSize="9"
              >
                {(chart.yMax * fraction).toFixed(1)}
              </text>
            </g>
          ))}

          <text
            x={chart.pad.left + chart.innerW / 2}
            y={height - 5}
            textAnchor="middle"
            fill="#6c4833"
            fontSize="9"
            letterSpacing="1"
          >
            WAPE · LOWER IS BETTER
          </text>
          <text
            x={12}
            y={chart.pad.top + chart.innerH / 2}
            textAnchor="middle"
            fill="#6c4833"
            fontSize="9"
            letterSpacing="1"
            transform={`rotate(-90 12 ${chart.pad.top + chart.innerH / 2})`}
          >
            MAE
          </text>

          {points.some((point) => point.baseline) ? (
            <g>
              <line
                x1={chart.x(points.find((point) => point.baseline)?.wape ?? 0)}
                x2={chart.x(points.find((point) => point.baseline)?.wape ?? 0)}
                y1={chart.pad.top}
                y2={height - chart.pad.bottom}
                stroke="#8b2f1f"
                strokeOpacity="0.45"
                strokeDasharray="4 5"
              />

            </g>
          ) : null}

          {points.map((point, index) => {
            const cx = chart.x(point.wape);
            const cy = chart.y(point.mae);
            const active = hovered === point.id;
            return (
              <g key={point.id}>
                {point.best ? (
                  <circle cx={cx} cy={cy} r="10" fill="none" stroke="#3d5a3f" strokeOpacity="0.4" />
                ) : null}
                <circle
                  cx={cx}
                  cy={cy}
                  r={active ? 7 : 6}
                  fill={point.best ? "#190f0a" : point.baseline ? "#8b2f1f" : "#8e775c"}
                  stroke="#e3dcd7"
                  strokeWidth="2"
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.label}: WAPE ${formatPct(point.wape, 1)}, MAE ${point.mae.toFixed(2)}`}
                  className="cursor-pointer outline-none focus-visible:stroke-ink focus-visible:stroke-2"
                  onMouseEnter={() => setHovered(point.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(point.id)}
                  onBlur={() => setHovered(null)}
                />
                <text
                  x={cx}
                  y={cy + 2.5}
                  textAnchor="middle"
                  fill="#e3dcd7"
                  fontSize="7"
                  fontWeight="700"
                  className="pointer-events-none"
                >
                  {index + 1}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="h-[310px] animate-pulse rounded-xl bg-ink/[0.035]" aria-hidden="true" />
      )}

      <div className="mt-2 grid gap-x-5 gap-y-1.5 border-t border-line px-1 pt-3 sm:grid-cols-2">
        {points.map((point, index) => (
          <div key={point.id} className="flex items-center gap-2 text-[8.5px]">
            <span
              className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[6.5px] font-semibold text-bone"
              style={{
                background: point.best ? "#190f0a" : point.baseline ? "#8b2f1f" : "#8e775c",
              }}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{point.label}</span>
            <span className="tabular shrink-0 text-muted">
              {formatPct(point.wape, 1)} / {point.mae.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 px-1 text-[8px] text-muted">
        WAPE / MAE · lower and further left is better.
      </p>

      {hoveredPoint ? (
        <div className="pointer-events-none absolute right-3 top-3 w-[190px] rounded-xl border border-line bg-panel/95 p-3 shadow-[0_16px_35px_-24px_rgba(25,15,10,0.7)] backdrop-blur">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
            {hoveredPoint.best ? "Selected · best backtest" : hoveredPoint.baseline ? "Baseline" : "Benchmark"}
          </p>
          <p className="mt-1 text-[12px] font-medium text-ink">{hoveredPoint.label}</p>
          <div className="mt-2 flex items-center gap-4 border-t border-line pt-2">
            <div>
              <p className="text-[8px] uppercase tracking-[0.1em] text-muted">WAPE</p>
              <p className="tabular mt-0.5 text-[14px] font-medium text-ink">
                {formatPct(hoveredPoint.wape, 1)}
              </p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-[0.1em] text-muted">MAE</p>
              <p className="tabular mt-0.5 text-[14px] font-medium text-ink">
                {hoveredPoint.mae.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-muted">{hoveredPoint.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
