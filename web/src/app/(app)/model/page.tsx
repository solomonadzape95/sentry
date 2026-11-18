import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FlaskConical,
  Gauge,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { DEMO_TODAY } from "@/lib/config";
import { formatDate, formatPct } from "@/lib/format";
import { getModelRuns, getNetworkData } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, ConfidenceBadge } from "@/components/ui/badge";
import { MiniBar, Stat } from "@/components/ui/stat";
import { buttonClass } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const modelName: Record<string, string> = {
  XGBOOST: "XGBoost",
  RIDGE: "Ridge regression",
  ENSEMBLE: "XGBoost + seasonal ensemble",
  SEASONAL_NAIVE: "Seasonal baseline",
  MOVING_AVERAGE: "28-day moving average",
};

export default async function ModelPage() {
  const scope = await getScope();
  if (!scope.isNetworkAuthority) redirect(scope.home);
  const [runs, data] = await Promise.all([getModelRuns(), getNetworkData()]);
  const best = runs[0];
  const baseline = runs.find((r) => r.model === "SEASONAL_NAIVE");
  const improvement = baseline && best ? 1 - best.overallWape / baseline.overallWape : 0;

  const learned = data.series.filter((s) =>
    ["XGBOOST", "RIDGE", "ENSEMBLE"].includes(s.forecast?.model ?? ""),
  );
  const baselineUsed = data.series.filter((s) =>
    ["SEASONAL_NAIVE", "MOVING_AVERAGE"].includes(s.forecast?.model ?? ""),
  );
  const confidence = { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>;
  for (const s of data.series) {
    const c = s.forecast?.confidence;
    if (c) confidence[c] = (confidence[c] ?? 0) + 1;
  }

  const byModel = new Map<
    string,
    { count: number; wape: number[]; confidences: string[] }
  >();
  for (const s of data.series) {
    const model = s.forecast?.model;
    if (!model) continue;
    const entry = byModel.get(model) ?? { count: 0, wape: [], confidences: [] };
    entry.count += 1;
    entry.wape.push(s.forecast?.wape ?? 0);
    entry.confidences.push(s.forecast?.confidence ?? "LOW");
    byModel.set(model, entry);
  }

  const worst = [...data.series]
    .filter((s) => s.forecast)
    .sort((a, b) => (b.forecast?.wape ?? 0) - (a.forecast?.wape ?? 0))
    .slice(0, 6);

  const maxWape = Math.max(...runs.map((r) => r.overallWape), 0.01);

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <BrainCircuit className="h-3.5 w-3.5" /> Model evaluation · trained {formatDate(DEMO_TODAY)}
          </>
        }
        title="Forecast performance"
        description="A sophisticated model only earns its place if it beats a simple seasonal baseline. This page shows the evidence, and the limits."
        actions={
          <>
            <Link href="/forecasts" className={buttonClass({ variant: "secondary", size: "sm" })}>
              <Activity className="h-3.5 w-3.5" /> Open a forecast
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          label="Best backtest WAPE"
          value={formatPct(best?.overallWape ?? 0, 1)}
          sub={`${modelName[best?.model ?? ""] ?? best?.model} · weighted absolute % error`}
          icon={<Gauge className="h-4 w-4" />}
          tone="success"
        />
        <Stat
          label="Improvement vs baseline"
          value={formatPct(improvement, 0)}
          sub={`Seasonal baseline WAPE ${formatPct(baseline?.overallWape ?? 0, 1)}`}
          icon={<BarChart3 className="h-4 w-4" />}
          tone="brand"
        />
        <Stat
          label="Lines using learned models"
          value={`${learned.length} / ${data.series.length}`}
          sub={`${baselineUsed.length} lines kept simpler baselines`}
          icon={<Layers className="h-4 w-4" />}
        />
        <Stat
          label="High-confidence lines"
          value={confidence.HIGH ?? 0}
          sub={`${confidence.MEDIUM ?? 0} medium · ${confidence.LOW ?? 0} low`}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Model comparison"
              subtitle="Rolling-origin backtest · 28-day horizon · 48 facility-medicine series"
              action={<Badge tone="brand">Backtested</Badge>}
            />
            <CardBody>
              <div className="space-y-4">
                {runs.map((run) => (
                  <div key={run.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{modelName[run.model] ?? run.model}</span>
                        {best?.id === run.id ? <Badge tone="success">Best</Badge> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular font-semibold text-ink">{formatPct(run.overallWape, 1)}</span>
                        <span className="tabular w-16 text-right text-muted">MAE {run.overallMae.toFixed(2)}</span>
                      </div>
                    </div>
                    <MiniBar
                      value={run.overallWape}
                      max={maxWape}
                      tone={best?.id === run.id ? "brand" : run.model === "SEASONAL_NAIVE" ? "danger" : "muted"}
                    />
                    <p className="mt-1 text-[9px] text-muted">{run.notes}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Selected model by medicine line"
              subtitle="The pipeline chooses per series; a complex model is not forced where a baseline performs better"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-2.5 font-medium">Model</th>
                    <th className="px-3 py-2.5 font-medium">Lines</th>
                    <th className="px-3 py-2.5 font-medium">Mean WAPE</th>
                    <th className="px-3 py-2.5 font-medium">High confidence</th>
                    <th className="px-5 py-2.5 text-right font-medium">Use</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byModel.entries()]
                    .sort(([, a], [, b]) => b.count - a.count)
                    .map(([model, entry]) => {
                      const mean = entry.wape.reduce((s, x) => s + x, 0) / entry.wape.length;
                      return (
                        <tr key={model} className="border-b border-line/70 last:border-0">
                          <td className="px-5 py-2.5 font-medium text-ink">{modelName[model] ?? model}</td>
                          <td className="tabular px-3 py-2.5">{entry.count}</td>
                          <td className="tabular px-3 py-2.5">{formatPct(mean, 1)}</td>
                          <td className="tabular px-3 py-2.5 text-muted">
                            {entry.confidences.filter((c) => c === "HIGH").length}
                          </td>
                          <td className="px-5 py-2.5 text-right text-[10px] text-muted">
                            {model === "SEASONAL_NAIVE"
                              ? "Low-data / stable seasonal demand"
                              : model === "MOVING_AVERAGE"
                                ? "Short history"
                                : "External signals improve accuracy"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Largest forecast errors"
              subtitle="Reported, not hidden. These are the lines where the model is weakest."
              action={<Badge tone="warning">Review</Badge>}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-2.5 font-medium">Facility / medicine</th>
                    <th className="px-3 py-2.5 font-medium">Model</th>
                    <th className="px-3 py-2.5 font-medium">WAPE</th>
                    <th className="px-3 py-2.5 font-medium">MAE</th>
                    <th className="px-3 py-2.5 font-medium">Bias</th>
                    <th className="px-5 py-2.5 text-right font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {worst.map((s) => (
                    <tr key={`${s.facilityId}:${s.medicineId}`} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-ink">{s.genericName}</p>
                        <p className="text-[10px] text-muted">{s.facilityShortName}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-muted">{s.forecast?.modelLabel}</td>
                      <td className="tabular px-3 py-2.5 font-medium">{formatPct(s.forecast?.wape ?? 0, 1)}</td>
                      <td className="tabular px-3 py-2.5 text-muted">{s.forecast?.mae.toFixed(2)}</td>
                      <td className="tabular px-3 py-2.5 text-muted">
                        {(s.forecast?.bias ?? 0) > 0 ? "+" : ""}
                        {formatPct(s.forecast?.bias ?? 0, 1)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <ConfidenceBadge confidence={s.forecast?.confidence ?? "LOW"} />
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
            <CardHeader title="How the backtest works" icon={<FlaskConical className="h-4 w-4" />} />
            <CardBody className="space-y-3 text-[11px] leading-relaxed text-muted">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <p><span className="font-medium text-ink">Time-ordered split.</span> The last 28 days are held out. No future data leaks into training.</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <p><span className="font-medium text-ink">Recursive roll-out.</span> Each forecast day is generated from the previous prediction, matching live use.</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <p><span className="font-medium text-ink">Censoring-aware scoring.</span> Stockout days are excluded from accuracy metrics because true demand was unobserved.</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <p><span className="font-medium text-ink">Per-series selection.</span> Baselines win where they are genuinely better, including low-data lines.</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Features used" icon={<Layers className="h-4 w-4" />} />
            <CardBody>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Lag 1 / 7 / 14 / 21 / 28",
                  "Rolling mean 7 / 14 / 28",
                  "Rolling volatility",
                  "Day of week",
                  "Annual seasonality",
                  "Rainfall",
                  "21-day rainfall anomaly",
                  "Temperature",
                  "Humidity",
                  "Malaria cases",
                  "Cholera cases",
                  "Respiratory cases",
                  "Facility effects",
                  "Medicine effects",
                  "Stockout flag",
                ].map((f) => (
                  <span key={f} className="rounded-full bg-canvas px-2 py-1 text-[10px] text-muted ring-1 ring-line">
                    {f}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted">
                Model: XGBoost regressor with 420 trees, depth 6, learning rate 0.045. Ridge regression
                and two baselines provide comparison. The pipeline is in <span className="font-mono">ml/</span> and
                runs independently of the web app.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Limitations" icon={<AlertTriangle className="h-4 w-4" />} />
            <CardBody className="space-y-2.5 text-[11px] leading-relaxed text-muted">
              <p>
                <span className="font-medium text-ink">Simulated facility data.</span> These metrics prove the
                pipeline works, not that the product reduces stockouts in the field.
              </p>
              <p>
                <span className="font-medium text-ink">Mixed-provenance disease signals.</span> NCDC outbreak
                reports are observed; malaria and respiratory signals are derived from survey prevalence and
                weather. Disease-to-medicine relationships still need clinical validation.
              </p>
              <p>
                <span className="font-medium text-ink">No live NHLMIS / DHIS2 feed.</span> Integration access is
                a post-hackathon workstream.
              </p>
              <p>
                <span className="font-medium text-ink">Approximate intervals.</span> Uncertainty is derived from
                backtest residuals, not a formal probabilistic model.
              </p>
              <p className="rounded-lg bg-warn-soft/70 px-3 py-2 text-[10px] text-warn">
                Do not claim real-world stockout or expiry reductions from simulated results. Measure those in
                an 8–12 week pilot.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Production roadmap" />
            <CardBody className="space-y-2 text-[11px] leading-relaxed text-muted">
              <p><span className="font-medium text-ink">1.</span> Retrain on anonymised facility records with clinical review.</p>
              <p><span className="font-medium text-ink">2.</span> Add authorised DHIS2 / NHLMIS feeds and supplier lead-time data.</p>
              <p><span className="font-medium text-ink">3.</span> Monitor drift and accuracy by facility and medicine.</p>
              <p><span className="font-medium text-ink">4.</span> Move to per-series models where data volume justifies it.</p>
              <Link href="/forecasts" className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline">
                Explore live forecasts <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
