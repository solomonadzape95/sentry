import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StockRow = {
  name: string;
  meta: string;
  days: number | null;
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
};

const riskTone: Record<StockRow["risk"], { label: string; className: string }> = {
  CRITICAL: { label: "Act now", className: "bg-danger-soft text-danger" },
  HIGH: { label: "Watch", className: "bg-warn-soft text-warn" },
  MEDIUM: { label: "Watch", className: "bg-warn-soft text-warn" },
  LOW: { label: "Covered", className: "bg-ok-soft text-ok" },
};

export function StockHealthCard({
  rows,
  facility,
  date,
}: {
  rows: StockRow[];
  facility: string;
  date: string;
}) {
  return (
    <div className="relative w-full min-w-0 rounded-[12px] border border-line bg-surface p-4 shadow-[0_30px_60px_-38px_rgba(28,28,24,0.55)] sm:p-5">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
        <div>
          <p className="label text-muted">Stock health</p>
          <p className="mt-1.5 text-[14px] font-medium tracking-[-0.01em] text-ink">{facility}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-none bg-sage/60 px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink/70">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          Demo · {date}
        </span>
      </div>

      <div className="divide-y divide-line">
        {rows.map((row) => {
          const tone = riskTone[row.risk];
          return (
            <div key={row.name} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-ink">{row.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted">{row.meta}</p>
              </div>
              <div className="text-right">
                <p className="tabular text-[12px] font-semibold text-ink">
                  {row.days === null ? "N/A" : `${Math.max(0, Math.floor(row.days))}d`}
                </p>
                <p className="text-[9px] text-muted">of cover</p>
              </div>
              <span
                className={cn(
                  "inline-flex w-[64px] justify-center rounded-none px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.08em]",
                  tone.className,
                )}
              >
                {tone.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[8px] bg-canvas/80 px-3 py-2">
        <span className="text-[10px] text-muted">Batch-level · FEFO · expiry aware</span>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-ink underline decoration-line-strong decoration-1 underline-offset-4 hover:decoration-ink"
        >
          Inventory
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export function TransferCard({
  from,
  to,
  quantity,
  medicine,
  shelfLife,
}: {
  from: string;
  to: string;
  quantity: number;
  medicine: string;
  shelfLife: string;
}) {
  return (
    <div className="w-full min-w-0 max-w-[330px] rounded-[12px] border border-line bg-surface p-4 shadow-[0_26px_50px_-30px_rgba(28,28,24,0.6)]">
      <div className="flex items-center justify-between">
        <p className="label text-muted">Recommended transfer</p>
        <span className="inline-flex items-center gap-1 rounded-none bg-butter px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink">
          Needs approval
        </span>
      </div>
      <p className="mt-3 font-display text-[38px] leading-none tracking-[-0.02em] text-ink">
        {quantity}
        <span className="ml-1 font-sans text-[11px] font-medium tracking-normal text-muted">
          tablets
        </span>
      </p>
      <p className="mt-1 text-[11px] text-body">{medicine}</p>

      <div className="mt-3 space-y-1.5 rounded-[8px] bg-canvas/80 p-2.5 text-[10px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted">From</span>
          <span className="truncate text-right font-medium text-ink">{from}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted">To</span>
          <span className="truncate text-right font-medium text-ink">{to}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted">Shelf life</span>
          <span className="text-right font-medium text-ink">{shelfLife}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[9px] text-muted">
          <ShieldDot />
          Batch verified
        </span>
        <Link
          href="/transfers"
          className="inline-flex h-8 items-center gap-1.5 bg-ink px-3 text-[10px] font-medium text-paper transition-colors hover:bg-brand"
        >
          Review
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function ShieldDot() {
  return (
    <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-ok-soft">
      <Check className="h-2.5 w-2.5 text-ok" strokeWidth={3} />
    </span>
  );
}

export function ForecastCard({
  facility,
  medicine,
  points,
  actuals,
  daysToStockout,
}: {
  facility: string;
  medicine: string;
  points: { predicted: number; lower80: number; upper80: number }[];
  actuals: number[];
  daysToStockout: number;
}) {
  const slice = points.slice(0, 21);
  const hist = actuals.slice(-18);
  while (hist.length > 1 && hist[0] === 0) hist.shift();
  const W = 560;
  const H = 210;
  const padX = 8;
  const padTop = 14;
  const padBottom = 24;
  const total = hist.length + slice.length;
  const max = Math.max(
    ...hist,
    ...slice.map((p) => p.upper80),
    1,
  );
  const min = Math.min(...hist, ...slice.map((p) => p.lower80), 0);
  const x = (i: number) => padX + (i / Math.max(1, total - 1)) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min || 1)) * (H - padTop - padBottom);

  const band = [
    ...slice.map((p, i) => `${i === 0 ? "M" : "L"}${x(hist.length + i)},${y(p.upper80)}`),
    ...slice
      .slice()
      .reverse()
      .map((p, i) => `L${x(hist.length + slice.length - 1 - i)},${y(p.lower80)}`),
    "Z",
  ].join(" ");

  const forecastPath = slice
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(hist.length + i)},${y(p.predicted)}`)
    .join(" ");
  const actualPath = hist
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`)
    .join(" ");

  return (
    <div className="w-full min-w-0 rounded-[12px] border border-line bg-surface p-4 shadow-[0_30px_60px_-38px_rgba(28,28,24,0.5)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label text-muted">Demand vs forecast</p>
          <p className="mt-1.5 text-[14px] font-medium tracking-[-0.01em] text-ink">
            {medicine}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">{facility}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-none bg-warn-soft px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-warn">
          <Clock3 className="h-3 w-3" />
          {daysToStockout} days of cover
        </span>
      </div>

      <div className="mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[190px] w-full"
          role="img"
          aria-label="Demand history with a 30-day forecast and an 80 percent uncertainty band"
        >
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={padX}
              x2={W - padX}
              y1={padTop + t * (H - padTop - padBottom)}
              y2={padTop + t * (H - padTop - padBottom)}
              stroke="#e2ded2"
              strokeWidth="1"
              strokeDasharray="2 5"
            />
          ))}
          <path d={band} fill="#a6dff0" opacity="0.5" />
          <path d={actualPath} fill="none" stroke="#1c1c18" strokeWidth="2" />
          <path d={forecastPath} fill="none" stroke="#2e6a82" strokeWidth="2" strokeDasharray="4 4" />
          <line
            x1={x(hist.length - 1)}
            x2={x(hist.length - 1)}
            y1={padTop}
            y2={H - padBottom}
            stroke="#8c8779"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <circle cx={x(hist.length - 1)} cy={y(hist[hist.length - 1] ?? 0)} r="3" fill="#1c1c18" />
          <text x={x(hist.length - 1) + 6} y={H - 8} fontSize="8" fill="#6f6d64">
            Today
          </text>
          <text x={W - padX} y={H - 8} fontSize="8" fill="#6f6d64" textAnchor="end">
            +30 days
          </text>
        </svg>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[9px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-4 bg-ink" />
          Actual issue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-4 border-t border-dashed border-sky-ink" />
          Forecast
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 bg-sky/60" />
          80% interval
        </span>
        <Link
          href="/forecasts"
          className="ml-auto inline-flex items-center gap-1 font-medium text-ink hover:underline"
        >
          Full forecast
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export function CoverCard({
  before,
  after,
  medicine,
}: {
  before: number;
  after: number;
  medicine: string;
}) {
  const max = Math.max(before, after, 1);
  return (
    <div className="w-full min-w-0 max-w-[330px] rounded-[12px] border border-line bg-surface p-4 shadow-[0_24px_45px_-30px_rgba(28,28,24,0.5)]">
      <p className="label text-muted">Days of cover</p>
      <div className="mt-3 flex items-end gap-3">
        <p className="font-display text-[46px] leading-none tracking-[-0.02em] text-ink">
          {before}
        </p>
        <ArrowRight className="mb-2 h-4 w-4 text-muted" />
        <p className="font-display text-[46px] leading-none tracking-[-0.02em] text-ok">
          {after}
        </p>
        <span className="mb-1.5 text-[9px] text-muted">days</span>
      </div>
      <p className="mt-1 text-[10px] text-body">{medicine}</p>

      <div className="mt-4 space-y-2">
        <Bar value={before} max={max} label="Before transfer" tone="bg-ink/25" />
        <Bar value={after} max={max} label="After receipt" tone="bg-ok/70" />
      </div>
      <p className="mt-3 border-t border-line pt-2 text-[9px] leading-relaxed text-muted">
        Recalculated from confirmed stock and the live forecast.
      </p>
    </div>
  );
}

function Bar({
  value,
  max,
  label,
  tone,
}: {
  value: number;
  max: number;
  label: string;
  tone: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] text-muted">
        <span>{label}</span>
        <span className="tabular">{value}d</span>
      </div>
      <div className="mt-1 h-2 w-full bg-canvas">
        <div className={cn("h-2", tone)} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

export function NetworkMoveCard({
  from,
  to,
  quantity,
  medicine,
  shelfLife,
  days,
}: {
  from: string;
  to: string;
  quantity: number;
  medicine: string;
  shelfLife: string;
  days: number;
}) {
  const initials = (name: string) => {
    const words = name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean);
    const acronym = words.find((word) => /^[A-Z]{2,4}$/.test(word));
    if (acronym) return acronym;
    return words
      .filter((word) => word.length > 2)
      .slice(0, 3)
      .map((word) => word[0]?.toUpperCase())
      .join("");
  };

  return (
    <div className="w-full min-w-0 rounded-[12px] border border-line bg-surface p-5 shadow-[0_30px_60px_-38px_rgba(28,28,24,0.5)]">
      <div className="flex items-center justify-between gap-3">
        <p className="label text-muted">Network move</p>
        <span className="rounded-none bg-butter px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink">
          Needs approval
        </span>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-sage text-[10px] font-semibold text-ink">
            {initials(from)}
          </div>
          <p className="mt-2 max-w-[120px] text-[10px] font-medium leading-tight text-ink">
            {from}
          </p>
          <p className="mt-0.5 text-[9px] text-muted">Surplus verified</p>
        </div>

        <div className="flex flex-col items-center pt-3 text-center">
          <p className="font-display text-[18px] leading-none text-ink">{quantity}</p>
          <p className="mt-0.5 text-[8px] uppercase tracking-[0.1em] text-muted">tablets</p>
          <div className="mt-2 w-14 border-t border-dashed border-line-strong" />
          <ArrowRight className="mt-1 h-3 w-3 text-muted" />
        </div>

        <div className="text-right">
          <div className="ml-auto grid h-11 w-11 place-items-center rounded-full bg-butter text-[10px] font-semibold text-ink">
            {initials(to)}
          </div>
          <p className="ml-auto mt-2 max-w-[120px] text-[10px] font-medium leading-tight text-ink">
            {to}
          </p>
          <p className="mt-0.5 text-[9px] text-muted">{days} days of cover</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-3">
        <Field label="Medicine" value={medicine} className="col-span-2 sm:col-span-1" />
        <Field label="Shelf life" value={shelfLife} />
        <Field label="Decision" value="Human approval" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 text-[9px] text-muted">
          <ShieldDot />
          Batch verified
        </span>
        <Link
          href="/transfers"
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink hover:underline"
        >
          Review transfer
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[8px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 text-[9px] leading-tight text-ink">{value}</p>
    </div>
  );
}
