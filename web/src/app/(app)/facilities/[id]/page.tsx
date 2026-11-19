import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarClock,
  MapPin,
  Phone,
  ShieldAlert,
  Truck,
  Wallet,
} from "lucide-react";
import { FACILITY_TYPE_LABEL } from "@/lib/config";
import { formatNaira, formatNumber, formatShortDate } from "@/lib/format";
import {
  getFacilityConsumption,
  getNetworkData,
  getTransfers,
} from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { ActionLink, buttonClass } from "@/components/ui/button";
import { MetricStrip } from "@/components/ui/stat";
import { FacilityWorkspace } from "@/components/dashboard/facility-workspace";
import type {
  FacilityApproval,
  FacilityExpiry,
  FacilityIncoming,
} from "@/components/dashboard/facility-workspace";
import type { DashboardLine } from "@/components/dashboard/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facility" };

export default async function FacilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ medicine?: string }>;
}) {
  const { id } = await params;
  const { medicine: requestedMedicine } = await searchParams;
  const [scope, data] = await Promise.all([getScope(), getNetworkData()]);
  const facility = data.facilities.find((item) => item.id === id);
  if (!facility) notFound();

  const canSee =
    scope.persona.role === "NETWORK_AUTHORITY" ||
    scope.persona.memberships.some((membership) => membership.facilityId === facility.id);
  if (!canSee) notFound();

  const [consumption, transfers] = await Promise.all([
    getFacilityConsumption(facility.id, 365),
    getTransfers(),
  ]);

  const actualsByMedicine = new Map<string, { date: string; value: number }[]>();
  for (const row of consumption) {
    const entries = actualsByMedicine.get(row.medicineId) ?? [];
    entries.push({ date: row.date.toISOString().slice(0, 10), value: row.quantity });
    actualsByMedicine.set(row.medicineId, entries);
  }

  const series = data.series
    .filter((line) => line.facilityId === facility.id)
    .sort((a, b) => a.genericName.localeCompare(b.genericName));

  const lines: DashboardLine[] = series.map((line) => ({
    key: `${line.facilityId}:${line.medicineId}`,
    facilityId: line.facilityId,
    facilityName: line.facilityName,
    facilityShortName: line.facilityShortName,
    medicineId: line.medicineId,
    medicineName: line.medicineName,
    genericName: line.genericName,
    strength: line.strength,
    category: line.category,
    unit: line.unit,
    risk: line.risk,
    usable: line.usable,
    avgDailyDemand: line.avgDailyDemand,
    daysToStockout: line.daysToStockout,
    stockoutDate: line.stockoutDate,
    stockValue: line.usableValue,
    inAtRisk: line.risk !== "LOW" && line.avgDailyDemand > 0,
    forecast: line.forecast
      ? {
          modelLabel: line.forecast.modelLabel,
          confidence: line.forecast.confidence,
          wape: line.forecast.wape,
          points: line.forecast.points.map((point) => ({
            date: point.date.slice(0, 10),
            predicted: point.predicted,
            lower80: point.lower80,
            upper80: point.upper80,
          })),
        }
      : null,
    actuals: actualsByMedicine.get(line.medicineId) ?? [],
  }));

  const atRisk = series
    .filter((line) => line.risk !== "LOW" && line.avgDailyDemand > 0)
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
  const critical = atRisk.filter((line) => line.risk === "CRITICAL").length;
  const high = atRisk.filter((line) => line.risk === "HIGH").length;
  const medium = atRisk.filter((line) => line.risk === "MEDIUM").length;

  const requested = lines.find((line) => line.medicineId === requestedMedicine);
  const initialLine =
    requested ??
    lines.find((line) => line.key === `${atRisk[0]?.facilityId}:${atRisk[0]?.medicineId}`) ??
    lines[0] ??
    null;

  const dispatchQueue = transfers.filter(
    (transfer) =>
      transfer.fromFacilityId === facility.id &&
      (transfer.status === "PENDING_APPROVAL" || transfer.status === "RECOMMENDED"),
  );
  const receivingQueue = transfers.filter(
    (transfer) =>
      transfer.toFacilityId === facility.id &&
      (transfer.status === "IN_TRANSIT" || transfer.status === "APPROVED"),
  );

  const approvals: FacilityApproval[] = [
    ...dispatchQueue.map((transfer) => ({
      id: transfer.id,
      medicineName: transfer.medicine.genericName,
      quantity: transfer.quantity,
      unit: transfer.medicine.unit,
      counterparty: transfer.toFacility.shortName,
      reference: transfer.reference,
      kind: "dispatch" as const,
    })),
    ...receivingQueue.map((transfer) => ({
      id: transfer.id,
      medicineName: transfer.medicine.genericName,
      quantity: transfer.quantity,
      unit: transfer.medicine.unit,
      counterparty: transfer.fromFacility.shortName,
      reference: transfer.reference,
      kind: "receipt" as const,
    })),
  ];

  const allExpiry = series
    .flatMap((line) =>
      line.batches
        .filter(
          (batch) =>
            batch.quantityRemaining > 0 &&
            batch.daysToExpiry > 0 &&
            batch.daysToExpiry <= 90,
        )
        .map((batch) => ({
          id: batch.id,
          medicineName: line.genericName,
          batchNumber: batch.batchNumber,
          quantityRemaining: batch.quantityRemaining,
          unit: line.unit,
          daysToExpiry: batch.daysToExpiry,
          expiryDate: batch.expiryDate,
        })),
    )
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const expiry: FacilityExpiry[] = allExpiry.slice(0, 6);

  const incoming: FacilityIncoming[] = series
    .flatMap((line) =>
      line.incoming.map((order) => ({
        id: order.id,
        medicineName: line.genericName,
        quantity: order.quantity,
        unit: line.unit,
        expectedAt: order.expectedAt,
        supplierName: order.supplierName,
        reference: order.reference,
      })),
    )
    .sort((a, b) => a.expectedAt.localeCompare(b.expectedAt))
    .slice(0, 6);

  const stockValue = series.reduce((sum, line) => sum + line.usableValue, 0);
  const expiringValue = series.reduce((sum, line) => sum + line.nearExpiryValue, 0);
  const incomingUnits = incoming.reduce((sum, order) => sum + order.quantity, 0);

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
            {FACILITY_TYPE_LABEL[facility.type] ?? facility.type} · {facility.lga}, {facility.state}
          </>
        }
        title={facility.name}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{facility.address}</span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> {facility.phone}
            </span>
          </span>
        }
        actions={
          <>
            <Link
              href={`/transfers?to=${facility.id}`}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Request transfer
            </Link>
            <ActionLink href={`/inventory?facility=${facility.id}`}>
              Open inventory
            </ActionLink>
          </>
        }
      />

      <MetricStrip
        className="mb-5"
        items={[
          {
            label: "Usable stock",
            value: formatNaira(stockValue),
            sub: `${series.reduce(
              (sum, line) => sum + line.batches.filter((batch) => batch.status === "ACTIVE").length,
              0,
            )} active batches`,
            icon: <Wallet className="h-3.5 w-3.5" />,
          },
          {
            label: "Lines at risk",
            value: atRisk.length,
            sub: `${critical} critical · ${high} high · ${medium} watch`,
            tone: critical > 0 ? "danger" : atRisk.length > 0 ? "warning" : "success",
            icon: <ShieldAlert className="h-3.5 w-3.5" />,
          },
          {
            label: "Expiring in 90 days",
            value: formatNaira(expiringValue),
            sub: `${allExpiry.length} ${allExpiry.length === 1 ? "batch needs" : "batches need"} a decision`,
            tone: expiringValue > 0 ? "warning" : "default",
            icon: <CalendarClock className="h-3.5 w-3.5" />,
          },
          {
            label: "Confirmed incoming",
            value: `${formatNumber(incomingUnits)} units`,
            sub: incoming[0]
              ? `${incoming.length} confirmed · next ${formatShortDate(incoming[0].expectedAt)}`
              : "No confirmed deliveries",
            icon: <Truck className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <FacilityWorkspace
        facilityId={facility.id}
        facilityName={facility.shortName}
        lines={lines}
        initialLineKey={initialLine?.key ?? null}
        approvals={approvals}
        expiry={expiry}
        incoming={incoming}
      />
    </div>
  );
}
