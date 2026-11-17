import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  Check,
  ClipboardList,
  CloudRain,
  Play,
  Radar,
  ScanBarcode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { DEMO_TODAY } from "@/lib/config";
import {
  addDays,
  formatDate,
  formatNumber,
  formatPct,
} from "@/lib/format";
import { getNetworkData } from "@/lib/queries";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { HeroVisual } from "@/components/landing/hero-visual";
import { GrainOverlay } from "@/components/landing/grain";
import { ForecastChart, type ForecastChartPoint } from "@/components/charts/forecast-chart";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const heroFacilityId = "fac_phc";
const heroMedicineId = "med_act";
const heroSourceId = "fac_gh";

const capabilities = [
  { icon: Boxes, label: "Batch inventory" },
  { icon: TrendingUp, label: "Demand forecasting" },
  { icon: ShieldAlert, label: "Stockout alerts" },
  { icon: ArrowLeftRight, label: "Network transfers" },
  { icon: WifiOff, label: "Offline mobile" },
  { icon: CalendarClock, label: "Expiry control" },
];

const steps = [
  {
    n: "01",
    title: "Record what is real",
    copy: "A batch-level ledger of what each facility holds, what expires, what arrives and what is issued. FEFO built in. Offline first.",
    points: ["Batches and expiry", "Receipts, issues and counts", "Works without a connection"],
    icon: Boxes,
  },
  {
    n: "02",
    title: "Predict what is next",
    copy: "Consumption, rainfall, fever signals and seasonality become a 30-day demand forecast with an honest uncertainty band.",
    points: ["Stockout date before it happens", "80% and 95% intervals", "Baseline-beating models"],
    icon: TrendingUp,
  },
  {
    n: "03",
    title: "Move what is needed",
    copy: "The network matches a predicted shortage to verified surplus, recommends a batch, then asks a human to approve the move.",
    points: ["Surplus-to-shortage matching", "Batch and shelf-life checks", "Approval and audit trail"],
    icon: ArrowLeftRight,
  },
];

