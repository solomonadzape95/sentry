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
        "rounded-[22px] border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,36,30,0.04)] sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {label}
        </p>
        {icon ? <div className={cn("text-brand/70", tones[tone])}>{icon}</div> : null}
      </div>
      <p className={cn("tabular mt-2 text-[26px] font-semibold leading-none sm:text-[30px]", tones[tone])}>
        {value}
      </p>
      {sub ? <div className="mt-2 text-xs leading-relaxed text-muted">{sub}</div> : null}
    </div>
  );
}

export function Sparkline({
  values,
  width = 108,
  height = 30,
  className,
  stroke = "#0f3b2c",
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
