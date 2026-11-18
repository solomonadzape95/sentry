import { Database, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { DEMO_META } from "@/lib/config";
import { formatDate, formatDateTime, formatNumber, formatPct } from "@/lib/format";
import { getDataProvenance, getDiseaseProvenance } from "@/lib/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";

export const dynamic = "force-dynamic";

const kindTone: Record<string, BadgeTone> = {
  OBSERVED: "success",
  OBSERVED_PRIOR: "info",
  DERIVED: "warning",
  REFERENCE: "neutral",
  GATED: "outline",
};

const statusTone: Record<string, BadgeTone> = {
  ACTIVE: "success",
  PLANNED: "info",
  GATED: "warning",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  PLANNED: "Planned",
  GATED: "Access gated",
};

export default async function DataPage() {
  const [{ sources, runs }, diseaseProvenance] = await Promise.all([
    getDataProvenance(),
    getDiseaseProvenance(),
  ]);

  const active = sources.filter((source) => source.status === "ACTIVE");
  const gated = sources.filter((source) => source.status === "GATED");
  const acceptedRows = runs.reduce((sum, run) => sum + run.rowsAccepted, 0);
  const lastRun = sources
    .map((source) => source.lastRunAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  type RealBacktest = {
    target: string;
    horizonWeeks: number;
    caveat: string;
    overall: Array<{
      model: string;
      wape: number;
      meanMae: number;
      bias: number;
      diseases: number;
      actualSum: number;
    }>;
    byDisease: Array<{
      disease: string;
      model: string;
      selectedModel?: string;
      wape: number;
      mae: number;
      n: number;
    }>;
  };

  const meta = DEMO_META as unknown as {
    today: string;
    ncdcLatestObservation?: string | null;
    diseaseSignals?: Array<{
      signal: string;
      source: string;
      isDerived?: boolean;
      isIllustrative?: boolean;
    }>;
    realTargetBacktest?: RealBacktest;
  };

  const backtest = meta.realTargetBacktest;
  const selected = backtest?.overall.find((row) => row.model === "SELECTED");
  const seasonal = backtest?.overall.find((row) => row.model === "SEASONAL_NAIVE");
  const moving = backtest?.overall.find((row) => row.model === "MOVING_AVERAGE");
  const selectedRows = backtest?.byDisease.filter((row) => row.model === "SELECTED") ?? [];

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <Database className="h-3.5 w-3.5" /> Data provenance · {formatDate(DEMO_META.today)}
          </>
        }
        title="Where the numbers come from"
        description="Every forecast input is traced to a public source, a documented derivation, or a labelled simulation. No number is presented as observed when it is not."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          label="Active sources"
          value={active.length}
          sub={`${sources.length} registered · ${gated.length} access-gated`}
          icon={<FileCheck2 className="h-4 w-4" />}
          tone="success"
        />
        <Stat
          label="Rows ingested"
          value={formatNumber(acceptedRows)}
          sub="Across the latest NCDC, facility, malaria and weather runs"
          icon={<Database className="h-4 w-4" />}
          tone="brand"
        />
        <Stat
          label="NCDC latest report"
          value={meta.ncdcLatestObservation ? formatDate(meta.ncdcLatestObservation) : "N/A"}
          sub="Later weeks are carried forward and marked imputed"
          icon={<RefreshCw className="h-4 w-4" />}
        />
        <Stat
          label="Last successful refresh"
          value={lastRun ? formatDateTime(lastRun) : "N/A"}
          sub="Re-run the Python ingestion to refresh"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Source register"
            subtitle="Public sources are scraped; gated sources are documented and requested, never bypassed."
            action={<Badge tone="brand">Registry</Badge>}
          />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-[0.08em] text-muted">
                <tr className="border-b border-line">
                  <th className="pb-2 pr-3 font-medium">Source</th>
                  <th className="pb-2 pr-3 font-medium">Kind</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Coverage</th>
                  <th className="pb-2 pr-3 font-medium">Last run</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-b border-line/70 align-top last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-ink">{source.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{source.licence ?? "Licence not recorded"}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={kindTone[source.kind] ?? "neutral"}>{source.kind}</Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={statusTone[source.status] ?? "neutral"} dot>
                        {statusLabel[source.status] ?? source.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{source.coverage ?? "N/A"}</td>
                    <td className="py-2.5 pr-3 text-muted">
                      {source.lastRunAt ? formatDateTime(source.lastRunAt) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Disease signals"
              subtitle="NCDC is observed; malaria and respiratory are derived and labelled."
              action={<Badge tone="warning">Mixed provenance</Badge>}
            />
            <CardBody className="space-y-3">
              {(meta.diseaseSignals ?? []).map((signal) => (
                <div key={signal.signal} className="rounded-xl border border-line bg-canvas/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-ink">{signal.signal.replaceAll("_", " ")}</p>
                    <Badge tone={signal.isDerived ? "warning" : "success"} dot>
                      {signal.isDerived ? "Derived" : "Observed"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{signal.source}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="What is not real" subtitle="Stated before a reviewer asks." />
            <CardBody className="space-y-2 text-xs leading-relaxed text-muted">
              <p>
                <span className="font-medium text-ink">Simulated:</span> facility inventory, batch
                movements and medicine consumption. They are demo data, not pilot observations.
              </p>
              <p>
                <span className="font-medium text-ink">Derived:</span> malaria and respiratory
                signals. They use real prevalence and weather, but they are indices, not observed
                case counts.
              </p>
              <p>
                <span className="font-medium text-ink">Observed:</span> NCDC outbreak reports,
                Open-Meteo weather, GRID3/NHFR facility lists and NMIS prevalence.
              </p>
              <p className="rounded-lg bg-warn-soft/60 p-2 text-[11px] text-warn">
                Disease-to-medicine relationships are hypotheses. They require clinical and
                pharmaceutical validation before operational use.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {backtest ? (
        <Card className="mt-5">
          <CardHeader
            title="Real-target validation"
            subtitle={`${backtest.horizonWeeks}-week rolling holdout on real ${backtest.target.toLowerCase()}`}
            action={<Badge tone="success">Real data</Badge>}
            icon={<RefreshCw className="h-4 w-4" />}
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Selected model WAPE"
                value={formatPct(selected?.wape ?? 0, 1)}
                sub="Per-disease model selection"
                tone="success"
              />
              <Stat
                label="Moving average WAPE"
                value={formatPct(moving?.wape ?? 0, 1)}
                sub="4-week trailing average"
              />
              <Stat
                label="Seasonal baseline WAPE"
                value={formatPct(seasonal?.wape ?? 0, 1)}
                sub="Same week last year"
              />
              <Stat
                label="Actual cases evaluated"
                value={formatNumber(selected?.actualSum ?? 0)}
                sub={`${selected?.diseases ?? 0} diseases · ${backtest.horizonWeeks}-week horizon`}
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead className="text-[10px] uppercase tracking-[0.08em] text-muted">
                  <tr className="border-b border-line">
                    <th className="pb-2 pr-3 font-medium">Disease</th>
                    <th className="pb-2 pr-3 font-medium">Selected model</th>
                    <th className="pb-2 pr-3 font-medium">WAPE</th>
                    <th className="pb-2 pr-3 font-medium">MAE</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row) => (
                    <tr key={row.disease} className="border-b border-line/70 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-ink">
                        {row.disease.replaceAll("_", " ")}
                      </td>
                      <td className="py-2.5 pr-3 text-muted">
                        {row.selectedModel?.replaceAll("_", " ")}
                      </td>
                      <td className="py-2.5 pr-3 tabular text-muted">{formatPct(row.wape, 1)}</td>
                      <td className="py-2.5 pr-3 tabular text-muted">{formatNumber(row.mae, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 rounded-lg bg-canvas/60 p-3 text-[11px] leading-relaxed text-muted">
              {backtest.caveat}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent ingestion runs"
            subtitle="Each run records rows read, accepted, rejected and date coverage."
            icon={<RefreshCw className="h-4 w-4" />}
          />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-[0.08em] text-muted">
                <tr className="border-b border-line">
                  <th className="pb-2 pr-3 font-medium">Source</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Rows</th>
                  <th className="pb-2 pr-3 font-medium">Coverage</th>
                  <th className="pb-2 pr-3 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-line/70 last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-ink">{run.source.name}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={run.status === "success" ? "success" : run.status === "partial" ? "warning" : "danger"}>
                        {run.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 tabular text-muted">
                      {formatNumber(run.rowsAccepted)}
                      {run.rowsRejected > 0 ? ` / ${formatNumber(run.rowsRejected)} rejected` : ""}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">
                      {run.dateMin ? `${formatDate(run.dateMin)} – ${formatDate(run.dateMax)}` : "N/A"}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{formatDateTime(run.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Disease observation provenance"
            subtitle="Distinct sources currently stored in the database."
            icon={<LockKeyhole className="h-4 w-4" />}
          />
          <CardBody className="space-y-3">
            {diseaseProvenance.map((row, index) => (
              <div
                key={`${row.disease}-${row.source}-${index}`}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line bg-canvas/40 p-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">{row.disease.replaceAll("_", " ")}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{row.source}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {row.isDerived ? <Badge tone="warning">Derived</Badge> : <Badge tone="success">Observed</Badge>}
                  {row.isImputed ? <Badge tone="danger">Imputed</Badge> : null}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
