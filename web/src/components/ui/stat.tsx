import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  default: "text-ink",
  brand: "text-brand",
  danger: "text-danger",
  warning: "text-warn",
  success: "text-ok",
} as const;

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-line bg-surface p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        {icon ? <div className={cn("text-body/60", tones[tone])}>{icon}</div> : null}
      </div>
      <p className={cn("mt-3 font-display text-[30px] leading-none tracking-[-0.035em] sm:text-[34px]", tones[tone])}>
        {value}
      </p>
      {sub ? <div className="mt-2 text-[11px] leading-relaxed text-muted">{sub}</div> : null}
    </div>
  );
}

export type MetricItem = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: keyof typeof tones;
  href?: string;
  icon?: React.ReactNode;
};

/**
 * One strip of related numbers, divided by hairlines. Cheaper on the eye than
 * four separate cards and easier to scan as a row.
 */
export function MetricStrip({
  items,
  className,
  columns = 4,
}: {
  items: MetricItem[];
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-[16px] border border-line bg-surface",
        columns === 2 ? "xl:grid-cols-2" : columns === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4",
        className,
      )}
    >
      {items.map((item, index) => {
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                {item.label}
              </p>
              {item.href ? (
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
              ) : item.icon ? (
                <span className="shrink-0 text-body/50">{item.icon}</span>
              ) : null}
            </div>
            <p
              className={cn(
                "mt-3 font-display text-[24px] leading-none tracking-[-0.04em] sm:text-[32px]",
                tones[item.tone ?? "default"],
              )}
            >
              {item.value}
            </p>
            {item.sub ? (
              <p className="mt-2 text-[10.5px] leading-[1.5] text-muted">{item.sub}</p>
            ) : null}
          </>
        );

        const lastOdd = items.length % 2 === 1 && index === items.length - 1;
        const shellClass = cn(
          "min-w-0 p-3.5 sm:p-5",
          index >= 2 && "border-t border-line",
          index % 2 === 1 && "border-l border-line",
          index > 0 ? "xl:border-l xl:border-line" : "xl:border-l-0",
          "xl:border-t-0",
          lastOdd && "col-span-2 xl:col-span-1",
        );

        return item.href ? (
          <Link key={item.label} href={item.href} className={cn(shellClass, "group transition-colors hover:bg-panel/60")}>
            {content}
          </Link>
        ) : (
          <div key={item.label} className={shellClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({
  values,
  width = 108,
  height = 30,
  className,
  stroke = "#492415",
  fill = false,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
  fill?: boolean;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M${points.join(" L")}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {fill ? (
        <path
          d={`${path} L${width},${height} L0,${height} Z`}
          fill={stroke}
          opacity={0.08}
        />
      ) : null}
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MiniBar({
  value,
  max,
  tone = "brand",
  className,
}: {
  value: number;
  max: number;
  tone?: "brand" | "warn" | "danger" | "muted";
  className?: string;
}) {
  const width = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = {
    brand: "bg-brand",
    warn: "bg-warn",
    danger: "bg-danger",
    muted: "bg-muted/40",
  }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-canvas", className)}>
      <div className={cn("h-full rounded-full", color)} style={{ width: `${width}%` }} />
    </div>
  );
}