export default async function LandingPage() {
  const data = await getNetworkData();
  const hero = data.series.find(
    (s) => s.facilityId === heroFacilityId && s.medicineId === heroMedicineId,
  );
  const opportunity =
    data.opportunities.find(
      (o) => o.toFacilityId === heroFacilityId && o.medicineId === heroMedicineId,
    ) ?? data.opportunities[0];
  const source =
    data.facilities.find((f) => f.id === heroSourceId)?.shortName ?? "General Hospital Abuja";
  const facility = hero?.facilityShortName ?? "Gwagwalada PHC";
  const days = Math.max(1, Math.floor(opportunity?.daysToStockout ?? hero?.daysToStockout ?? 11));
  const transfer = opportunity?.quantity ?? 156;

  const consumption = hero
    ? await prisma.consumptionRecord.findMany({
        where: {
          facilityId: heroFacilityId,
          medicineId: heroMedicineId,
          date: { gte: addDays(DEMO_TODAY, -90) },
        },
        orderBy: { date: "asc" },
      })
    : [];

  const chartData: ForecastChartPoint[] = consumption.map((r) => {
    const date = r.date.toISOString().slice(0, 10);
    return { date, label: date, actual: r.quantity };
  });
  if (chartData.length && hero?.forecast) {
    chartData[chartData.length - 1] = {
      ...chartData[chartData.length - 1],
      predicted: chartData[chartData.length - 1].actual,
    };
  }
  for (const point of hero?.forecast?.points ?? []) {
    chartData.push({
      date: point.date.slice(0, 10),
      label: point.date.slice(0, 10),
      predicted: point.predicted,
      lower80: point.lower80,
      upper80: point.upper80,
    });
  }

  const wape = hero?.forecast?.wape ?? 0.256;
  const confidence = hero?.forecast?.confidence ?? "MEDIUM";
  const forecastValues =
    hero?.forecast?.points.slice(0, 14).map((p) => p.predicted) ?? [5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 10, 10, 11, 11];

  return (
    <div className="min-h-dvh bg-mist px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <section className="relative mx-auto w-full max-w-[1520px] overflow-hidden rounded-[30px] bg-paper shadow-[0_35px_90px_-35px_rgba(10,43,34,0.38)] sm:rounded-[40px]">
        <div className="grid min-h-[720px] lg:min-h-[calc(100dvh-48px)] lg:grid-cols-[1.02fr_1.08fr]">
          <div className="relative z-10 flex flex-col px-5 py-5 sm:px-9 sm:py-8 lg:px-12 lg:py-11 xl:px-16">
            <header className="flex items-center justify-between gap-4">
              <Logo theme="light" href="/" className="origin-left scale-110" />
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 rounded-full border border-line bg-white/60 px-3 py-1.5 text-[10px] font-medium text-stone sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
                  Demo snapshot · {formatDate(DEMO_TODAY)}
                </span>
                <Link
                  href="/dashboard"
                  className="hidden h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[10px] font-medium text-white transition-colors hover:bg-forest sm:inline-flex"
                >
                  Open dashboard
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </header>

            <div className="flex flex-1 flex-col justify-center py-14 sm:py-16 lg:py-10">
              <p className="landing-rise flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
                Predictive medicine supply intelligence
              </p>

              <h1 className="landing-rise landing-delay-1 mt-6 max-w-[720px] text-[clamp(2.35rem,4.4vw,4.55rem)] font-medium leading-[0.94] tracking-[-0.075em] text-ink">
                Predict demand.
                <br />
                Prevent stockouts.
                <br />
                Protect care<span className="text-lime-deep">.</span>
              </h1>

              <p className="landing-rise landing-delay-2 mt-7 max-w-[500px] text-[15px] leading-[1.7] text-stone sm:text-[16.5px]">
                Aisec forecasts medicine demand, flags stockouts before they happen and
                coordinates verified surplus across facilities — so care never stops at an
                empty shelf.
              </p>

              <div className="landing-rise landing-delay-3 mt-8 flex flex-wrap items-center gap-2.5">
                <Link
                  href="/dashboard"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[12px] font-medium text-white transition-colors hover:bg-forest"
                >
                  Open the live demo
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
                <Link
                  href="#model"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-white/60 px-5 text-[12px] font-medium text-ink transition-colors hover:bg-white"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  See the forecast
                </Link>
              </div>

              <p className="landing-rise landing-delay-3 mt-4 text-[10px] text-stone/80">
                No sign-in · simulated facility records · real Abuja weather
              </p>
            </div>

            <div className="landing-fade landing-delay-4 flex flex-wrap gap-1.5">
              {capabilities.map((capability) => {
                const Icon = capability.icon;
                return (
                  <span
                    key={capability.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/65 px-3 py-2 text-[11px] font-medium text-ink/75 backdrop-blur"
                  >
                    <Icon className="h-3.5 w-3.5 text-forest/60" />
                    {capability.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="relative hidden p-3 lg:block">
            <div className="absolute left-0 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-2 rounded-full bg-paper p-2 shadow-[0_18px_40px_-14px_rgba(10,43,34,0.35)] ring-1 ring-line">
              <RailLink href="/dashboard" label="Open dashboard" icon={<Radar className="h-4 w-4" />} />
              <RailLink href="/m" label="Open mobile app" icon={<Smartphone className="h-4 w-4" />} />
              <RailLink href="#model" label="See the model" icon={<ArrowUpRight className="h-4 w-4" />} />
            </div>
            <HeroVisual
              days={days}
              transfer={transfer}
              facility={facility}
              source={source}
              medicine="ACT · 20/120mg"
              forecast={forecastValues}
            />
          </div>
        </div>

        <div className="p-3 lg:hidden">
          <HeroVisual
            days={days}
            transfer={transfer}
            facility={facility}
            source={source}
            medicine="ACT · 20/120mg"
            forecast={forecastValues}
            className="min-h-[500px] rounded-[26px]"
          />
        </div>
      </section>

      <div className="mx-auto mt-5 flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-1 text-[10px] font-medium text-stone sm:mt-7 sm:px-2">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
          Built for PHCs, general hospitals, private hospitals and community pharmacies
        </span>
        <span className="hidden items-center gap-4 sm:flex">
          <span>FCT demonstration network</span>
          <span className="h-3 w-px bg-line" />
          <span>17 Nov 2026</span>
        </span>
      </div>

      <section id="how-it-works" className="mx-auto max-w-[1320px] px-1 py-16 sm:px-2 sm:py-24">
        <Eyebrow>How it works</Eyebrow>
        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-[760px] text-[clamp(2.2rem,4vw,3.9rem)] font-medium leading-[0.98] tracking-[-0.06em] text-ink">
            Three moves from signal to action.
          </h2>
          <p className="max-w-[340px] text-[13px] leading-[1.7] text-stone">
            Inventory is the foundation. Prediction is the advantage. Coordination is the
            outcome. One loop, not three disconnected tools.
          </p>
        </div>

        <div className="mt-9 grid gap-3 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.n}
                className="group relative overflow-hidden rounded-[26px] border border-line bg-paper p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(10,43,34,0.28)] sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-lime">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[42px] font-medium leading-none tracking-[-0.08em] text-ink/10">
                    {step.n}
                  </span>
                </div>
                <h3 className="mt-7 text-[20px] font-medium tracking-[-0.03em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[12px] leading-[1.7] text-stone">{step.copy}</p>
                <div className="mt-5 space-y-1.5 border-t border-line pt-4">
                  {step.points.map((point) => (
                    <p key={point} className="flex items-center gap-2 text-[10px] font-medium text-ink/70">
                      <Check className="h-3 w-3 text-lime-deep" strokeWidth={2.4} />
                      {point}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="model" className="mx-auto max-w-[1320px] px-1 pb-16 sm:px-2 sm:pb-24">
        <div className="overflow-hidden rounded-[30px] border border-line bg-paper">
          <div className="grid gap-0 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-11">
              <Eyebrow>The prediction layer</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,3.4vw,3.2rem)] font-medium leading-[1.02] tracking-[-0.055em] text-ink">
                A forecast you can defend.
              </h2>
              <p className="mt-4 max-w-[360px] text-[13px] leading-[1.75] text-stone">
                Every medicine line gets a demand curve, an uncertainty band and a stockout
                date. Every forecast is benchmarked against a simple seasonal baseline, with
                low-data warnings instead of false confidence.
              </p>
              <div className="mt-6 space-y-2.5">
                {[
                  ["Backtested", "28-day held-out evaluation, WAPE / MAE / bias"],
                  ["Explainable", "Consumption, rainfall, temperature, fever signals"],
                  ["Honest", "80% and 95% intervals; stockout-censored scoring"],
                ].map(([title, copy]) => (
                  <div key={title} className="flex gap-3">
                    <div className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-forest">
                      <Check className="h-3 w-3" strokeWidth={2.6} />
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone">
                      <span className="font-semibold text-ink">{title}.</span> {copy}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard"
                className="mt-7 inline-flex items-center gap-1.5 text-[11px] font-semibold text-forest underline decoration-lime-deep decoration-2 underline-offset-4"
              >
                Explore the live forecast
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="border-t border-line bg-[#eef1e8] p-4 sm:p-6 lg:border-l lg:border-t-0">
              <div className="relative overflow-hidden rounded-[22px] border border-line bg-white p-4 shadow-[0_24px_50px_-26px_rgba(10,43,34,0.28)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone">
                      Gwagwalada PHC · ACT
                    </p>
                    <p className="mt-1 text-[15px] font-semibold tracking-tight text-ink">
                      Demand vs forecast
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConfidencePill confidence={confidence} />
                    <Badge tone={days < 14 ? "danger" : "warning"}>{days} days</Badge>
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <div className="mt-3">
                    <ForecastChart
                      data={chartData}
                      height={250}
                      stockoutDate={hero?.stockoutDate?.slice(0, 10) ?? null}
                    />
                  </div>
                ) : (
                  <div className="mt-4 grid h-[250px] place-items-center rounded-xl bg-canvas text-[11px] text-stone">
                    Forecast data will appear here once the demo dataset is seeded.
                  </div>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-canvas/70 p-2.5">
                  <Metric label="WAPE" value={formatPct(wape, 1)} />
                  <Metric label="Forecast" value={`${hero?.avgDailyDemand.toFixed(1) ?? "9.6"}/day`} />
                  <Metric label="Reorder" value={formatNumber(hero?.reorderQty ?? 222)} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] text-stone">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-line">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
                  Simulated facility data
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-line">
                  <CloudRain className="h-3 w-3" />
                  Real Open-Meteo weather
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-line">
                  <Sparkles className="h-3 w-3" />
                  Illustrative disease signals
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-1 pb-16 sm:px-2 sm:pb-24">
        <div className="relative overflow-hidden rounded-[30px] bg-forest px-6 py-8 text-white sm:px-10 sm:py-11">
          <div className="pointer-events-none absolute -right-20 -top-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(228,244,77,0.22),transparent_65%)]" />
          <div className="pointer-events-none absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(127,176,138,0.2),transparent_65%)]" />
          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <EyebrowDark>The loop in numbers</EyebrowDark>
                <h2 className="mt-4 max-w-[700px] text-[clamp(2rem,3.4vw,3.3rem)] font-medium leading-[1.02] tracking-[-0.06em]">
                  A network that sees the shortage before the shelf does.
                </h2>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full bg-lime px-5 text-[11px] font-semibold text-forest transition-colors hover:bg-[#effa7b] lg:self-auto"
              >
                Open the live demo
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-7 border-t border-white/10 pt-7 lg:grid-cols-4">
              <BigMetric value="4" label="Facilities connected" sub="PHC, general, private, pharmacy" />
              <BigMetric value="48" label="Forecast series" sub="12 medicines · 731 days of history" />
              <BigMetric value={formatPct(0.167, 1)} label="XGBoost WAPE" sub="vs 28.6% seasonal baseline" />
              <BigMetric value="11 → 49" label="Days of cover" sub="after a recommended transfer" />
            </div>
            <p className="mt-7 max-w-[720px] text-[9px] leading-relaxed text-white/35">
              Model metrics are from a 28-day backtest on simulated data. They prove the
              pipeline works, not real-world stockout reduction. That claim waits for a pilot.
            </p>
          </div>
          <GrainOverlay id="impact-grain" />
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-1 pb-16 sm:px-2 sm:pb-24">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow>Built for the last mile</Eyebrow>
            <h2 className="mt-5 max-w-[700px] text-[clamp(2rem,3.6vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.06em] text-ink">
              The details that decide whether it gets used.
            </h2>
          </div>
          <p className="max-w-[320px] text-[13px] leading-[1.7] text-stone">
            A pharmacist should not need a desktop, a stable network or a manual to record
            what happened on the shelf.
          </p>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: WifiOff, title: "Offline-first by default", copy: "Queue receipts, issues and counts on the device. Sync with idempotency when the network returns." },
            { icon: CalendarClock, title: "Expiry is a first-class object", copy: "FEFO issue, near-expiry flags and expired-stock quarantine keep waste out of usable cover." },
            { icon: ShieldCheck, title: "Approval, not automation", copy: "Transfers and replenishment recommendations require an authorised human. No silent stock movement." },
            { icon: ClipboardList, title: "Every change is traceable", copy: "Batch-level movements, physical counts and approvals leave an auditable trail." },
            { icon: ScanBarcode, title: "Scan, or fall back", copy: "Camera barcode scanning with manual search and demo labels for the reality of a busy counter." },
            { icon: Radar, title: "Network, not silos", copy: "Private facility inventory, aggregated risk and verified surplus matching across the network." },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group rounded-[24px] border border-line bg-paper p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_20px_45px_-30px_rgba(10,43,34,0.3)]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-forest text-lime">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-5 text-[15px] font-semibold tracking-[-0.02em] text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[11px] leading-[1.7] text-stone">{feature.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-1 pb-10 sm:px-2 sm:pb-14">
        <div className="relative overflow-hidden rounded-[30px] bg-paper px-6 py-10 ring-1 ring-line sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(228,244,77,0.35),transparent_65%)]" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Eyebrow>Start with the demo</Eyebrow>
              <h2 className="mt-5 max-w-[720px] text-[clamp(2.1rem,4vw,4rem)] font-medium leading-[0.98] tracking-[-0.065em] text-ink">
                The shelf should never be the surprise.
              </h2>
              <p className="mt-4 max-w-[440px] text-[13px] leading-[1.7] text-stone">
                Open the FCT demonstration network and walk the full loop: forecast, transfer,
                receipt and recalculation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/dashboard" className={buttonClass({ variant: "primary", size: "lg", className: "rounded-full bg-ink px-6 hover:bg-forest" })}>
                Open the live demo
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/m" className={buttonClass({ variant: "secondary", size: "lg", className: "rounded-full px-6" })}>
                <Smartphone className="h-4 w-4" />
                Mobile app
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1320px] flex-col gap-5 px-1 pb-6 pt-2 text-[10px] text-stone sm:flex-row sm:items-center sm:justify-between sm:px-2">
        <div className="flex items-center gap-3">
          <Logo theme="light" compact href="/" />
          <span className="font-medium text-ink">Aisec</span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span className="hidden sm:block">Predictive medicine supply intelligence</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
          <Link href="/m" className="hover:text-ink">Mobile</Link>
          <Link href="#model" className="hover:text-ink">The model</Link>
          <span className="flex items-center gap-1.5 text-stone/70">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
            Simulated data
          </span>
        </div>
      </footer>
    </div>
  );
}

function RailLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink transition-colors hover:bg-lime"
    >
      {icon}
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone">
      <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
      {children}
    </p>
  );
}

function EyebrowDark({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
      <span className="h-1.5 w-1.5 rounded-full bg-lime" />
      {children}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.1em] text-stone">{label}</p>
      <p className="tabular mt-0.5 text-[12px] font-semibold text-ink">{value}</p>
    </div>
  );
}

function BigMetric({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div>
      <p className="text-[clamp(2rem,3.4vw,3.4rem)] font-medium leading-none tracking-[-0.06em] text-white">
        {value}
      </p>
      <p className="mt-2 text-[11px] font-semibold text-white/85">{label}</p>
      <p className="mt-1 text-[9px] leading-relaxed text-white/40">{sub}</p>
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: string }) {
  const label =
    confidence === "HIGH" ? "High confidence" : confidence === "MEDIUM" ? "Medium confidence" : "Low confidence";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-medium ring-1 ring-inset",
        confidence === "HIGH"
          ? "bg-ok-soft text-ok ring-ok/15"
          : confidence === "MEDIUM"
            ? "bg-warn-soft text-warn ring-warn/15"
            : "bg-danger-soft text-danger ring-danger/15",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
