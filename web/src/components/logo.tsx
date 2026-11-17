import Link from "next/link";
import { Activity } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  theme = "dark",
  href = "/",
}: {
  className?: string;
  compact?: boolean;
  theme?: "dark" | "light";
  href?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset",
          theme === "dark"
            ? "bg-white/10 ring-white/15"
            : "bg-brand-dark ring-brand-dark/10",
        )}
      >
        <Activity className="h-[18px] w-[18px] text-[#e4f44d]" strokeWidth={2.4} />
      </div>
      {compact ? null : (
        <div className="leading-none">
          <div
            className={cn(
              "text-[19px] font-semibold tracking-tight",
              theme === "dark" ? "text-white" : "text-ink",
            )}
          >
            {APP_NAME}
          </div>
          <div
            className={cn(
              "mt-1 text-[9px] font-medium uppercase tracking-[0.18em]",
              theme === "dark" ? "text-white/45" : "text-muted",
            )}
          >
            Supply intelligence
          </div>
        </div>
      )}
    </Link>
  );
}
