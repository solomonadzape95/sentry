import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand/90 focus-visible:outline-brand",
  secondary:
    "border border-line bg-surface text-ink shadow-sm hover:bg-canvas focus-visible:outline-brand",
  ghost: "text-muted hover:bg-canvas hover:text-ink focus-visible:outline-brand",
  danger:
    "bg-danger text-white shadow-sm hover:bg-danger/90 focus-visible:outline-danger",
  outline:
    "border border-brand/25 bg-brand-soft/50 text-brand-dark hover:bg-brand-soft focus-visible:outline-brand",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
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
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
