import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CloudRain,
  Package,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { DEMO_META, DEMO_TODAY } from "@/lib/config";
import {
  addDays,
  formatDate,
  formatDays,
  formatNaira,
  formatNumber,
  formatPct,
  formatShortDate,
} from "@/lib/format";
import { getNetworkData, getSignals } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat, Sparkline, MiniBar } from "@/components/ui/stat";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { FacilityMap } from "@/components/facility-map";
import { EmptyState } from "@/components/ui/page-header";
import type { StockSeries } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

function facilityRisk(series: StockSeries[]) {
  const critical = series.filter((s) => s.risk === "CRITICAL" && s.avgDailyDemand > 0).length;
  const high = series.filter((s) => s.risk === "HIGH" && s.avgDailyDemand > 0).length;
  const medium = series.filter((s) => s.risk === "MEDIUM" && s.avgDailyDemand > 0).length;
  const risk = critical > 0 ? "CRITICAL" : high > 0 ? "HIGH" : medium > 0 ? "MEDIUM" : "LOW";
  return { critical, high, watch: high + medium, risk } as const;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default async function NetworkOverviewPage() {
  const [scope, data, signals] = await Promise.all([
    getScope(),
    getNetworkData(),
    getSignals(),
  ]);

  if (scope.persona.role !== "NETWORK_AUTHORITY") {
    redirect(scope.activeFacility ? `/facilities/${scope.activeFacility.id}` : "/inventory");
  }

  const hero = DEMO_META.scenario;
  const heroSeries = data.series.find(
    (s) => s.facilityId === hero.heroFacilityId && s.medicineId === hero.heroMedicineId,
  );
  const actRows = await prisma.consumptionRecord.findMany({
    where: {
      facilityId: hero.heroFacilityId,
      medicineId: hero.heroMedicineId,
      date: { gte: addDays(DEMO_TODAY, -90) },
    },
    orderBy: { date: "asc" },
  });
  const nonStockout = actRows.filter((r) => !r.wasStockout);
  const preSurge = nonStockout.slice(0, Math.max(1, nonStockout.length - 42));
  const baseline28 = average(preSurge.slice(-28).map((r) => r.quantity));
  const forecastDaily = heroSeries?.avgDailyDemand ?? 0;
  const demandChange = baseline28 > 0 ? forecastDaily / baseline28 - 1 : 0;

  const heroOpportunity =
    data.opportunities.find(
      (o) => o.toFacilityId === hero.heroFacilityId && o.medicineId === hero.heroMedicineId,
    ) ?? data.opportunities[0];

  const atRisk = data.series
    .filter((s) => s.risk !== "LOW" && s.avgDailyDemand > 0)
    .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
  const topRisk = atRisk.slice(0, 7);

  const malaria = signals.disease.filter((d) => d.disease === "MALARIA");
  const latestMalaria = malaria.at(-1)?.cases ?? 0;
  const priorMalaria = average(malaria.slice(-5, -1).map((d) => d.cases));
  const malariaChange = priorMalaria > 0 ? latestMalaria / priorMalaria - 1 : 0;
  const malariaSpark = malaria.slice(-12).map((d) => d.cases);

  const weather = signals.weather;
  const rainLast14 = weather.slice(-14).reduce((s, w) => s + w.rainfallMm, 0);
  const rainPrior14 = weather.slice(-28, -14).reduce((s, w) => s + w.rainfallMm, 0);
  const rainChange = rainPrior14 > 0 ? rainLast14 / rainPrior14 - 1 : 0;
  const rainSpark = weather.slice(-30).map((w) => w.rainfallMm);

  const facilityRows = data.facilities.map((facility) => {
    const series = data.series.filter((s) => s.facilityId === facility.id);
    return { facility, series, ...facilityRisk(series) };
  });

  const opportunities = data.opportunities
    .filter((o) => o.id !== heroOpportunity?.id)
    .slice(0, 2);

  const heroQuery = heroOpportunity
    ? new URLSearchParams({
        from: heroOpportunity.fromFacilityId,
        to: heroOpportunity.toFacilityId,
        medicine: heroOpportunity.medicineId,
        qty: String(heroOpportunity.quantity),
        batch: heroOpportunity.batchId ?? "",
      }).toString()
    : "";

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-brand" />
            FCT demonstration network · {formatDate(DEMO_TODAY)}
          </>
        }
        title="Supply command centre"
        description="One view of what facilities hold, what they will need, and where stock should move next."
        actions={
          <>
            <Link href="/forecasts" className={buttonClass({ variant: "secondary", size: "sm" })}>
              <TrendingUp className="h-3.5 w-3.5" />
              Forecasts
            </Link>
            <Link href="/m" className={buttonClass({ variant: "primary", size: "sm" })}>
              Open mobile app
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      {heroOpportunity ? (
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-brand-dark px-5 py-4 text-white shadow-sm sm:px-6">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_right,rgba(143,227,205,0.16),transparent_65%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                <Sparkles className="h-4 w-4 text-[#8fe3cd]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fe3cd]">
                  Next best action
                </p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/90">
                  <span className="font-semibold text-white">{heroOpportunity.toFacilityName}</span>{" "}
                  runs out of {heroOpportunity.genericName} in{" "}
                  <span className="font-semibold text-white">
                    {Math.max(1, Math.floor(heroOpportunity.daysToStockout ?? 0))} days
                  </span>
                  . {heroOpportunity.fromFacilityName} holds{" "}
                  <span className="font-semibold text-white">
                    {formatNumber(heroOpportunity.surplus)} {heroOpportunity.unit}s
                  </span>{" "}
                  above safe cover; moving{" "}
                  <span className="font-semibold text-white">
                    {formatNumber(heroOpportunity.quantity)} {heroOpportunity.unit}s
                  </span>{" "}
                  closes the gap.
                </p>
              </div>
            </div>
            <Link
              href={`/transfers?${heroQuery}`}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-[#8fe3cd] px-4 text-xs font-semibold text-brand-deep hover:bg-[#a8edd9] sm:self-auto"
            >
              Review transfer
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          label="Facilities at risk"
          value={`${data.totals.atRiskFacilities} / ${data.totals.facilities}`}
          sub={`${data.totals.criticalSeries} critical medicine lines · ${data.totals.highSeries} high risk`}
          icon={<ShieldAlert className="h-4 w-4" />}
          tone={data.totals.atRiskFacilities > 0 ? "danger" : "success"}
        />
        <Stat
          label="Predicted stockouts"
          value={data.totals.criticalSeries + data.totals.highSeries}
          sub="within 14 days across the network"
          icon={<CalendarClock className="h-4 w-4" />}
          tone="warning"
        />
        <Stat
          label="Usable stock value"
          value={formatNaira(data.totals.stockValue)}
          sub={`${formatNumber(data.totals.seriesCount)} medicine lines tracked`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <Stat
          label="Expiry exposure"
          value={formatNaira(data.totals.expiringValue)}
          sub="value expiring within 90 days"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={data.totals.expiringValue > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.58fr)_minmax(340px,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Network map"
              subtitle="FCT demonstration facilities · position is illustrative"
              action={
                <Badge tone="brand" dot>
                  Live projection
                </Badge>
              }
            />
            <CardBody className="pb-3 pt-4">
              <FacilityMap
                facilities={facilityRows.map((row) => ({
                  id: row.facility.id,
                  shortName: row.facility.shortName,
                  risk: row.risk,
                  critical: row.critical,
                  watch: row.watch,
                }))}
                opportunity={
                  heroOpportunity
                    ? {
                        fromFacilityId: heroOpportunity.fromFacilityId,
                        toFacilityId: heroOpportunity.toFacilityId,
                        quantity: heroOpportunity.quantity,
                        medicineName: heroOpportunity.medicineName,
                      }
                    : null
                }
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {facilityRows.map((row) => (
                  <Link
                    key={row.facility.id}
                    href={`/facilities/${row.facility.id}`}
                    className="group rounded-xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-brand/25 hover:bg-brand-soft/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-semibold text-ink">{row.facility.shortName}</p>
                      <RiskBadge risk={row.risk} compact />
                    </div>
                    <p className="mt-1 text-[10px] text-muted">
                      {formatNaira(row.series.reduce((s, x) => s + x.usableValue, 0))} stock ·{" "}
                      {row.critical + row.watch} on watch
                    </p>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Stockout radar"
              subtitle="Medicine lines ranked by projected days of cover"
              action={
                <Link href="/forecasts" className="text-[11px] font-medium text-brand hover:underline">
                  All forecasts
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-2.5 font-medium">Facility / medicine</th>
                    <th className="px-3 py-2.5 font-medium">On hand</th>
                    <th className="px-3 py-2.5 font-medium">Forecast</th>
                    <th className="px-3 py-2.5 font-medium">Cover</th>
                    <th className="px-3 py-2.5 font-medium">Risk</th>
                    <th className="px-5 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topRisk.map((s) => (
                    <tr key={`${s.facilityId}:${s.medicineId}`} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{s.genericName}</p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {s.facilityShortName} · {s.strength}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="tabular font-medium">{formatNumber(s.usable)}</p>
                        <p className="text-[10px] text-muted">{s.unit}s usable</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Sparkline
                            values={(s.forecast?.points ?? []).slice(0, 14).map((p) => p.predicted)}
                            width={64}
                            height={22}
                            stroke={s.risk === "CRITICAL" ? "#b42318" : "#0d7666"}
                          />
                          <span className="tabular text-[10px] text-muted">
                            {s.avgDailyDemand.toFixed(1)}/d
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className={`tabular font-semibold ${s.risk === "CRITICAL" ? "text-danger" : s.risk === "HIGH" ? "text-warn" : "text-ink"}`}>
                          {formatDays(s.daysToStockout)}
                        </p>
                        <p className="text-[10px] text-muted">{formatShortDate(s.stockoutDate)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <RiskBadge risk={s.risk} compact />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/forecasts?facility=${s.facilityId}&medicine=${s.medicineId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                        >
                          Forecast <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {topRisk.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          title="No stockout risks detected"
                          description="Every medicine line has more than 30 days of forecast cover."
                        />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Transfer opportunities"
              subtitle={`${data.opportunities.length} match${data.opportunities.length === 1 ? "" : "es"} between shortage and verified surplus`}
              action={
                <Link href="/transfers" className="text-[11px] font-medium text-brand hover:underline">
                  View all
                </Link>
              }
            />
            <CardBody className="space-y-3">
              {heroOpportunity ? (
                <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="brand" dot>
                      Recommended
                    </Badge>
                    <RiskBadge risk={heroOpportunity.urgency} compact />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-ink">
                    {heroOpportunity.genericName}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {heroOpportunity.fromFacilityName} → {heroOpportunity.toFacilityName}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="tabular text-xl font-semibold text-brand-dark">
                        {formatNumber(heroOpportunity.quantity)}
                      </p>
                      <p className="text-[10px] text-muted">{heroOpportunity.unit}s · covers {formatDays(heroOpportunity.daysCoveredAfter)}</p>
                    </div>
                    <Link
                      href={`/transfers?${heroQuery}`}
                      className={buttonClass({ variant: "primary", size: "sm" })}
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted">No transfer matches right now.</p>
              )}

              {opportunities.map((o) => (
                <div key={o.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-ink">{o.genericName}</p>
                    <RiskBadge risk={o.urgency} compact />
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    {o.fromFacilityName} → {o.toFacilityName}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted">
                    <span className="tabular font-medium text-ink">{formatNumber(o.quantity)}</span> {o.unit}s ·{" "}
                    {Math.max(1, Math.floor(o.daysToStockout ?? 0))} days cover now
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Demand signals" subtitle="Why the forecast is moving" />
            <CardBody className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-ink">Malaria cases · FCT</p>
                    <Badge tone={malariaChange > 0 ? "danger" : "success"}>
                      {malariaChange > 0 ? "+" : ""}
                      {formatPct(malariaChange)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {formatNumber(latestMalaria)} cases last week · illustrative signal
                  </p>
                  <Sparkline values={malariaSpark} stroke="#b42318" width={200} height={26} className="mt-1 w-full" />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info">
                  <CloudRain className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-ink">Rainfall · Abuja</p>
                    <Badge tone="info">
                      {rainLast14.toFixed(1)} mm
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Last 14 days · {rainChange >= 0 ? "up" : "down"} {formatPct(Math.abs(rainChange))} vs prior period
                  </p>
                  <Sparkline values={rainSpark} stroke="#175cd3" width={200} height={26} className="mt-1 w-full" />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-ink">ACT demand · {heroSeries?.facilityShortName ?? "PHC"}</p>
                    <Badge tone={demandChange > 0 ? "warning" : "success"}>
                      {demandChange > 0 ? "+" : ""}
                      {formatPct(demandChange)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Forecast vs pre-surge 28-day baseline · simulated consumption
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <MiniBar
                      value={Math.max(0, demandChange)}
                      max={1}
                      tone={demandChange > 0 ? "warn" : "brand"}
                      className="max-w-[200px]"
                    />
                    <span className="tabular text-[10px] text-muted">
                      {heroSeries?.avgDailyDemand.toFixed(1)}/day forecast
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card id="alerts">
            <CardHeader
              title="Open alerts"
              subtitle={`${data.alerts.filter((a) => a.severity !== "LOW").length} require attention`}
              action={
                <Link href="/#alerts" className="text-[11px] font-medium text-brand hover:underline">
                  All alerts
                </Link>
              }
            />
            <div className="divide-y divide-line">
              {data.alerts
                .filter((a) => a.severity !== "LOW")
                .slice(0, 5)
                .map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2.5 px-5 py-3">
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
                      <p className="text-[11px] font-medium text-ink">{alert.message}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted">
                        {alert.facilityName} · {alert.medicineName}
                      </p>
                    </div>
                    {alert.date ? (
                      <span className="shrink-0 text-[9px] text-muted">{formatShortDate(alert.date)}</span>
                    ) : null}
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>

      <p className="mt-6 rounded-xl border border-dashed border-line px-4 py-3 text-[10px] leading-relaxed text-muted">
        <span className="font-medium text-ink/70">About this demo:</span> {DEMO_META.dataDisclaimer} Forecast
        stockout dates are recomputed live from current stock, confirmed deliveries and the model&apos;s demand
        curve. Disease-to-medicine links are hypotheses for planning, not clinical guidance.
      </p>
    </div>
  );
}
