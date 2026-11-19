import { cn } from "@/lib/utils";

export const inputClass =
  "h-10 w-full rounded-xl border border-line bg-panel/70 px-3.5 text-[13px] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink/30 focus:ring-2 focus:ring-ink/10";

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
