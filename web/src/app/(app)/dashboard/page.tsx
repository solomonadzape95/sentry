import { redirect } from "next/navigation";
import { DEMO_META, DEMO_TODAY } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { getConsumptionWindow, getModelRuns, getNetworkData, getTransfers } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { ActionLink } from "@/components/ui/button";
import { NetworkWorkspace } from "@/components/dashboard/network-workspace";
import type { MapFacility } from "@/components/dashboard/network-map";
import type {
  DashboardLine,
  NextMove,
  TransferPipeline,
} from "@/components/dashboard/types";
import type { StockSeries } from "@/lib/intelligence";

export const dynamic = "force-dynamic";
export const metadata = { title: "Network overview" };

function facilityRisk(lines: StockSeries[]): {
  atRisk: StockSeries[];
  critical: number;
  high: number;
  medium: number;
  risk: MapFacility["risk"];
} {
  const atRisk = lines
    .filter((line) => line.risk !== "LOW" && line.avgDailyDemand > 0)
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
  const critical = atRisk.filter((line) => line.risk === "CRITICAL").length;
  const high = atRisk.filter((line) => line.risk === "HIGH").length;
  const medium = atRisk.filter((line) => line.risk === "MEDIUM").length;
  const risk =
    critical > 0 ? "CRITICAL" : high > 0 ? "HIGH" : medium > 0 ? "MEDIUM" : "LOW";
  return { atRisk, critical, high, medium, risk };
}

