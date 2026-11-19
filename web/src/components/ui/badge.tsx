import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-canvas text-muted ring-line",
  brand: "bg-brand-soft text-brand ring-brand/15",
  success: "bg-ok-soft text-ok ring-ok/15",
  warning: "bg-warn-soft text-warn ring-warn/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  info: "bg-info-soft text-info ring-info/15",
  outline: "bg-transparent text-muted ring-line",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-none px-1.5 py-1 text-[8.5px] font-semibold uppercase leading-none tracking-[0.1em] ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const riskTone: Record<string, BadgeTone> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "warning",
  LOW: "success",
};

const riskLabel: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High risk",
  MEDIUM: "Watch",
  LOW: "Stable",
};

export function RiskBadge({
  risk,
  className,
  compact = false,
}: {
  risk: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Badge tone={riskTone[risk] ?? "neutral"} dot className={className}>
      {compact ? riskLabel[risk]?.split(" ")[0] ?? risk : riskLabel[risk] ?? risk}
    </Badge>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const tone: BadgeTone =
    confidence === "HIGH" ? "success" : confidence === "MEDIUM" ? "warning" : "danger";
  const label =
    confidence === "HIGH" ? "High confidence" : confidence === "MEDIUM" ? "Medium confidence" : "Low confidence";
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
