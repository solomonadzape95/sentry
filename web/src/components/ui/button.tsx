import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-ink text-bone hover:bg-bark focus-visible:outline-ink",
  secondary:
    "border border-ink/20 bg-transparent text-ink hover:border-ink/35 hover:bg-ink/[0.05] focus-visible:outline-ink",
  ghost:
    "text-muted hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-ink",
  danger:
    "bg-danger text-bone hover:bg-danger/90 focus-visible:outline-danger",
  outline:
    "border border-line bg-panel/60 text-ink hover:border-ink/25 hover:bg-panel focus-visible:outline-ink",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[11px]",
  md: "h-10 px-4 text-xs",
  lg: "h-12 px-5 text-sm",
} as const;

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}

/**
 * The landing-page CTA carried into the app: a flat pill with a circular
 * arrow chip. Use once per page for the primary action.
 */
export function ActionLink({
  href,
  children,
  tone = "dark",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-11 items-center gap-5 rounded-full pl-5 pr-1.5 text-xs font-medium transition-colors",
        tone === "dark"
          ? "bg-ink text-bone hover:bg-bark"
          : "bg-bone text-ink hover:bg-sand",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full",
          tone === "dark" ? "bg-bone text-ink" : "bg-ink text-bone",
        )}
      >
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
