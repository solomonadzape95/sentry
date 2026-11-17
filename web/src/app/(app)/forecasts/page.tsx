import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarClock,
  FlaskConical,
  Package,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { DEMO_TODAY } from "@/lib/config";
import {
  addDays,
  formatDate,
  formatDays,
  formatNumber,
  formatPct,
  formatShortDate,
} from "@/lib/format";
import { getModelRuns, getNetworkData, getSeriesDetail, getSignals } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, ConfidenceBadge, RiskBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Stat, Sparkline } from "@/components/ui/stat";
import { ForecastChart, type ForecastChartPoint } from "@/components/charts/forecast-chart";
import { HistoryChart } from "@/components/charts/history-chart";
import { ForecastControls } from "@/components/forecast-controls";
import { EmptyState } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export default async function ForecastsPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string; medicine?: string }>;
}) {
  const params = await searchParams;
  const [scope, data, signals, modelRuns] = await Promise.all([
    getScope(),
    getNetworkData(),
    getSignals(),
    getModelRuns(),
  ]);

  const facilities = scope.facilities;
  const requestedFacility = facilities.find((f) => f.id === params.facility);
  const facility = requestedFacility ?? scope.activeFacility ?? facilities[0];

  if (!facility) {
    return (
      <div>
        <PageHeader title="Forecasts" description="No facility is assigned to this persona." />
        <Card>
          <EmptyState
            title="No facility scope"
            description="Switch to a facility manager or network authority persona to view forecasts."
          />
        </Card>
      </div>
    );
  }
  const facilitySeries = data.series.filter((s) => s.facilityId === facility.id);
  const requestedMedicine = facilitySeries.find((s) => s.medicineId === params.medicine);
  const selected =
    requestedMedicine ??
    facilitySeries.find((s) => s.risk !== "LOW" && s.avgDailyDemand > 0) ??
    facilitySeries[0];

  if (!selected) {
    return (
      <div>
        <PageHeader title="Forecasts" description="Select a facility with forecast data." />
        <Card>
          <EmptyState title="No forecast for this facility" description="Seed the demo dataset and try again." />
        </Card>
      </div>
    );
  }

  const { consumption } = await getSeriesDetail(facility.id, selected.medicineId, 120);
  const recent = consumption.filter((r) => r.date >= addDays(DEMO_TODAY, -90));

  const chartData: ForecastChartPoint[] = recent.map((r) => {
    const date = r.date.toISOString().slice(0, 10);
    return { date, label: date, actual: r.quantity };
  });
  if (chartData.length && selected.forecast) {
    chartData[chartData.length - 1] = {
      ...chartData[chartData.length - 1],
      predicted: chartData[chartData.length - 1].actual,
    };
  }
  for (const p of selected.forecast?.points ?? []) {
    const date = p.date.slice(0, 10);
    chartData.push({
      date,
      label: date,
      predicted: p.predicted,
      lower80: p.lower80,
      upper80: p.upper80,
    });
  }

  const next7 = (selected.forecast?.points ?? []).slice(0, 7).reduce((s, p) => s + p.predicted, 0);
  const next30 = (selected.forecast?.points ?? []).slice(0, 30).reduce((s, p) => s + p.predicted, 0);
  const recentStockouts = recent.filter((r) => r.wasStockout).length;
  const recentDemand = average(recent.slice(-28).map((r) => r.quantity));

  const malaria = signals.disease.filter((d) => d.disease === "MALARIA").slice(-16);
  const latestMalaria = malaria.at(-1)?.cases ?? 0;
  const priorMalaria = average(malaria.slice(-5, -1).map((d) => d.cases));
  const malariaChange = priorMalaria ? latestMalaria / priorMalaria - 1 : 0;
  const malariaChart = malaria.map((d) => ({
    date: d.periodStart.toISOString().slice(0, 10),
    label: d.periodStart.toISOString().slice(0, 10),
    value: d.cases,
  }));

  const weather = signals.weather.slice(-56);
  const rainChart = weather.map((w) => ({
    date: w.date.toISOString().slice(0, 10),
    label: w.date.toISOString().slice(0, 10),
    value: w.rainfallMm,
  }));
  const rain21 = signals.weather.slice(-21).reduce((s, w) => s + w.rainfallMm, 0);

  const transferParams = new URLSearchParams({
    to: facility.id,
    medicine: selected.medicineId,
    qty: String(Math.max(selected.reorderQty, selected.shortage45)),
  }).toString();

  const bestModel = modelRuns[0];

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <BrainCircuit className="h-3.5 w-3.5" /> Predictive intelligence · {facility.shortName}
          </>
        }
        title={`${selected.genericName} demand forecast`}
        description={`${selected.strength} · ${selected.category.replaceAll("_", " ").toLowerCase()} · ${selected.forecast?.modelLabel ?? "No model"}`}
        actions={
          <>
            <ForecastControls
              facilities={facilities.map((f) => ({ id: f.id, shortName: f.shortName }))}
              medicines={facilitySeries.map((s) => ({ id: s.medicineId, name: s.genericName }))}
              facilityId={facility.id}
              medicineId={selected.medicineId}
            />
            <Link href="/model" className={buttonClass({ variant: "secondary", size: "sm" })}>
              Model performance
            </Link>
          </>
        }
      />

      {selected.expedite ? (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-danger/20 bg-danger-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-xs leading-relaxed text-danger">
              <span className="font-semibold">Ordering alone will not prevent this stockout.</span>{" "}
              Supplier lead time is {selected.leadTimeDays} days, but projected cover is{" "}
              {formatDays(selected.daysToStockout)}. A network transfer or emergency purchase is required.
            </p>
          </div>
          <Link href={`/transfers?${transferParams}`} className={buttonClass({ variant: "danger", size: "sm" })}>
            Find transfer <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          label="Next 7 days"
          value={`${formatNumber(next7)} ${selected.unit}s`}
          sub={`${selected.avgDailyDemand.toFixed(1)}/day forecast demand`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Projected cover"
          value={formatDays(selected.daysToStockout)}
          sub={selected.stockoutDate ? `Stockout ${formatDate(selected.stockoutDate)}` : "Beyond 60-day window"}
          icon={<CalendarClock className="h-4 w-4" />}
          tone={selected.risk === "CRITICAL" ? "danger" : selected.risk === "HIGH" ? "warning" : "default"}
        />
        <Stat
          label="Recommended reorder"
          value={`${formatNumber(selected.reorderQty)}`}
          sub={`${selected.unit}s · lead time ${selected.leadTimeDays} days`}
          icon={<Package className="h-4 w-4" />}
        />
        <Stat
          label="Forecast error (WAPE)"
          value={formatPct(selected.forecast?.wape ?? 0)}
          sub={`Lower is better · 28-day backtest · ${selected.forecast?.confidence.toLowerCase() ?? "unknown"} confidence`}
          icon={<Activity className="h-4 w-4" />}
          tone={
            (selected.forecast?.wape ?? 1) < 0.25
              ? "success"
              : (selected.forecast?.wape ?? 1) < 0.4
                ? "warning"
                : "danger"
          }
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Recorded demand vs forecast"
              subtitle={`${formatNumber(next30)} ${selected.unit}s expected over the next 30 days`}
              action={
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence={selected.forecast?.confidence ?? "LOW"} />
                  <RiskBadge risk={selected.risk} compact />
                </div>
              }
            />
            <CardBody className="pt-4">
              <ForecastChart
                data={chartData}
                height={330}
                unit={selected.unit}
                stockoutDate={selected.stockoutDate?.slice(0, 10) ?? null}
              />
              {selected.forecast?.lowData ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[11px] text-warn">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Low-data warning: this series has fewer than 120 uncensored observations. Treat the
                  forecast as directional, not operational.
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Demand signals"
              subtitle="External data used to explain and anticipate changes in consumption"
              action={<Badge tone="info">Illustrative disease signal</Badge>}
            />
            <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-ink">Malaria · FCT</p>
                  <Badge tone={malariaChange > 0 ? "danger" : "success"}>
                    {malariaChange > 0 ? "+" : ""}
                    {formatPct(malariaChange)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-muted">
                  {formatNumber(latestMalaria)} cases last week
                </p>
                <HistoryChart data={malariaChart} height={130} color="#b42318" unit="cases" />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-ink">Rainfall · Abuja</p>
                  <Badge tone="info">{rain21.toFixed(1)} mm</Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-muted">21-day cumulative · Open-Meteo</p>
                <HistoryChart data={rainChart} height={130} color="#175cd3" unit="mm" />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-ink">Consumption trend</p>
                  <Badge tone={recentStockouts > 0 ? "warning" : "success"}>
                    {recentStockouts > 0 ? `${recentStockouts} stockout days` : "Complete"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-muted">
                  28-day average {recentDemand.toFixed(1)} {selected.unit}s/day
                </p>
                <Sparkline
                  values={recent.slice(-42).map((r) => r.quantity)}
                  width={240}
                  height={100}
                  stroke="#0d7666"
                  fill
                  className="mt-2 w-full"
                />
                {recentStockouts > 0 ? (
                  <p className="mt-1 text-[9px] leading-relaxed text-warn">
                    Stockout days are censored: recorded issues understate true demand.
                  </p>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Model comparison"
              subtitle="Rolling-origin backtest · 28-day horizon · stockout-censored days excluded"
              action={
                <Link href="/model" className="text-[11px] font-medium text-brand hover:underline">
                  Full evaluation
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-2.5 font-medium">Model</th>
                    <th className="px-3 py-2.5 font-medium">WAPE</th>
                    <th className="px-3 py-2.5 font-medium">MAE</th>
                    <th className="px-3 py-2.5 font-medium">Bias</th>
                    <th className="px-3 py-2.5 font-medium">Series evaluated</th>
                    <th className="px-5 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRuns.map((run) => (
                    <tr key={run.id} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-2.5 font-medium text-ink">
                        {run.model === "XGBOOST" ? "XGBoost (climate + disease)" : run.model === "ENSEMBLE" ? "XGBoost + seasonal ensemble" : run.model === "RIDGE" ? "Ridge regression" : run.model === "SEASONAL_NAIVE" ? "Seasonal baseline" : "28-day moving average"}
                      </td>
                      <td className="tabular px-3 py-2.5">{formatPct(run.overallWape, 1)}</td>
                      <td className="tabular px-3 py-2.5">{run.overallMae.toFixed(2)}</td>
                      <td className="tabular px-3 py-2.5">{run.overallBias > 0 ? "+" : ""}{formatPct(run.overallBias, 1)}</td>
                      <td className="tabular px-3 py-2.5 text-muted">{run.seriesCount}</td>
                      <td className="px-5 py-2.5 text-right">
                        {bestModel?.id === run.id ? <Badge tone="success">Best backtest</Badge> : <Badge tone="neutral">Benchmark</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Forecast explanation"
              subtitle="What the model saw, and how much to trust it"
              icon={<FlaskConical className="h-4 w-4" />}
            />
            <CardBody className="space-y-3 text-[11px] leading-relaxed text-muted">
              <div className="rounded-lg bg-canvas px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted">Selected model</p>
                <p className="mt-0.5 font-medium text-ink">{selected.forecast?.modelLabel ?? "Not available"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wide text-muted">WAPE</p>
                  <p className="tabular mt-0.5 text-sm font-semibold text-ink">{formatPct(selected.forecast?.wape ?? 0, 1)}</p>
                </div>
                <div className="rounded-lg border border-line px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wide text-muted">MAE</p>
                  <p className="tabular mt-0.5 text-sm font-semibold text-ink">{selected.forecast?.mae.toFixed(2) ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-line px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wide text-muted">Bias</p>
                  <p className="tabular mt-0.5 text-sm font-semibold text-ink">
                    {(selected.forecast?.bias ?? 0) > 0 ? "+" : ""}
                    {formatPct(selected.forecast?.bias ?? 0, 1)}
                  </p>
                </div>
                <div className="rounded-lg border border-line px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wide text-muted">History</p>
                  <p className="tabular mt-0.5 text-sm font-semibold text-ink">{formatNumber(selected.forecast?.dataPoints ?? 0)} days</p>
                </div>
              </div>
              <p>
                Features: historical consumption lags, day-of-week and annual seasonality, rainfall,
                temperature, humidity, malaria, cholera and respiratory indicators.
              </p>
              <p>
                The 80% interval widens with the forecast horizon. It is derived from backtest residuals,
                not from a guarantee of future demand.
              </p>
              {selected.forecast?.lowData ? (
                <p className="flex items-start gap-1.5 rounded-lg bg-warn-soft px-2.5 py-2 text-warn">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  Low-data series: this forecast should not be used to automate purchasing.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Replenishment recommendation"
              subtitle="Advisory only — no automatic ordering"
              icon={<Package className="h-4 w-4" />}
            />
            <CardBody className="space-y-3">
              <div className="rounded-xl bg-brand-dark p-4 text-white">
                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#8fe3cd]">
                  Suggested order quantity
                </p>
                <p className="tabular mt-1 text-3xl font-semibold">
                  {formatNumber(selected.reorderQty)}{" "}
                  <span className="text-sm font-medium text-white/60">{selected.unit}s</span>
                </p>
                <p className="mt-1 text-[10px] text-white/55">
                  {selected.expedite
                    ? "Exceeds supplier lead-time cover — expedite or transfer."
                    : `Covers ${selected.leadTimeDays}-day lead time, review period and safety stock.`}
                </p>
              </div>
              <div className="space-y-1.5 text-[11px] text-muted">
                <p className="flex justify-between gap-2"><span>Supplier lead time</span><span className="font-medium text-ink">{selected.leadTimeDays} days</span></p>
                <p className="flex justify-between gap-2"><span>Review period</span><span className="font-medium text-ink">14 days</span></p>
                <p className="flex justify-between gap-2"><span>Safety stock</span><span className="font-medium text-ink">7 days</span></p>
                <p className="flex justify-between gap-2"><span>Confirmed incoming</span><span className="font-medium text-ink">{formatNumber(selected.incoming.reduce((s, p) => s + p.quantity, 0))} {selected.unit}s</span></p>
                <p className="flex justify-between gap-2"><span>Pack size</span><span className="font-medium text-ink">{selected.packSize} {selected.unit}s</span></p>
              </div>
              {selected.expedite ? (
                <Link href={`/transfers?${transferParams}`} className={buttonClass({ variant: "danger", size: "md", className: "w-full" })}>
                  Create transfer request
                </Link>
              ) : (
                <div className="rounded-lg border border-dashed border-line px-3 py-2 text-[10px] text-muted">
                  Purchase orders are created through procurement, not automatically. The recommendation
                  includes lead time, safety stock and confirmed deliveries.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Stock position"
              subtitle="Current inventory and deliveries"
              icon={<Package className="h-4 w-4" />}
            />
            <CardBody className="space-y-2 text-[11px]">
              <p className="flex justify-between gap-2"><span className="text-muted">Usable stock</span><span className="tabular font-semibold text-ink">{formatNumber(selected.usable)} {selected.unit}s</span></p>
              <p className="flex justify-between gap-2"><span className="text-muted">Active batches</span><span className="tabular font-medium text-ink">{selected.batches.filter((b) => b.status === "ACTIVE").length}</span></p>
              <p className="flex justify-between gap-2"><span className="text-muted">Nearest expiry</span><span className="font-medium text-ink">{selected.batches[0] ? formatDate(selected.batches[0].expiryDate) : "—"}</span></p>
              <p className="flex justify-between gap-2"><span className="text-muted">Confirmed inbound</span><span className="tabular font-medium text-ink">{formatNumber(selected.incoming.reduce((s, p) => s + p.quantity, 0))}</span></p>
              {selected.incoming[0] ? (
                <p className="flex justify-between gap-2"><span className="text-muted">Next delivery</span><span className="font-medium text-ink">{formatShortDate(selected.incoming[0].expectedAt)}</span></p>
              ) : null}
              <Link
                href={`/inventory?facility=${facility.id}`}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
              >
                Open batch register <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <p className="mt-5 text-[10px] leading-relaxed text-muted">
        Forecast generated by the Python pipeline and stored as an immutable model artifact. Stockout dates
        are recomputed live from current inventory and confirmed deliveries. Disease indicators are
        illustrative; disease-to-medicine relationships require clinical review before operational use.
      </p>
    </div>
  );
}
