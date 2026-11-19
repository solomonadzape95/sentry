import { cn } from "@/lib/utils";
import { SentryMark } from "@/components/logo";

export function WingSpinner({
  className,
  size = "sm",
  label = "Loading",
}: {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
}) {
  const box = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  }[size];

  return (
    <span
      className={cn("wing-loader", box, className)}
      role="status"
      aria-label={label}
      title={label}
    >
      <span className="wing-loader__orbit" aria-hidden="true" />
      <SentryMark className="wing-loader__mark h-full w-full" />
    </span>
  );
}

export function BrandLoader({
  label = "Loading",
  size = "md",
  tone = "ink",
  className,
}: {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "ink" | "bone";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        tone === "ink" ? "text-ink" : "text-bone",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <WingSpinner size={size} label={label} />
      <span className="text-[10px] font-medium tracking-[-0.01em]">{label}</span>
    </span>
  );
}
