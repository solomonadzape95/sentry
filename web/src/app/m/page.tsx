import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { DEMO_TODAY } from "@/lib/config";
import {
  formatDate,
  formatNaira,
  formatNumber,
  formatShortDate,
} from "@/lib/format";
import { getNetworkData, getRecentMovements } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { FacilitySwitcher } from "@/components/facility-switcher";
import { OfflineQueueCard } from "@/components/mobile/offline-queue-card";
import { RiskBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MobileHomePage() {
  const [scope, data] = await Promise.all([getScope(), getNetworkData()]);
  const facility = scope.activeFacility;
  if (!facility) {
    return (
      <div className="p-4">
        <EmptyState
          title="No facility assigned"
          description="This persona has no facility scope. Switch to a facility manager or network authority."
          action={<Link href="/home" className="text-xs font-medium text-brand underline">Open desktop dashboard</Link>}
        />
      </div>
    );
  }

  const movements = await getRecentMovements(facility.id, 6);
  const series = data.series.filter((s) => s.facilityId === facility.id);
  const atRisk = series
    .filter((s) => s.risk !== "LOW" && s.avgDailyDemand > 0)
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
  const alerts = data.alerts
    .filter((a) => a.facilityId === facility.id && a.severity !== "LOW")
    .slice(0, 4);
  const firstName = scope.persona.name.replace(/^Dr\.?\s+/i, "").split(" ")[0];
  const top = atRisk[0];

  const stockValue = series.reduce((s, x) => s + x.usableValue, 0);
  const expiring = series.reduce((s, x) => s + x.nearExpiryValue, 0);
  const batches = series.reduce(
    (s, x) => s + x.batches.filter((b) => b.status === "ACTIVE").length,
    0,
  );

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
            {formatDate(DEMO_TODAY)}
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">
            Good morning, {firstName}
          </h1>
        </div>
        <Sparkles className="mb-1 h-4 w-4 text-brand/60" />
      </div>

      <FacilitySwitcher
        facilities={scope.facilities.map((f) => ({ id: f.id, shortName: f.shortName }))}
        currentId={facility.id}
        className="w-full justify-between"
      />

      {top ? (
        <Link
          href={`/forecasts?facility=${facility.id}&medicine=${top.medicineId}`}
          className="block overflow-hidden rounded-2xl bg-brand-dark p-4 text-white shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#ccb7a3]">
              Action needed
            </p>
            <RiskBadge risk={top.risk} compact />
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug">
            {top.genericName} runs out in {Math.max(1, Math.floor(top.daysToStockout ?? 0))} days
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/55">
            {formatNumber(top.usable)} {top.unit}s on hand · {top.avgDailyDemand.toFixed(1)}/day forecast
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
            <span className="text-[10px] text-white/45">
              Next delivery {top.nextIncomingDate ? formatShortDate(top.nextIncomingDate) : "none confirmed"}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#ccb7a3]">
              View forecast <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      ) : (
        <div className="rounded-2xl border border-ok/20 bg-ok-soft px-4 py-3 text-xs text-ok">
          All medicine lines have healthy cover.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/m/scan" className="rounded-2xl border border-line bg-surface p-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
            <ScanLine className="h-4 w-4" />
          </div>
          <p className="mt-2.5 text-xs font-semibold text-ink">Scan medicine</p>
          <p className="mt-0.5 text-[10px] text-muted">Barcode or manual entry</p>
        </Link>
        <Link href="/m/issue" className="rounded-2xl border border-line bg-surface p-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-warn-soft text-warn">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <p className="mt-2.5 text-xs font-semibold text-ink">Issue stock</p>
          <p className="mt-0.5 text-[10px] text-muted">FEFO deduction</p>
        </Link>
        <Link href="/m/issue?mode=receive" className="rounded-2xl border border-line bg-surface p-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ok-soft text-ok">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
          <p className="mt-2.5 text-xs font-semibold text-ink">Receive stock</p>
          <p className="mt-0.5 text-[10px] text-muted">Batch and expiry</p>
        </Link>
        <Link href="/m/count" className="rounded-2xl border border-line bg-surface p-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-canvas text-muted">
            <ClipboardList className="h-4 w-4" />
          </div>
          <p className="mt-2.5 text-xs font-semibold text-ink">Stock counts</p>
          <p className="mt-0.5 text-[10px] text-muted">Physical verification</p>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[9px] uppercase tracking-wide text-muted">Stock value</p>
          <p className="tabular mt-1 text-sm font-semibold text-ink">{formatNaira(stockValue)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[9px] uppercase tracking-wide text-muted">At risk</p>
          <p className={`tabular mt-1 text-sm font-semibold ${atRisk.length ? "text-danger" : "text-ok"}`}>
            {atRisk.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[9px] uppercase tracking-wide text-muted">Expiring</p>
          <p className={`tabular mt-1 text-sm font-semibold ${expiring ? "text-warn" : "text-ink"}`}>
            {formatNaira(expiring)}
          </p>
        </div>
      </div>

      <OfflineQueueCard />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-ink">Stock alerts</h2>
          <Link href={`/facilities/${facility.id}`} className="text-[10px] font-medium text-brand">
            Open facility
          </Link>
        </div>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-2.5 px-3.5 py-3">
              <span
                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                  alert.severity === "CRITICAL"
                    ? "bg-danger"
                    : alert.severity === "HIGH"
                      ? "bg-warn"
                      : "bg-[#eaaa08]"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-ink">{alert.medicineName}</p>
                <p className="mt-0.5 text-[10px] text-muted">{alert.message}</p>
              </div>
              {alert.date ? (
                <span className="shrink-0 text-[9px] text-muted">{formatShortDate(alert.date)}</span>
              ) : null}
            </div>
          ))}
          {alerts.length === 0 ? (
            <div className="px-3.5 py-6 text-center text-[11px] text-muted">
              No open alerts for this facility.
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-ink">Recent activity</h2>
          <span className="text-[10px] text-muted">{batches} active batches</span>
        </div>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {movements.slice(0, 5).map((m) => {
            const positive = m.quantity > 0;
            return (
              <div key={m.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                <div className={`grid h-7 w-7 place-items-center rounded-lg ${positive ? "bg-ok-soft text-ok" : "bg-canvas text-muted"}`}>
                  {positive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-ink">{m.medicine.genericName}</p>
                  <p className="text-[9px] text-muted">
                    {m.type.replaceAll("_", " ").toLowerCase()} · {formatShortDate(m.occurredAt)}
                  </p>
                </div>
                <p className={`tabular text-[11px] font-semibold ${positive ? "text-ok" : "text-ink"}`}>
                  {positive ? "+" : ""}
                  {formatNumber(m.quantity)}
                </p>
              </div>
            );
          })}
          {movements.length === 0 ? (
            <EmptyState title="No activity yet" description="Receive or issue stock to start the audit trail." />
          ) : null}
        </div>
      </section>

      <div className="rounded-xl border border-dashed border-line px-3.5 py-3">
        <p className="text-[10px] leading-relaxed text-muted">
          <span className="font-medium text-ink">Demo tip:</span> switch the browser offline, record an
          issue, then reconnect and sync from the Queue tab. Every operation keeps a client ID to prevent
          duplicate posting.
        </p>
      </div>
    </div>
  );
}
