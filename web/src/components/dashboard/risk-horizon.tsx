"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardLine } from "@/components/dashboard/types";

const RISK_DOT = {
  CRITICAL: "bg-danger",
  HIGH: "bg-warn",
  MEDIUM: "bg-clay",
  LOW: "bg-ok",
} as const;

export function RiskHorizon({
  lines,
  selectedKey,
  onSelect,
  selectedFacilityId,
}: {
  lines: DashboardLine[];
  selectedKey: string | null;
  onSelect: (line: DashboardLine) => void;
  selectedFacilityId: string | null;
}) {
  const sorted = [...lines].sort(
    (a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999),
  );

  return (
    <Card id="risk" className="scroll-mt-24 overflow-hidden xl:flex xl:h-full xl:flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-2 pt-5">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            Risk horizon
          </p>
          <h2 className="mt-1 text-[16px] font-medium tracking-[-0.025em] text-ink">
            The lines closest to empty
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {selectedFacilityId
              ? "At-risk lines at the selected facility. Click a dot to load its forecast."
              : "Every at-risk line in the network. Click a dot to load its forecast."}
          </p>
        </div>
        <Link
          href={selectedFacilityId ? `/forecasts?facility=${selectedFacilityId}` : "/forecasts"}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-ink underline decoration-line-strong decoration-1 underline-offset-4 hover:decoration-ink"
        >
          All forecasts
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {sorted.length > 0 ? (
        <>
          <div className="mt-3 grid grid-cols-[112px_minmax(0,1fr)_44px] items-end gap-3 border-b border-line px-5 pb-1.5 text-[8px] font-medium uppercase tracking-[0.1em] text-muted sm:grid-cols-[150px_minmax(0,1fr)_54px]">
            <span>Medicine</span>
            <span className="relative block h-3">
              {[
                { at: 0, label: "0" },
                { at: 7 / 45, label: "7d" },
                { at: 14 / 45, label: "14d" },
                { at: 30 / 45, label: "30d" },
                { at: 1, label: "45d" },
              ].map((tick) => (
                <span
                  key={tick.label}
                  className="absolute bottom-0 -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                  style={{ left: `${tick.at * 100}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </span>
            <span className="text-right">Cover</span>
          </div>

          <div className="divide-y divide-line/70">
            {sorted.map((line) => {
              const days = line.daysToStockout;
              const position = days === null ? 100 : Math.max(1.5, Math.min(97, (days / 45) * 100));
              const active = line.key === selectedKey;
              return (
                <button
                  key={line.key}
                  type="button"
                  onClick={() => onSelect(line)}
                  aria-pressed={active}
                  title={`${line.genericName} at ${line.facilityShortName}: ${
                    days === null ? "more than 45 days of cover" : `${Math.max(0, Math.floor(days))} days of cover`
                  }`}
                  className={cn(
                    "group grid w-full grid-cols-[112px_minmax(0,1fr)_44px] items-center gap-3 px-5 py-3 text-left transition-colors sm:grid-cols-[150px_minmax(0,1fr)_54px]",
                    active ? "bg-ink/[0.05]" : "hover:bg-ink/[0.025]",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[10.5px] font-medium text-ink">
                      {line.genericName}
                    </span>
                    <span className="mt-0.5 block truncate text-[8.5px] text-muted">
                      {line.facilityShortName}
                    </span>
                  </span>

                  <span className="relative block h-7" aria-hidden="true">
                    <span className="absolute inset-y-1 left-0 w-[15.6%] rounded-l bg-danger/[0.06]" />
                    <span className="absolute inset-y-1 left-[15.6%] w-[15.6%] bg-warn/[0.055]" />
                    <span className="absolute inset-y-1 left-[31.1%] w-[35.6%] bg-sand/[0.14]" />
                    {[15.6, 31.1, 66.7].map((at) => (
                      <span
                        key={at}
                        className="absolute inset-y-0 border-l border-dashed border-line"
                        style={{ left: `${at}%` }}
                      />
                    ))}
                    <span className="absolute inset-x-0 top-1/2 h-px bg-line/80" />
                    <span
                      className={cn(
                        "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-[0_0_0_1px_rgba(25,15,10,0.18)] transition-transform group-hover:scale-125",
                        RISK_DOT[line.risk],
                        active && "scale-125 shadow-[0_0_0_2px_rgba(25,15,10,0.22)]",
                      )}
                      style={{ left: `${position}%` }}
                    />
                  </span>

                  <span className="text-right">
                    <span className="tabular text-[10px] font-medium text-ink">
                      {days === null ? "45+" : days <= 0 ? "out" : `${Math.floor(days)}d`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto border-t border-line px-5 py-2.5 text-[8.5px] leading-relaxed text-muted">
            Cover is recalculated from current stock, confirmed deliveries and the 30-day demand curve.
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/70 px-5 py-2.5 text-[8.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" /> High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" /> Watch
            </span>
            <span className="ml-auto">Projected cover</span>
          </div>
        </>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="text-[12px] font-medium text-ink">No at-risk lines here</p>
          <p className="mt-1 text-[10.5px] text-muted">
            Every medicine line has more than 30 days of forecast cover.
          </p>
        </div>
      )}
    </Card>
  );
}
