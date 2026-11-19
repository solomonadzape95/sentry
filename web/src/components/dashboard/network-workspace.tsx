"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, MapPinned, ShieldAlert } from "lucide-react";
import { formatNaira, formatNumber } from "@/lib/format";
import { MetricStrip } from "@/components/ui/stat";
import { NetworkMap, type MapFacility, type MapFilter, type MapOpportunity } from "@/components/dashboard/network-map";
import { NextMoveCard, PipelineCard } from "@/components/dashboard/next-move";
import { ForecastExplorer } from "@/components/dashboard/forecast-explorer";
import { RiskHorizon } from "@/components/dashboard/risk-horizon";
import { AssuranceCard } from "@/components/dashboard/assurance-card";
import type { DashboardLine, NextMove, TransferPipeline } from "@/components/dashboard/types";

export function NetworkWorkspace({
  facilities,
  riskLines,
  focusLines,
  opportunity,
  nextMove,
  pipeline,
  initialLineKey,
  totals,
  assurance,
}: {
  facilities: MapFacility[];
  riskLines: DashboardLine[];
  focusLines: DashboardLine[];
  opportunity: MapOpportunity | null;
  nextMove: NextMove | null;
  pipeline: TransferPipeline;
  initialLineKey: string | null;
  totals: {
    facilitiesAtRisk: number;
    facilityCount: number;
    stockoutRiskLines: number;
    criticalLines: number;
    highLines: number;
    expiringValue: number;
    expiringLines: number;
    transferableUnits: number;
    surplusLines: number;
  };
  assurance: {
    model: string;
    wape: number;
    seriesCount: number;
    latestNcdc: string;
  };
}) {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(initialLineKey);
  const [mapFilter, setMapFilter] = useState<MapFilter>("all");
  const [showRoute, setShowRoute] = useState(true);

  const visibleRiskLines = useMemo(
    () =>
      selectedFacilityId
        ? riskLines.filter((line) => line.facilityId === selectedFacilityId)
        : riskLines,
    [riskLines, selectedFacilityId],
  );

  function chooseLine(line: DashboardLine) {
    setSelectedKey(line.key);
    setSelectedFacilityId(line.facilityId);
  }

  function chooseFacility(facilityId: string | null) {
    setSelectedFacilityId(facilityId);
    if (!facilityId) return;
    const first = focusLines.find((line) => line.facilityId === facilityId);
    if (first) setSelectedKey(first.key);
  }

  function showMoveOnMap() {
    if (!nextMove) return;
    setShowRoute(true);
    setSelectedFacilityId(nextMove.toFacilityId);
    const first = focusLines.find((line) => line.facilityId === nextMove.toFacilityId);
    if (first) setSelectedKey(first.key);
    window.setTimeout(() => {
      document.getElementById("network-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  return (
    <div>
      <MetricStrip
        className="mb-5"
        items={[
          {
            label: "Facilities at risk",
            value: `${totals.facilitiesAtRisk} / ${totals.facilityCount}`,
            sub: "At least one line under 30 days of cover",
            tone: totals.facilitiesAtRisk > 0 ? "danger" : "success",
            href: "/facilities",
            icon: <ShieldAlert className="h-3.5 w-3.5" />,
          },
          {
            label: "Stockout risk lines",
            value: totals.stockoutRiskLines,
            sub: `${totals.criticalLines} critical · ${totals.highLines} high`,
            tone: totals.stockoutRiskLines > 0 ? "warning" : "success",
            href: "#risk",
            icon: <AlertTriangle className="h-3.5 w-3.5" />,
          },
          {
            label: "Expiring in 90 days",
            value: formatNaira(totals.expiringValue),
            sub: `${totals.expiringLines} medicine lines holding near-expiry stock`,
            tone: totals.expiringValue > 0 ? "warning" : "default",
            icon: <CalendarClock className="h-3.5 w-3.5" />,
          },
          {
            label: "Transferable surplus",
            value: `${formatNumber(totals.transferableUnits)} units`,
            sub: `${totals.surplusLines} lines above 45-day cover with safe shelf life`,
            href: "/transfers",
            icon: <ArrowRight className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-12">
        <div id="network-map" className="scroll-mt-24 xl:col-span-8">
          <NetworkMap
            facilities={facilities}
            opportunity={opportunity}
            selectedId={selectedFacilityId}
            onSelect={chooseFacility}
            filter={mapFilter}
            onFilterChange={setMapFilter}
            showRoute={showRoute}
          />
        </div>

        <div className="space-y-5 xl:col-span-4">
          <NextMoveCard move={nextMove} onShowOnMap={showMoveOnMap} />
          <PipelineCard pipeline={pipeline} />
          <AssuranceCard {...assurance} />
        </div>

        <div className="xl:col-span-7">
          <ForecastExplorer
            lines={focusLines}
            facilities={facilities.map((facility) => ({
              id: facility.id,
              shortName: facility.shortName,
            }))}
            selectedKey={selectedKey}
            selectedFacilityId={selectedFacilityId}
            onSelectLine={chooseLine}
            onFacilityChange={chooseFacility}
          />
        </div>

        <div className="xl:col-span-5">
          <RiskHorizon
            lines={visibleRiskLines}
            selectedKey={selectedKey}
            onSelect={chooseLine}
            selectedFacilityId={selectedFacilityId}
          />
        </div>
      </div>

      <p className="mt-5 flex items-start gap-2 text-[9px] leading-relaxed text-muted">
        <MapPinned className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
        <span>
          Facilities are positioned by their coordinates. Stock, demand and expiry
          are simulated; weather is real ERA5 history and disease signals are public
          or derived. Forecasts are planning aids, not clinical guidance.
        </span>
      </p>
    </div>
  );
}