export default async function NetworkOverviewPage() {
  const [scope, data, consumption, transfers, modelRuns] = await Promise.all([
    getScope(),
    getNetworkData(),
    getConsumptionWindow(180),
    getTransfers(),
    getModelRuns(),
  ]);

  if (scope.persona.role !== "NETWORK_AUTHORITY") {
    redirect(scope.home);
  }

  const actualsByLine = new Map<string, { date: string; value: number }[]>();
  for (const row of consumption) {
    const key = `${row.facilityId}:${row.medicineId}`;
    const entries = actualsByLine.get(key) ?? [];
    entries.push({ date: row.date.toISOString().slice(0, 10), value: row.quantity });
    actualsByLine.set(key, entries);
  }

  const facilities: MapFacility[] = data.facilities.map((facility) => {
    const lines = data.series.filter((line) => line.facilityId === facility.id);
    const { atRisk, critical, high, medium, risk } = facilityRisk(lines);
    const earliest = atRisk[0];
    return {
      id: facility.id,
      name: facility.name,
      shortName: facility.shortName,
      type: facility.type,
      lga: facility.lga,
      latitude: facility.latitude,
      longitude: facility.longitude,
      risk,
      critical,
      watch: high + medium,
      stockValue: lines.reduce((sum, line) => sum + line.usableValue, 0),
      earliestCover: earliest?.daysToStockout ?? null,
      topMedicine: earliest?.genericName ?? null,
    };
  });

  const toLine = (series: StockSeries): DashboardLine => {
    const key = `${series.facilityId}:${series.medicineId}`;
    return {
      key,
      facilityId: series.facilityId,
      facilityName: series.facilityName,
      facilityShortName: series.facilityShortName,
      medicineId: series.medicineId,
      medicineName: series.medicineName,
      genericName: series.genericName,
      strength: series.strength,
      category: series.category,
      unit: series.unit,
      risk: series.risk,
      usable: series.usable,
      avgDailyDemand: series.avgDailyDemand,
      daysToStockout: series.daysToStockout,
      stockoutDate: series.stockoutDate,
      stockValue: series.usableValue,
      inAtRisk: series.risk !== "LOW" && series.avgDailyDemand > 0,
      forecast: series.forecast
        ? {
            modelLabel: series.forecast.modelLabel,
            confidence: series.forecast.confidence,
            wape: series.forecast.wape,
            points: series.forecast.points.map((point) => ({
              date: point.date.slice(0, 10),
              predicted: point.predicted,
              lower80: point.lower80,
              upper80: point.upper80,
            })),
          }
        : null,
      actuals: actualsByLine.get(key) ?? [],
    };
  };

  const riskLines = data.series
    .filter((line) => line.risk !== "LOW" && line.avgDailyDemand > 0)
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999))
    .map(toLine);

  const focusLines: DashboardLine[] = [];
  const seen = new Set<string>();
  for (const facility of data.facilities) {
    const lines = data.series
      .filter((line) => line.facilityId === facility.id && line.forecast && line.avgDailyDemand > 0)
      .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
    const risky = lines.filter((line) => line.risk !== "LOW");
    const chosen = risky.length
      ? risky
      : lines
          .slice()
          .sort((a, b) => (a.coverageDays ?? 999) - (b.coverageDays ?? 999))
          .slice(0, 2);
    for (const line of chosen) {
      const key = `${line.facilityId}:${line.medicineId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      focusLines.push(toLine(line));
    }
  }

  const opportunity = data.opportunities[0] ?? null;
  const nextMove: NextMove | null = opportunity
    ? {
        medicineId: opportunity.medicineId,
        genericName: opportunity.genericName,
        unit: opportunity.unit,
        quantity: opportunity.quantity,
        fromFacilityId: opportunity.fromFacilityId,
        fromFacilityName: opportunity.fromFacilityName,
        toFacilityId: opportunity.toFacilityId,
        toFacilityName: opportunity.toFacilityName,
        daysCoveredAfter: opportunity.daysCoveredAfter,
        daysToStockout: opportunity.daysToStockout,
        expiryDate: opportunity.expiryDate,
        batchNumber: opportunity.batchNumber,
        batchId: opportunity.batchId,
        urgency: opportunity.urgency,
      }
    : null;

  const heroLine = opportunity
    ? focusLines.find(
        (line) =>
          line.facilityId === opportunity.toFacilityId &&
          line.medicineId === opportunity.medicineId,
      )
    : null;

  const pending = transfers.filter(
    (transfer) => transfer.status === "PENDING_APPROVAL" || transfer.status === "RECOMMENDED",
  );
  const inTransit = transfers.filter(
    (transfer) => transfer.status === "APPROVED" || transfer.status === "IN_TRANSIT",
  );
  const received = transfers.filter((transfer) => transfer.status === "COMPLETED");
  const pipeline: TransferPipeline = {
    pending: pending.length,
    inTransit: inTransit.length,
    received: received.length,
    pendingUnits: pending.reduce((sum, transfer) => sum + transfer.quantity, 0),
    inTransitUnits: inTransit.reduce((sum, transfer) => sum + transfer.quantity, 0),
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-clay" />
            FCT demonstration network · {formatDate(DEMO_TODAY)}
          </>
        }
        title="Network overview."
        description="Where stock will run out, where it is moving, and what needs a decision."
        actions={<ActionLink href="/transfers">Review transfers</ActionLink>}
      />

      <NetworkWorkspace
        facilities={facilities}
        riskLines={riskLines}
        focusLines={focusLines}
        opportunity={
          opportunity
            ? {
                fromFacilityId: opportunity.fromFacilityId,
                toFacilityId: opportunity.toFacilityId,
                quantity: opportunity.quantity,
                unit: opportunity.unit,
                genericName: opportunity.genericName,
              }
            : null
        }
        nextMove={nextMove}
        pipeline={pipeline}
        initialLineKey={heroLine?.key ?? riskLines[0]?.key ?? focusLines[0]?.key ?? null}
        totals={{
          facilitiesAtRisk: data.totals.atRiskFacilities,
          facilityCount: data.totals.facilities,
          stockoutRiskLines: data.totals.criticalSeries + data.totals.highSeries,
          criticalLines: data.totals.criticalSeries,
          highLines: data.totals.highSeries,
          expiringValue: data.totals.expiringValue,
          expiringLines: data.series.filter((line) => line.nearExpiry > 0).length,
          transferableUnits: data.totals.transferableUnits,
          surplusLines: data.series.filter((line) => line.surplus45 > 0).length,
        }}
        assurance={{
          model: modelRuns[0]?.model ?? "XGBOOST",
          wape: modelRuns[0]?.overallWape ?? 0,
          seriesCount: data.totals.seriesCount,
          latestNcdc: formatDate(DEMO_META.ncdcLatestObservation),
        }}
      />
    </div>
  );
}
