"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, History, MapPin, TrendingUp } from "lucide-react";
import { formatDays, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ForecastCurve, type CurvePoint } from "@/components/charts/forecast-curve";
import type { DashboardLine } from "@/components/dashboard/types";

export function ForecastExplorer({
  lines,
  facilities,
  selectedKey,
  selectedFacilityId,
  onSelectLine,
  onFacilityChange,
  showFacilitySelect = true,
}: {
  lines: DashboardLine[];
  facilities: { id: string; shortName: string }[];
  selectedKey: string | null;
  selectedFacilityId: string | null;
  onSelectLine: (line: DashboardLine) => void;
  onFacilityChange: (facilityId: string | null) => void;
  showFacilitySelect?: boolean;
}) {
  const [historyDays, setHistoryDays] = useState<90 | 180>(90);

  const facilityLines = selectedFacilityId
    ? lines.filter((line) => line.facilityId === selectedFacilityId)
    : lines;
  const selected =
    lines.find((line) => line.key === selectedKey) ??
    facilityLines[0] ??
    lines[0] ??
    null;

  const curve = useMemo<CurvePoint[]>(() => {
    if (!selected) return [];
    const actuals = selected.actuals.slice(-historyDays).map((point) => ({
      date: point.date,
      actual: point.value,
    }));
    const forecast = (selected.forecast?.points ?? []).map((point) => ({
      date: point.date,
      predicted: point.predicted,
      lower80: point.lower80,
      upper80: point.upper80,
    }));
    return [...actuals, ...forecast];
  }, [historyDays, selected]);

  if (!selected) {
    return (
      <Card className="flex min-h-[360px] items-center justify-center p-8 text-center">
        <div>
          <TrendingUp className="mx-auto h-6 w-6 text-muted" strokeWidth={1.4} />
          <p className="mt-3 text-[13px] font-medium text-ink">No forecast to show</p>
          <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-muted">
            This facility has no forecast lines in the demo dataset.
          </p>
        </div>
      </Card>
    );
  }

  const forecastPoints = selected.forecast?.points ?? [];
  const next7 = forecastPoints.slice(0, 7).reduce((sum, point) => sum + point.predicted, 0);
  const next30 = forecastPoints.reduce((sum, point) => sum + point.predicted, 0);
  const stockoutTone =
    selected.risk === "CRITICAL"
      ? "danger"
      : selected.risk === "HIGH"
        ? "warning"
        : selected.risk === "MEDIUM"
          ? "neutral"
          : "success";

  return (
    <Card className="overflow-hidden">
      <div className="p-5 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              Demand & forecast
            </p>
            <h2 className="mt-1 text-[17px] font-medium leading-tight tracking-[-0.03em] text-ink">
              {selected.genericName} {selected.strength}
            </h2>
            <p className="mt-1 text-[10.5px] text-muted">
              {selected.facilityShortName} · {selected.category.replaceAll("_", " ").toLowerCase()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {showFacilitySelect ? (
            <MiniSelect
              label="Facility"
              value={selectedFacilityId ?? "all"}
              onChange={(value) => onFacilityChange(value === "all" ? null : value)}
              options={[
                { value: "all", label: "All facilities" },
                ...facilities.map((facility) => ({
                  value: facility.id,
                  label: facility.shortName,
                })),
              ]}
              icon={<MapPin className="h-3 w-3" />}
            />
            ) : null}
            <MiniSelect
              label="Medicine"
              value={selected.key}
              onChange={(value) => {
                const next = lines.find((line) => line.key === value);
                if (next) onSelectLine(next);
              }}
              options={facilityLines.map((line) => ({
                value: line.key,
                label: selectedFacilityId
                  ? line.genericName
                  : `${line.genericName} · ${line.facilityShortName}`,
              }))}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line">
          <Summary label="Next 7 days" value={`${formatNumber(next7)} ${selected.unit}s`} />
          <Summary label="Next 30 days" value={`${formatNumber(next30)} ${selected.unit}s`} />
          <div className="px-3 py-3 sm:px-4">
            <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
              Projected cover
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <p className="tabular text-[14px] font-medium text-ink">
                {formatDays(selected.daysToStockout)}
              </p>
              <Badge tone={stockoutTone} dot>
                {selected.risk === "LOW" ? "Stable" : selected.risk.toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 pb-1 pt-2">
        <ForecastCurve
          data={curve}
          unit={selected.unit}
          stockoutDate={selected.stockoutDate}
          height={252}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3 text-[8.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 bg-ink" /> Recorded issue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-clay" /> Forecast
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 bg-sand/50" /> 80% interval
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-line p-0.5">
            {(
              [
                { days: 90 as const, label: "90d" },
                { days: 180 as const, label: "6m" },
              ]
            ).map((option) => (
              <button
                key={option.days}
                type="button"
                onClick={() => setHistoryDays(option.days)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8.5px] font-medium",
                  historyDays === option.days ? "bg-ink text-bone" : "text-muted hover:text-ink",
                )}
                aria-pressed={historyDays === option.days}
              >
                {option.days === 180 ? <History className="h-2.5 w-2.5" /> : null}
                {option.label}
              </button>
            ))}
          </div>
          <Link
            href={`/forecasts?facility=${selected.facilityId}&medicine=${selected.medicineId}`}
            className="inline-flex items-center gap-1 text-[9px] font-medium text-ink hover:underline"
          >
            Full forecast <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {selected.forecast ? (
        <div className="border-t border-line/70 bg-panel/35 px-5 py-2.5 text-[8.5px] leading-relaxed text-muted">
          {selected.forecast.modelLabel} · WAPE{" "}
          {(selected.forecast.wape * 100).toFixed(1)}% · {selected.forecast.confidence.toLowerCase()}{" "}
          confidence. Uncertainty is the model&apos;s 80% interval.
        </div>
      ) : null}
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="tabular mt-1.5 truncate text-[14px] font-medium tracking-[-0.02em] text-ink">
        {value}
      </p>
    </div>
  );
}

function MiniSelect({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 text-[9.5px] text-muted">
      {icon}
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-[130px] cursor-pointer appearance-none bg-transparent pr-4 text-[9.5px] font-medium text-ink outline-none"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="-ml-3 h-3 w-3 pointer-events-none text-muted" />
    </label>
  );
}
