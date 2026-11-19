import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-[16px] border border-line bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
  icon,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 px-5 pb-3.5 pt-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-full border border-ink/10 bg-ink/[0.04] text-body">
            {icon}
          </div>
        ) : null}
        <div>
          {eyebrow ? (
            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-[14px] font-medium tracking-[-0.02em] text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function PanelHeading({
  label,
  title,
  meta,
  action,
  className,
}: {
  label?: string;
  title: string;
  meta?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {label ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            {label}
          </p>
        ) : null}
        <h2 className="mt-1 text-[16px] font-medium leading-tight tracking-[-0.025em] text-ink">
          {title}
        </h2>
        {meta ? <p className="mt-1 text-[11px] leading-relaxed text-muted">{meta}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
