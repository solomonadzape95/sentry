"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { formatDays, formatNaira } from "@/lib/format";
import { RiskBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FacilityCardData = {
  id: string;
  name: string;
  shortName: string;
  type: string;
  typeLabel: string;
  lga: string;
  address: string;
  risk: string;
  stockValue: number;
  atRiskCount: number;
  critical: number;
  high: number;
  watch: number;
  expiringValue: number;
  totalLines: number;
  topRisk: {
    name: string;
    days: number | null;
    usable: number;
    unit: string;
    demand: number;
  } | null;
};

const IMAGE_BY_TYPE: Record<string, string> = {
  PHC: "/sentry/split-care.jpg",
  GENERAL: "/sentry/signal-clinic.jpg",
  PRIVATE: "/sentry/signal-shelves.jpg",
  PHARMACY: "/sentry/signal-pharmacy.jpg",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "PHC", label: "Primary care" },
  { key: "GENERAL", label: "General" },
  { key: "PRIVATE", label: "Private" },
  { key: "PHARMACY", label: "Pharmacy" },
] as const;

export function FacilityExplorer({ rows }: { rows: FacilityCardData[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.type !== filter) return false;
      if (!term) return true;
      return [row.name, row.shortName, row.lga, row.typeLabel]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [filter, query, rows]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-3 sm:flex-row sm:items-center">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-panel px-3">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search facility, LGA or type"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-muted/60"
            aria-label="Search facilities"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={filter === option.key}
              className={cn(
                "rounded-full px-2.5 py-1.5 text-[9px] font-medium transition-colors",
                filter === option.key
                  ? "bg-ink text-bone"
                  : "text-muted hover:bg-ink/[0.05] hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="hidden shrink-0 text-[9px] font-medium uppercase tracking-[0.1em] text-muted sm:block">
          {filtered.length} {filtered.length === 1 ? "site" : "sites"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((row) => (
          <Link
            key={row.id}
            href={`/facilities/${row.id}`}
            className="group overflow-hidden rounded-[16px] border border-line bg-surface transition-colors hover:border-ink/25"
          >
            <div className="relative h-[178px] overflow-hidden">
              <Image
                src={IMAGE_BY_TYPE[row.type] ?? IMAGE_BY_TYPE.PHC}
                alt=""
                aria-hidden="true"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="photo-warm object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-ink/20" />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
                <RiskBadge risk={row.risk} compact />
                <span className="rounded-none border border-bone/20 bg-ink/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-bone/75 backdrop-blur-sm">
                  {row.typeLabel}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h2 className="text-[21px] font-medium leading-[1.05] tracking-[-0.035em] text-bone">
                  {row.shortName}
                </h2>
                <p className="mt-1 text-[9.5px] text-bone/65">
                  {row.lga} · {row.address}
                </p>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 divide-x divide-line border-b border-line pb-3">
                <div className="pr-3">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Usable stock
                  </p>
                  <p className="tabular mt-1 font-display text-[30px] leading-none tracking-[-0.04em] text-ink">
                    {formatNaira(row.stockValue)}
                  </p>
                </div>
                <div className="pl-4">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                    At risk
                  </p>
                  <p
                    className={cn(
                      "tabular mt-1 font-display text-[30px] leading-none tracking-[-0.04em]",
                      row.critical > 0
                        ? "text-danger"
                        : row.atRiskCount > 0
                          ? "text-warn"
                          : "text-ok",
                    )}
                  >
                    {row.atRiskCount}{" "}
                    <span className="font-sans text-[10px] font-medium tracking-normal">
                      {row.atRiskCount === 1 ? "line" : "lines"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-muted">Critical</p>
                  <p className="tabular mt-1 text-[12px] font-medium text-ink">{row.critical}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-muted">High</p>
                  <p className="tabular mt-1 text-[12px] font-medium text-ink">{row.high}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-muted">Expiring 90d</p>
                  <p className="tabular mt-1 text-[12px] font-medium text-ink">
                    {formatNaira(row.expiringValue)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                <p className="min-w-0 truncate text-[9.5px] text-muted">
                  {row.topRisk
                    ? `${row.topRisk.name} · ${formatDays(row.topRisk.days)} cover`
                    : "All lines have healthy cover"}
                </p>
                <span className="inline-flex shrink-0 items-center gap-1 text-[9.5px] font-medium text-ink">
                  Open
                  <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line px-5 py-12 text-center">
          <p className="text-[13px] font-medium text-ink">No facilities match.</p>
          <p className="mt-1 text-[10.5px] text-muted">Try a different search or filter.</p>
        </div>
      ) : null}
    </div>
  );
}
