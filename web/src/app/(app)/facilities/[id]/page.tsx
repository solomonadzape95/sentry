import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { DEMO_TODAY, FACILITY_TYPE_LABEL } from "@/lib/config";
import {
  addDays,
  formatDate,
  formatDateTime,
  formatDays,
  formatNaira,
  formatNumber,
  formatShortDate,
} from "@/lib/format";
import {
  getFacilityConsumption,
  getNetworkData,
  getRecentMovements,
} from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { MiniBar, Stat } from "@/components/ui/stat";
import { HistoryChart } from "@/components/charts/history-chart";
import { EmptyState } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

function weeklySeries(
  rows: { date: Date; quantity: number }[],
  weeks = 12,
): { date: string; label: string; value: number }[] {
  const buckets = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = addDays(DEMO_TODAY, -i * 7);
    const monday = addDays(d, -((d.getUTCDay() + 6) % 7));
    buckets.set(monday.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const d = row.date;
    const monday = addDays(d, -((d.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.quantity);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, label: date, value }));
}

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
  const facility = data.facilities.find((f) => f.id === id);
  if (!facility) notFound();
  const canSee =
    scope.persona.role === "NETWORK_AUTHORITY" ||
    scope.persona.memberships.some((m) => m.facilityId === facility.id);
  if (!canSee) notFound();

  const [consumption, movements] = await Promise.all([
    getFacilityConsumption(facility.id, 365),
    getRecentMovements(facility.id, 12),
  ]);

  const series = data.series
    .filter((s) => s.facilityId === facility.id)
    .sort((a, b) => a.genericName.localeCompare(b.genericName));
  const atRisk = series
    .filter((s) => s.risk !== "LOW" && s.avgDailyDemand > 0)
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
  const critical = atRisk.filter((s) => s.risk === "CRITICAL").length;
  const high = atRisk.filter((s) => s.risk === "HIGH").length;
  const medium = atRisk.filter((s) => s.risk === "MEDIUM").length;

  const selected =
    series.find((s) => s.medicineId === requestedMedicine) ??
    atRisk[0] ??
    [...series].sort(
      (a, b) =>
        consumption
          .filter((r) => r.medicineId === b.medicineId)
          .reduce((x, r) => x + r.quantity, 0) -
        consumption
          .filter((r) => r.medicineId === a.medicineId)
          .reduce((x, r) => x + r.quantity, 0),
    )[0];

  const selectedConsumption = consumption.filter((r) => r.medicineId === selected?.medicineId);
  const weekly = weeklySeries(selectedConsumption, 12);

  const stockValue = series.reduce((s, x) => s + x.usableValue, 0);
  const expiringValue = series.reduce((s, x) => s + x.nearExpiryValue, 0);
  const batchCount = series.reduce((s, x) => s + x.batches.filter((b) => b.status === "ACTIVE").length, 0);

  const expiryWatch = series
    .flatMap((s) =>
      s.batches
        .filter((b) => b.quantityRemaining > 0 && b.daysToExpiry > 0 && b.daysToExpiry <= 90)
        .map((b) => ({ ...b, medicineName: s.genericName, unit: s.unit })),
    )
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .slice(0, 6);

  const incoming = series
    .flatMap((s) => s.incoming.map((po) => ({ ...po, medicineName: s.genericName, unit: s.unit })))
    .sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));

  const topMedicines = [...series]
    .sort(
      (a, b) =>
        consumption
          .filter((r) => r.medicineId === b.medicineId)
          .reduce((x, r) => x + r.quantity, 0) -
        consumption
          .filter((r) => r.medicineId === a.medicineId)
          .reduce((x, r) => x + r.quantity, 0),
    )
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <MapPin className="h-3.5 w-3.5" />
            {FACILITY_TYPE_LABEL[facility.type] ?? facility.type} · {facility.lga}, {facility.state}
          </>
        }
        title={facility.name}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> {facility.address}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> {facility.phone}
            </span>
            {facility.bedCount ? <span>{facility.bedCount} beds</span> : null}
          </span>
        }
        actions={
          <>
            <Link
              href={`/forecasts?facility=${facility.id}&medicine=${selected?.medicineId ?? ""}`}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Forecasts
            </Link>
            <Link
              href={`/inventory?facility=${facility.id}`}
              className={buttonClass({ variant: "primary", size: "sm" })}
            >
              <Boxes className="h-3.5 w-3.5" />
              Open inventory
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          label="Usable stock value"
          value={formatNaira(stockValue)}
          sub={`${batchCount} active batches`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <Stat
          label="Medicine lines"
          value={series.length}
          sub={`${atRisk.length} under 30-day cover`}
          icon={<Package className="h-4 w-4" />}
        />
        <Stat
          label="Critical lines"
          value={critical}
          sub={critical > 0 ? "Stockout before supplier lead time" : "No immediate stockouts"}
          icon={<ShieldAlert className="h-4 w-4" />}
          tone={critical > 0 ? "danger" : "success"}
        />
        <Stat
          label="Expiring in 60 days"
          value={formatNaira(expiringValue)}
          sub={`${expiryWatch.length} batches to review`}
          icon={<CalendarClock className="h-4 w-4" />}
          tone={expiringValue > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Consumption trend"
              subtitle={
                selected
                  ? `${selected.genericName} · last 12 weeks · ${selected.unit}s dispensed`
                  : "No consumption history"
              }
              action={
                selected ? (
                  <Badge tone="neutral">{formatNumber(weekly.reduce((s, w) => s + w.value, 0))} total</Badge>
                ) : null
              }
            />
            <CardBody className="pt-3">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {topMedicines.map((m) => (
                  <Link
                    key={m.medicineId}
                    href={`/facilities/${facility.id}?medicine=${m.medicineId}`}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      m.medicineId === selected?.medicineId
                        ? "bg-brand text-white"
                        : "bg-canvas text-muted ring-1 ring-line hover:text-ink"
                    }`}
                  >
                    {m.genericName}
                  </Link>
                ))}
              </div>
              <HistoryChart data={weekly} height={240} unit={selected?.unit ?? "units"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Medicine lines"
              subtitle="Live stock, forecast cover and replenishment signal"
              action={
                <Link href={`/inventory?facility=${facility.id}`} className="text-[11px] font-medium text-brand hover:underline">
                  Manage inventory
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-2.5 font-medium">Medicine</th>
                    <th className="px-3 py-2.5 font-medium">On hand</th>
                    <th className="px-3 py-2.5 font-medium">Batches</th>
                    <th className="px-3 py-2.5 font-medium">Demand</th>
                    <th className="px-3 py-2.5 font-medium">Cover</th>
                    <th className="px-3 py-2.5 font-medium">Reorder</th>
                    <th className="px-3 py-2.5 font-medium">Risk</th>
                    <th className="px-5 py-2.5 text-right font-medium">Forecast</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => (
                    <tr key={s.medicineId} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{s.genericName}</p>
                        <p className="text-[10px] text-muted">{s.category.replace("_", " ").toLowerCase()}</p>
                      </td>
                      <td className="tabular px-3 py-3">{formatNumber(s.usable)}</td>
                      <td className="tabular px-3 py-3 text-muted">{s.batches.filter((b) => b.status === "ACTIVE").length}</td>
                      <td className="tabular px-3 py-3 text-muted">{s.avgDailyDemand.toFixed(1)}/d</td>
                      <td className="px-3 py-3">
                        <span className={`tabular font-medium ${s.risk === "CRITICAL" ? "text-danger" : s.risk === "HIGH" ? "text-warn" : "text-ink"}`}>
                          {formatDays(s.daysToStockout)}
                        </span>
                      </td>
                      <td className="tabular px-3 py-3">
                        {s.reorderQty > 0 ? (
                          <span className="font-medium text-ink">{formatNumber(s.reorderQty)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3"><RiskBadge risk={s.risk} compact /></td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/forecasts?facility=${facility.id}&medicine=${s.medicineId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                        >
                          Open <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent stock movement" subtitle="Last recorded inventory activity" />
            <div className="divide-y divide-line">
              {movements.slice(0, 8).map((m) => {
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
                <EmptyState title="No stock movement yet" description="Receive or issue stock to start the audit trail." />
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Stock health" subtitle="Medicine lines by projected cover" />
            <CardBody className="space-y-4">
              {[
                { label: "Critical · under 7 days", value: critical, tone: "danger" as const, total: series.length },
                { label: "High · 7–14 days", value: high, tone: "warn" as const, total: series.length },
                { label: "Watch · 15–30 days", value: medium, tone: "brand" as const, total: series.length },
                { label: "Stable · 30+ days", value: series.length - atRisk.length, tone: "muted" as const, total: series.length },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-muted">{row.label}</span>
                    <span className="tabular font-medium text-ink">{row.value}</span>
                  </div>
                  <MiniBar value={row.value} max={series.length} tone={row.tone} />
                </div>
              ))}
              <div className="border-t border-line pt-3">
                <p className="text-[10px] leading-relaxed text-muted">
                  Cover is computed from current usable stock, confirmed deliveries and the live forecast demand curve.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Expiry watch"
              subtitle="Batches expiring within 90 days"
              action={<Badge tone={expiryWatch.length ? "warning" : "success"}>{expiryWatch.length}</Badge>}
            />
            <div className="divide-y divide-line">
              {expiryWatch.map((b) => (
                <div key={`${b.id}`} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-ink">{b.medicineName}</p>
                      <p className="text-[10px] text-muted">Batch {b.batchNumber}</p>
                    </div>
                    <Badge tone={b.daysToExpiry <= 30 ? "danger" : "warning"}>{b.daysToExpiry}d</Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    {formatNumber(b.quantityRemaining)} {b.unit}s · {formatDate(b.expiryDate)}
                  </p>
                </div>
              ))}
              {expiryWatch.length === 0 ? (
                <EmptyState title="No near-expiry batches" description="All active batches have more than 90 days of shelf life." />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Incoming deliveries"
              subtitle="Confirmed purchase orders"
              action={<Truck className="h-4 w-4 text-brand" />}
            />
            <div className="divide-y divide-line">
              {incoming.map((po) => (
                <div key={po.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-ink">{po.medicineName}</p>
                    <p className="text-[10px] text-muted">{po.reference} · {po.supplierName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[11px] font-medium">{formatNumber(po.quantity)}</p>
                    <p className="text-[9px] text-muted">{formatShortDate(po.expectedAt)}</p>
                  </div>
                </div>
              ))}
              {incoming.length === 0 ? (
                <EmptyState title="No confirmed deliveries" description="Orders will appear here once confirmed by a supplier." />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Facility profile" />
            <CardBody className="space-y-2 text-[11px] text-muted">
              <p className="flex justify-between gap-3"><span>Type</span><span className="font-medium text-ink">{FACILITY_TYPE_LABEL[facility.type] ?? facility.type}</span></p>
              <p className="flex justify-between gap-3"><span>Ownership</span><span className="font-medium capitalize text-ink">{facility.ownership.replace("_", " ").toLowerCase()}</span></p>
              <p className="flex justify-between gap-3"><span>LGA</span><span className="font-medium text-ink">{facility.lga}</span></p>
              <p className="flex justify-between gap-3"><span>Contact</span><span className="font-medium text-ink">{facility.contactName}</span></p>
              <p className="flex justify-between gap-3"><span>Last data update</span><span className="font-medium text-ink">{formatDate(DEMO_TODAY)}</span></p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
