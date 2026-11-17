import { cn } from "@/lib/utils";

export const inputClass =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";

export const labelClass = "mb-1 block text-[11px] font-medium text-muted";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] text-muted">{hint}</span> : null}
    </label>
  );
}
