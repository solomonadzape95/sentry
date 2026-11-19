import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function Avatar({
  name,
  className,
  tone = "brand",
}: {
  name: string;
  className?: string;
  tone?: "brand" | "dark" | "light";
}) {
  const tones = {
    brand: "bg-brand-soft text-brand-dark ring-brand/10",
    dark: "bg-white/10 text-white ring-white/15",
    light: "bg-canvas text-muted ring-line",
  };
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className ?? "h-8 w-8",
      )}
    >
      {initials(name)}
    </div>
  );
}
