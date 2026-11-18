import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  ClipboardCheck,
  Package,
  ScanLine,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { FACILITY_TYPE_LABEL } from "@/lib/config";
import {
  formatDate,
  formatDateTime,
  formatDays,
  formatNaira,
  formatNumber,
} from "@/lib/format";
import { getNetworkData, getRecentMovements, getTransfers } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { buttonClass } from "@/components/ui/button";
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
    .filter((s) => s.facilityId === facility.id)
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
  const atRisk = series.filter((s) => s.risk !== "LOW" && s.avgDailyDemand > 0);
  const critical = atRisk.filter((s) => s.risk === "CRITICAL");
  const expiryWatch = series
    .flatMap((s) =>
      s.batches
        .filter((b) => b.quantityRemaining > 0 && b.daysToExpiry > 0 && b.daysToExpiry <= 90)
        .map((b) => ({ ...b, medicineName: s.genericName, unit: s.unit })),
    )
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .slice(0, 6);

  const dispatchQueue = transfers.filter(
    (t) =>
      t.fromFacilityId === facility.id &&
      (t.status === "PENDING_APPROVAL" || t.status === "RECOMMENDED"),
  );
  const receivingQueue = transfers.filter(
    (t) =>
      t.toFacilityId === facility.id &&
      (t.status === "IN_TRANSIT" || t.status === "APPROVED"),
  );

  const activeBatches = series.reduce(
    (sum, s) => sum + s.batches.filter((b) => b.status === "ACTIVE").length,
    0,
  );

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <ClipboardCheck className="h-3.5 w-3.5" />
            {FACILITY_TYPE_LABEL[facility.type] ?? facility.type} · {facility.lga}
          </>
        }
        title="Today"
        description={`${facility.name}: the work queue for stock accuracy, not a report.`}
        actions={
          <>
            <FacilitySwitcher
              facilities={scope.facilities.map((f) => ({ id: f.id, shortName: f.shortName }))}
              currentId={facility.id}
            />
            <Link
              href={`/facilities/${facility.id}`}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              Facility overview
            </Link>
            <StockActions
              facilityId={facility.id}
              medicines={medicines.map((m) => ({
                id: m.id,
                name: m.name,
                genericName: m.genericName,
                strength: m.strength,
                unit: m.unit,
                barcode: m.barcode,
              }))}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
              canManage={scope.canManageInventory}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          label="Lines at risk"
          value={atRisk.length}
          sub={critical.length > 0 ? `${critical.length} critical` : "No critical lines"}
          icon={<ShieldAlert className="h-4 w-4" />}
          tone={critical.length > 0 ? "danger" : atRisk.length > 0 ? "warning" : "success"}
        />
        <Stat
          label="Expiring in 90 days"
          value={expiryWatch.length}
          sub="Batches to review or move"
          icon={<CalendarClock className="h-4 w-4" />}
          tone={expiryWatch.length > 0 ? "warning" : "default"}
        />
        <Stat
          label="Awaiting your action"
          value={dispatchQueue.length + receivingQueue.length}
          sub={`${dispatchQueue.length} dispatch · ${receivingQueue.length} receipt`}
          icon={<Truck className="h-4 w-4" />}
          tone={dispatchQueue.length + receivingQueue.length > 0 ? "warning" : "default"}
        />
        <Stat
          label="Active batches"
          value={activeBatches}
          sub={`${formatNumber(series.length)} medicine lines`}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/m/scan" className={buttonClass({ variant: "primary", size: "sm" })}>
          <ScanLine className="h-3.5 w-3.5" />
          Scan
        </Link>
        <Link href="/m/issue" className={buttonClass({ variant: "secondary", size: "sm" })}>
          <ArrowUpRight className="h-3.5 w-3.5" />
          Issue stock
        </Link>
        <Link href="/m/issue?mode=receive" className={buttonClass({ variant: "secondary", size: "sm" })}>
          <ArrowDownLeft className="h-3.5 w-3.5" />
          Receive stock
        </Link>
        <Link href="/m/count" className={buttonClass({ variant: "secondary", size: "sm" })}>
          <ClipboardCheck className="h-3.5 w-3.5" />
          Stock count
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="At-risk medicines"
              subtitle="Ranked by projected days of cover"
              action={
                <Link href={`/inventory?facility=${facility.id}&tab=risk`} className="text-[11px] font-medium text-brand hover:underline">
                  Open inventory
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-2.5 font-medium">Medicine</th>
                    <th className="px-3 py-2.5 font-medium">On hand</th>
                    <th className="px-3 py-2.5 font-medium">Cover</th>
                    <th className="px-3 py-2.5 font-medium">Reorder</th>
                    <th className="px-5 py-2.5 text-right font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.slice(0, 6).map((s) => (
                    <tr key={s.medicineId} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{s.genericName}</p>
                        <p className="text-[10px] text-muted">{s.strength}</p>
                      </td>
                      <td className="tabular px-3 py-3">{formatNumber(s.usable)}</td>
                      <td className="tabular px-3 py-3">
                        <span className={s.risk === "CRITICAL" ? "font-medium text-danger" : s.risk === "HIGH" ? "font-medium text-warn" : ""}>
                          {formatDays(s.daysToStockout)}
                        </span>
                      </td>
                      <td className="tabular px-3 py-3 text-muted">
                        {s.reorderQty > 0 ? formatNumber(s.reorderQty) : "N/A"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <RiskBadge risk={s.risk} compact />
                      </td>
                    </tr>
                  ))}
                  {atRisk.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          title="No at-risk lines"
                          description="Every medicine line has more than 30 days of forecast cover."
                        />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent stock movement" subtitle="Last recorded inventory activity at this facility" />
            <div className="divide-y divide-line">
              {movements.map((m) => {
                const positive = m.quantity > 0;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${positive ? "bg-ok-soft text-ok" : "bg-canvas text-muted"}`}>
                      {positive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-ink">{m.medicine.genericName}</p>
                      <p className="truncate text-[10px] text-muted">
                        {m.type.replaceAll("_", " ").toLowerCase()} · {m.reason ?? m.reference}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`tabular text-[11px] font-semibold ${positive ? "text-ok" : "text-ink"}`}>
                        {positive ? "+" : ""}
                        {formatNumber(m.quantity)}
                      </p>
                      <p className="text-[9px] text-muted">{formatDateTime(m.occurredAt)}</p>
                    </div>
                  </div>
                );
              })}
              {movements.length === 0 ? (
                <EmptyState title="No stock movement yet" description="Issue or receive stock to start the audit trail." />
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Awaiting your action" subtitle="Transfers that need a dispatch or receipt" />
            <div className="divide-y divide-line">
              {[...dispatchQueue, ...receivingQueue].slice(0, 5).map((transfer) => {
                const dispatch = transfer.fromFacilityId === facility.id;
                return (
                  <div key={transfer.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-ink">
                        {transfer.medicine.genericName}
                      </p>
                      <Badge tone={dispatch ? "warning" : "info"}>
                        {dispatch ? "Dispatch" : "Receive"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {formatNumber(transfer.quantity)} {transfer.medicine.unit}s ·{" "}
                      {dispatch
                        ? `to ${transfer.toFacility.shortName}`
                        : `from ${transfer.fromFacility.shortName}`}
                    </p>
                    <Link
                      href={`/transfers#transfer-${transfer.id}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-brand hover:underline"
                    >
                      Open transfer <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                );
              })}
              {dispatchQueue.length + receivingQueue.length === 0 ? (
                <EmptyState title="Nothing waiting" description="No transfers need your signature today." />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Expiry watch"
              subtitle="Batches expiring within 90 days"
              action={<Link href={`/inventory?facility=${facility.id}&tab=expiry`} className="text-[11px] font-medium text-brand hover:underline">View all</Link>}
            />
            <div className="divide-y divide-line">
              {expiryWatch.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-ink">{batch.medicineName}</p>
                    <p className="truncate font-mono text-[9px] text-muted">{batch.batchNumber}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`tabular text-[11px] font-semibold ${batch.daysToExpiry <= 30 ? "text-danger" : "text-warn"}`}>
                      {batch.daysToExpiry}d
                    </p>
                    <p className="text-[9px] text-muted">{formatNumber(batch.quantityRemaining)} left</p>
                  </div>
                </div>
              ))}
              {expiryWatch.length === 0 ? (
                <EmptyState title="No near-expiry batches" description="Nothing expires in the next 90 days." />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Facility record" subtitle="Where this queue is scoped" />
            <CardBody className="space-y-2.5 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Facility</span>
                <span className="text-right font-medium text-ink">{facility.shortName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">LGA</span>
                <span className="text-ink">{facility.lga}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Stock value</span>
                <span className="tabular text-ink">
                  {formatNaira(series.reduce((s, x) => s + x.usableValue, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Next expiry</span>
                <span className="text-ink">
                  {expiryWatch[0] ? formatDate(new Date(expiryWatch[0].expiryDate)) : "N/A"}
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-warn-soft/60 px-2.5 py-2 text-[10px] leading-relaxed text-warn">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                Simulated inventory. Do not treat these quantities as clinical stock.
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
