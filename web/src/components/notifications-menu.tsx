"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";

export type AppNotification = {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  facilityName: string;
  medicineName: string;
  date: string | null;
  href: string;
};

const severityTone = {
  CRITICAL: "bg-danger",
  HIGH: "bg-warn",
  MEDIUM: "bg-clay",
  LOW: "bg-ok",
} as const;

export function NotificationsMenu({
  notifications,
  count,
  viewAllHref,
}: {
  notifications: AppNotification[];
  count: number;
  viewAllHref: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-line bg-panel/70 text-muted transition-colors hover:border-ink/20 hover:text-ink"
        aria-label={`Open ${count} alerts`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-none bg-danger px-1 text-[8px] font-semibold text-bone">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[14px] border border-line bg-panel shadow-[0_24px_70px_-28px_rgba(25,15,10,0.65)]"
          role="dialog"
          aria-label="Open alerts"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                Alerts
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-ink">
                {count} open {count === 1 ? "item" : "items"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-ink/[0.05] hover:text-ink"
              aria-label="Close alerts"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-[330px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => setOpen(false)}
                  className="group flex gap-3 border-b border-line/70 px-4 py-3 transition-colors last:border-0 hover:bg-surface/60"
                >
                  <span
                    className={cn(
                      "mt-1 h-1.5 w-1.5 shrink-0",
                      severityTone[notification.severity],
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10.5px] font-medium leading-snug text-ink">
                      {notification.title}
                    </span>
                    <span className="mt-1 block truncate text-[9px] text-muted">
                      {notification.facilityName} · {notification.medicineName}
                    </span>
                    <span className="mt-0.5 block truncate text-[8.5px] text-muted/80">
                      {notification.detail}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end justify-between gap-2">
                    {notification.date ? (
                      <span className="text-[8px] text-muted">
                        {formatShortDate(notification.date)}
                      </span>
                    ) : null}
                    <ArrowUpRight className="h-3 w-3 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-[12px] font-medium text-ink">No open alerts</p>
                <p className="mt-1 text-[10px] text-muted">
                  The network is within safe cover.
                </p>
              </div>
            )}
          </div>

          <Link
            href={viewAllHref}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-line px-4 py-3 text-[10px] font-medium text-ink hover:bg-surface/60"
          >
            Open risk view
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
