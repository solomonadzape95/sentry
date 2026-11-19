import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { FACILITY_TYPE_LABEL } from "@/lib/config";
import { formatDateTime, formatDays, formatNumber } from "@/lib/format";
import { getNetworkData, getRecentMovements, getTransfers } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { MetricStrip } from "@/components/ui/stat";
import { FacilitySwitcher } from "@/components/facility-switcher";
import { StockActions } from "@/components/stock-actions";
import { EmptyState } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today" };

export default async function TodayPage() {
  const [scope, data] = await Promise.all([getScope(), getNetworkData()]);
  const facility = scope.activeFacility;

  if (!facility) {
    return (
      <div>
        <PageHeader
          title="Today"
          description="This account has no facility scope yet. Ask your network administrator to assign one."
        />
        <Card>
          <EmptyState
            title="No facility assigned"
            description="Inventory officers and facility managers are scoped to one or more facilities."
          />
        </Card>
      </div>
    );
  }

  const [movements, transfers, medicines, suppliers] = await Promise.all([
    getRecentMovements(facility.id, 8),
    getTransfers(),
    prisma.medicine.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  const series = data.series
    .filter((line) => line.facilityId === facility.id)
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
  const atRisk = series.filter((line) => line.risk !== "LOW" && line.avgDailyDemand > 0);
  const critical = atRisk.filter((line) => line.risk === "CRITICAL").length;

  const expiryWatch = series
    .flatMap((line) =>
      line.batches
        .filter(
          (batch) =>
            batch.quantityRemaining > 0 &&
            batch.daysToExpiry > 0 &&
            batch.daysToExpiry <= 90,
        )
        .map((batch) => ({ ...batch, medicineName: line.genericName, unit: line.unit })),
    )
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .slice(0, 6);

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
  const awaiting = [...dispatchQueue, ...receivingQueue];
  const allClear = awaiting.length === 0 && expiryWatch.length === 0;

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            {FACILITY_TYPE_LABEL[facility.type] ?? facility.type} · {facility.lga}
          </>
        }
        title="Today."
        description={`The inventory queue for ${facility.name}. Record what is on the shelf; the network reads the rest.`}
        actions={
          <>
            <FacilitySwitcher
              facilities={scope.facilities.map((item) => ({
                id: item.id,
                shortName: item.shortName,
              }))}
              currentId={facility.id}
            />
            <StockActions
              facilityId={facility.id}
              medicines={medicines.map((medicine) => ({
                id: medicine.id,
                name: medicine.name,
                genericName: medicine.genericName,
                strength: medicine.strength,
                unit: medicine.unit,
                barcode: medicine.barcode,
              }))}
              suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))}
              canManage={scope.canManageInventory}
            />
          </>
        }
      />

      <MetricStrip
        className="mb-5"
        columns={3}
        items={[
          {
            label: "Lines at risk",
            value: atRisk.length,
            sub: critical > 0 ? `${critical} ${critical === 1 ? "line needs" : "lines need"} action before the next delivery` : "No critical lines right now",
            tone: critical > 0 ? "danger" : atRisk.length > 0 ? "warning" : "success",
            icon: <ShieldAlert className="h-3.5 w-3.5" />,
          },
          {
            label: "Batches expiring in 90 days",
            value: expiryWatch.length,
            sub: "Use FEFO or move before they become waste",
            tone: expiryWatch.length > 0 ? "warning" : "default",
            icon: <CalendarClock className="h-3.5 w-3.5" />,
          },
          {
            label: "Awaiting your signature",
            value: awaiting.length,
            sub: `${dispatchQueue.length} dispatch · ${receivingQueue.length} receipt`,
            tone: awaiting.length > 0 ? "warning" : "default",
            icon: <Truck className="h-3.5 w-3.5" />,
          },
        ]}
      />

      {allClear ? (
        <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              All clear
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-ink">
              Nothing needs your signature and nothing is close to expiry.
            </p>
          </div>
          <Link
            href={`/inventory?facility=${facility.id}`}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          >
            Open inventory <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>
      ) : null}

      <div className={allClear ? "grid gap-5" : "grid gap-5 xl:grid-cols-12"}>
        <div className={allClear ? "space-y-5" : "space-y-5 xl:col-span-8"}>
          <Card id="risk" className="scroll-mt-24 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Work queue
                </p>
                <h2 className="mt-1 text-[16px] font-medium tracking-[-0.025em] text-ink">
                  At-risk medicines
                </h2>
                <p className="mt-1 text-[11px] text-muted">Ranked by projected days of cover.</p>
              </div>
              <Link
                href={`/inventory?facility=${facility.id}&tab=risk`}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
              >
                Open inventory <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {atRisk.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-y border-line text-[8px] uppercase tracking-[0.11em] text-muted">
                      <th className="px-5 py-2 font-medium">Medicine</th>
                      <th className="px-3 py-2 text-right font-medium">On hand</th>
                      <th className="px-3 py-2 text-right font-medium">Cover</th>
                      <th className="px-5 py-2 text-right font-medium">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRisk.slice(0, 8).map((line) => (
                      <tr key={line.medicineId} className="border-b border-line/70 last:border-0">
                        <td className="px-5 py-2.5">
                          <Link
                            href={`/forecasts?facility=${facility.id}&medicine=${line.medicineId}`}
                            className="block max-w-[250px] truncate text-[10.5px] font-medium text-ink hover:underline"
                          >
                            {line.genericName}
                          </Link>
                          <p className="mt-0.5 text-[8.5px] text-muted">{line.strength}</p>
                        </td>
                        <td className="tabular px-3 py-2.5 text-right text-[10px] text-ink">
                          {formatNumber(line.usable)}
                        </td>
                        <td
                          className={`tabular px-3 py-2.5 text-right text-[10px] font-medium ${
                            line.risk === "CRITICAL"
                              ? "text-danger"
                              : line.risk === "HIGH"
                                ? "text-warn"
                                : "text-ink"
                          }`}
                        >
                          {formatDays(line.daysToStockout)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <RiskBadge risk={line.risk} compact />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No at-risk lines"
                description="Every medicine line has more than 30 days of forecast cover."
              />
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 pb-2 pt-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                Audit trail
              </p>
              <h2 className="mt-1 text-[16px] font-medium tracking-[-0.025em] text-ink">
                Recent stock movement
              </h2>
            </div>
            <div className="mt-1 divide-y divide-line">
              {movements.map((movement) => {
                const positive = movement.quantity > 0;
                return (
                  <div key={movement.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                        positive ? "bg-ok-soft text-ok" : "bg-canvas text-muted"
                      }`}
                    >
                      {positive ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.5px] font-medium text-ink">
                        {movement.medicine.genericName}
                      </p>
                      <p className="truncate text-[8.5px] text-muted">
                        {movement.type.replaceAll("_", " ").toLowerCase()} ·{" "}
                        {movement.reason ?? movement.reference}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`tabular text-[10px] font-medium ${
                          positive ? "text-ok" : "text-ink"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {formatNumber(movement.quantity)}
                      </p>
                      <p className="text-[8px] text-muted">
                        {formatDateTime(movement.occurredAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {movements.length === 0 ? (
                <EmptyState
                  title="No stock movement yet"
                  description="Issue or receive stock to start the audit trail."
                />
              ) : null}
            </div>
          </Card>
        </div>

        {!allClear ? (
          <div className="space-y-5 xl:col-span-4">
            {awaiting.length > 0 ? (
              <Card>
                <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Transfers
                    </p>
                    <h2 className="mt-1 text-[15px] font-medium tracking-[-0.025em] text-ink">
                      Awaiting your action
                    </h2>
                  </div>
                  <Badge tone="warning" dot>
                    {awaiting.length}
                  </Badge>
                </div>
                <div className="mt-1 divide-y divide-line">
                  {awaiting.slice(0, 5).map((transfer) => {
                    const dispatch = transfer.fromFacilityId === facility.id;
                    return (
                      <div key={transfer.id} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[10.5px] font-medium text-ink">
                              {transfer.medicine.genericName}
                            </p>
                            <p className="mt-0.5 truncate text-[8.5px] text-muted">
                              {formatNumber(transfer.quantity)} {transfer.medicine.unit}s ·{" "}
                              {dispatch
                                ? `to ${transfer.toFacility.shortName}`
                                : `from ${transfer.fromFacility.shortName}`}
                            </p>
                          </div>
                          <Badge tone={dispatch ? "warning" : "info"}>
                            {dispatch ? "Dispatch" : "Receipt"}
                          </Badge>
                        </div>
                        <Link
                          href={`/transfers#transfer-${transfer.id}`}
                          className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-medium text-ink hover:underline"
                        >
                          Open transfer <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {expiryWatch.length > 0 ? (
              <Card>
                <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Expiry watch
                    </p>
                    <h2 className="mt-1 text-[15px] font-medium tracking-[-0.025em] text-ink">
                      Batches inside 90 days
                    </h2>
                  </div>
                  <CalendarClock className="h-4 w-4 text-muted" strokeWidth={1.5} />
                </div>
                <div className="mt-1 divide-y divide-line">
                  {expiryWatch.map((batch) => (
                    <div key={batch.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10.5px] font-medium text-ink">
                          {batch.medicineName}
                        </p>
                        <p className="truncate font-mono text-[8px] text-muted">
                          {batch.batchNumber}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`tabular text-[10px] font-medium ${
                            batch.daysToExpiry <= 30 ? "text-danger" : "text-warn"
                          }`}
                        >
                          {batch.daysToExpiry}d
                        </p>
                        <p className="text-[8px] text-muted">
                          {formatNumber(batch.quantityRemaining)} left
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
