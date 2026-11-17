import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  ClipboardList,
  Package,
  ScanBarcode,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  DEMO_TODAY,
  FACILITY_TYPE_LABEL,
} from "@/lib/config";
import {
  formatDate,
  formatDateTime,
  formatDays,
  formatNaira,
  formatNumber,
} from "@/lib/format";
import { getNetworkData, getRecentMovements } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { FacilitySwitcher } from "@/components/facility-switcher";
import { StockActions } from "@/components/stock-actions";
import { EmptyState } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const [scope, data] = await Promise.all([getScope(), getNetworkData()]);
  const requested = data.facilities.find((f) => f.id === params.facility);
  const allowed = requested
    ? scope.persona.role === "NETWORK_AUTHORITY" ||
      scope.persona.memberships.some((m) => m.facilityId === requested.id)
    : false;
  const facility = (allowed ? requested : null) ?? scope.activeFacility;
  if (!facility) {
    return (
      <div>
        <PageHeader title="Inventory" description="No facility is assigned to this persona." />
        <Card>
          <EmptyState
            title="No facility scope"
            description="Switch to a facility manager or network authority persona to manage inventory."
          />
        </Card>
      </div>
    );
  }

  const [movements, medicines, suppliers] = await Promise.all([
    getRecentMovements(facility.id, 16),
    prisma.medicine.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  const allSeries = data.series
    .filter((s) => s.facilityId === facility.id)
    .sort((a, b) => a.genericName.localeCompare(b.genericName));
  const tab = params.tab ?? "all";
  const series =
    tab === "risk"
      ? allSeries.filter((s) => s.risk !== "LOW" && s.avgDailyDemand > 0)
      : tab === "expiry"
        ? allSeries.filter((s) => s.nearExpiry > 0)
        : allSeries;

  const usableUnits = allSeries.reduce((s, x) => s + x.usable, 0);
  const stockValue = allSeries.reduce((s, x) => s + x.usableValue, 0);
  const expiringValue = allSeries.reduce((s, x) => s + x.nearExpiryValue, 0);
  const expiredValue = allSeries.reduce((s, x) => s + x.expiredValue, 0);
  const riskCount = allSeries.filter((s) => s.risk === "CRITICAL" || s.risk === "HIGH").length;
  const activeBatches = allSeries.flatMap((s) =>
    s.batches
      .filter((b) => b.quantityRemaining > 0)
      .map((b) => ({ ...b, medicineName: s.genericName, unit: s.unit, facilityId: s.facilityId })),
  );
  const nearExpiryBatches = activeBatches.filter((b) => b.daysToExpiry > 0 && b.daysToExpiry <= 90);

  const tabs = [
    { key: "all", label: `All lines (${allSeries.length})` },
    { key: "risk", label: `At risk (${allSeries.filter((s) => s.risk !== "LOW" && s.avgDailyDemand > 0).length})` },
    { key: "expiry", label: `Near expiry (${allSeries.filter((s) => s.nearExpiry > 0).length})` },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <Boxes className="h-3.5 w-3.5" />
            {FACILITY_TYPE_LABEL[facility.type] ?? facility.type} · {facility.lga}
          </>
        }
        title="Inventory control"
        description="Batch-level stock with FEFO issue, expiry control and an auditable movement trail."
        actions={
          <>
            <FacilitySwitcher
              facilities={scope.facilities.map((f) => ({ id: f.id, shortName: f.shortName }))}
              currentId={facility.id}
            />
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

      {expiredValue > 0 ? (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-warn/20 bg-warn-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <p className="text-xs text-warn">
              <span className="font-semibold">{formatNaira(expiredValue)}</span> of expired stock is
              quarantined and excluded from usable inventory. Review the batch register before disposal.
            </p>
          </div>
          <Link href="#batches" className="shrink-0 text-[11px] font-semibold text-warn underline">
            Review batches
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          label="Usable units"
          value={formatNumber(usableUnits)}
          sub={`${activeBatches.length} active batches`}
          icon={<Package className="h-4 w-4" />}
        />
        <Stat
          label="Usable stock value"
          value={formatNaira(stockValue)}
          sub={`${allSeries.length} medicine lines`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <Stat
          label="Critical or high risk"
          value={riskCount}
          sub="lines under 14 days cover"
          icon={<ShieldIcon />}
          tone={riskCount > 0 ? "danger" : "success"}
        />
        <Stat
          label="Expiring within 60 days"
          value={formatNaira(expiringValue)}
          sub={`${nearExpiryBatches.length} batches to action`}
          icon={<CalendarClock className="h-4 w-4" />}
          tone={expiringValue > 0 ? "warning" : "default"}
        />
      </div>

      <Card className="mt-5">
        <CardHeader
          title={`${facility.shortName} medicine register`}
          subtitle="Usable stock excludes expired and quarantined batches"
          action={
            <div className="flex flex-wrap gap-1">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  href={`/inventory?facility=${facility.id}&tab=${t.key}`}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-medium",
                    tab === t.key ? "bg-brand text-white" : "bg-canvas text-muted ring-1 ring-line hover:text-ink",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                <th className="px-5 py-2.5 font-medium">Medicine</th>
                <th className="px-3 py-2.5 font-medium">Barcode</th>
                <th className="px-3 py-2.5 font-medium">On hand</th>
                <th className="px-3 py-2.5 font-medium">Batches</th>
                <th className="px-3 py-2.5 font-medium">Nearest expiry</th>
                <th className="px-3 py-2.5 font-medium">Forecast</th>
                <th className="px-3 py-2.5 font-medium">Cover</th>
                <th className="px-3 py-2.5 font-medium">Reorder</th>
                <th className="px-5 py-2.5 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => {
                const active = s.batches.filter((b) => b.status === "ACTIVE");
                return (
                  <tr key={s.medicineId} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{s.genericName}</p>
                      <p className="text-[10px] text-muted">
                        {s.strength} · {s.category.replaceAll("_", " ").toLowerCase()} · {s.unit}s
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="tabular inline-flex items-center gap-1 rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-muted">
                        <ScanBarcode className="h-3 w-3" />
                        {s.medicineId ? medicines.find((m) => m.id === s.medicineId)?.barcode ?? "—" : "—"}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3 font-medium">{formatNumber(s.usable)}</td>
                    <td className="px-3 py-3 text-muted">
                      {active.length}
                      {s.expired > 0 ? <span className="ml-1 text-danger">+{s.expired} expired</span> : null}
                    </td>
                    <td className="px-3 py-3">
                      {active.length ? (
                        <div>
                          <p className="tabular">{formatDate(active[0].expiryDate)}</p>
                          <p className={`text-[10px] ${active[0].daysToExpiry <= 60 ? "text-warn" : "text-muted"}`}>
                            {active[0].daysToExpiry} days
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="tabular px-3 py-3 text-muted">{s.avgDailyDemand.toFixed(1)}/day</td>
                    <td className="px-3 py-3">
                      <span className={`tabular font-medium ${s.risk === "CRITICAL" ? "text-danger" : s.risk === "HIGH" ? "text-warn" : "text-ink"}`}>
                        {formatDays(s.daysToStockout)}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3">
                      {s.reorderQty > 0 ? (
                        <div>
                          <p className="font-medium text-ink">{formatNumber(s.reorderQty)}</p>
                          {s.expedite ? <p className="text-[9px] font-medium text-danger">Expedite</p> : null}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <RiskBadge risk={s.risk} compact />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {series.length === 0 ? (
          <EmptyState
            title="Nothing in this view"
            description="Try another filter or receive stock to create a batch."
          />
        ) : null}
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <Card id="batches">
          <CardHeader
            title="Batch register"
            subtitle="Ordered by expiry · First-Expiry-First-Out"
            action={<Badge tone="brand">FEFO</Badge>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-2.5 font-medium">Medicine / batch</th>
                  <th className="px-3 py-2.5 font-medium">Received</th>
                  <th className="px-3 py-2.5 font-medium">Remaining</th>
                  <th className="px-3 py-2.5 font-medium">Expiry</th>
                  <th className="px-3 py-2.5 font-medium">Value</th>
                  <th className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeBatches
                  .slice()
                  .sort((a, b) => {
                    if (a.medicineName === b.medicineName) return a.daysToExpiry - b.daysToExpiry;
                    return a.medicineName.localeCompare(b.medicineName);
                  })
                  .slice(0, 30)
                  .map((b) => (
                    <tr key={b.id} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-ink">{b.medicineName}</p>
                        <p className="font-mono text-[10px] text-muted">{b.batchNumber}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-muted">{formatDate(b.receivedAt)}</td>
                      <td className="tabular px-3 py-2.5">{formatNumber(b.quantityRemaining)} {b.unit}s</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="tabular text-[11px]">{formatDate(b.expiryDate)}</span>
                          {b.daysToExpiry <= 60 ? (
                            <Badge tone={b.daysToExpiry <= 30 ? "danger" : "warning"}>{b.daysToExpiry}d</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="tabular px-3 py-2.5 text-muted">
                        {formatNaira(b.quantityRemaining * b.unitCostNgn)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Badge tone={b.status === "ACTIVE" ? "success" : b.status === "EXPIRED" ? "danger" : "neutral"}>
                          {b.status.toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent stock movements"
            subtitle="Audit trail across all medicines"
            action={<ClipboardList className="h-4 w-4 text-brand" />}
          />
          <div className="divide-y divide-line">
            {movements.map((m) => {
              const positive = m.quantity > 0;
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${positive ? "bg-ok-soft text-ok" : "bg-canvas text-muted"}`}>
                    {positive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-ink">{m.medicine.genericName}</p>
                    <p className="truncate text-[10px] text-muted">
                      {m.type.replaceAll("_", " ").toLowerCase()} · {m.reference}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`tabular text-[11px] font-semibold ${positive ? "text-ok" : "text-ink"}`}>
                      {positive ? "+" : ""}{formatNumber(m.quantity)}
                    </p>
                    <p className="text-[9px] text-muted">{formatDateTime(m.occurredAt)}</p>
                  </div>
                </div>
              );
            })}
            {movements.length === 0 ? <EmptyState title="No movements recorded" /> : null}
          </div>
        </Card>
      </div>

      <p className="mt-5 text-[10px] text-muted">
        Demo clock {formatDate(DEMO_TODAY)}. Receiving and issuing stock updates the live stockout
        projection; the underlying demand forecast is retrained by the Python pipeline.
      </p>
    </div>
  );
}

function ShieldIcon() {
  return <AlertTriangle className="h-4 w-4" />;
}
