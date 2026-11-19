import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Asterisk,
  Boxes,
  ClipboardCheck,
  Clock3,
  Database,
  Layers,
  Plus,
  Radar,
  ScanLine,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Waypoints,
  WifiOff,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { getNetworkData } from "@/lib/queries";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const heroFacilityId = "fac_phc";
const heroMedicineId = "med_act";
const heroSourceId = "fac_gh";

const faqs = [
  {
    q: "How does Sentry predict a stockout?",
    a: "It projects 30 days of demand, compares that with usable stock and shelf life, then gives you a date.",
  },
  {
    q: "Is this connected to real facility data?",
    a: "The demo uses simulated facility records. Weather is real Open-Meteo history and disease signals come from public NCDC and NMIS sources.",
  },
  {
    q: "What happens when the network goes down?",
    a: "Receipts, issues and counts queue on the device and sync when the connection returns.",
  },
  {
    q: "Does Sentry move stock automatically?",
    a: "No. Sentry recommends a batch and a destination. A person approves the move.",
  },
  {
    q: "Who approves a transfer?",
    a: "A manager at the sending or receiving facility. Every step is logged.",
  },
  {
    q: "How accurate is the model?",
    a: "The demo model scores 16.7% WAPE on a held-out backtest. A seasonal baseline scores 28.6%.",
  },
  {
    q: "What about expiry?",
    a: "Every batch carries an expiry date. FEFO issue takes the soonest batch first, and waste is flagged early.",
  },
  {
    q: "Can I audit a decision?",
    a: "Yes. The forecast, the recommendation, the approval and the receipt all live in one movement log.",
  },
];

const frontline = [
  {
    icon: Boxes,
    title: "Live stock",
    copy: "Every batch on every shelf.",
  },
  {
    icon: ClipboardCheck,
    title: "FEFO issue",
    copy: "Soonest expiry goes first.",
  },
  {
    icon: WifiOff,
    title: "Offline queue",
    copy: "Counts and issues keep working.",
  },
  {
    icon: ScanLine,
    title: "Barcode scan",
    copy: "Find a batch fast.",
  },
  {
    icon: Clock3,
    title: "Expiry watch",
    copy: "See waste before it happens.",
  },
  {
    icon: Layers,
    title: "Stock counts",
    copy: "A count that reconciles.",
  },
  {
    icon: Waypoints,
    title: "Transfer requests",
    copy: "Ask a neighbour for cover.",
  },
  {
    icon: ShieldCheck,
    title: "Audit trail",
    copy: "Every change has a name.",
  },
];

const network = [
  {
    icon: Radar,
    title: "Network view",
    copy: "One map of every shelf.",
  },
  {
    icon: TrendingUp,
    title: "30-day forecasts",
    copy: "Demand with its signals.",
  },
  {
    icon: Activity,
    title: "Backtested model",
    copy: "Held-out WAPE on every line.",
  },
  {
    icon: Waypoints,
    title: "Transfer matching",
    copy: "Surplus paired to shortage.",
  },
  {
    icon: ClipboardCheck,
    title: "Approval flow",
    copy: "A person signs every move.",
  },
  {
    icon: ShieldCheck,
    title: "Risk queue",
    copy: "The shelves that need attention.",
  },
  {
    icon: Database,
    title: "Data provenance",
    copy: "Source and freshness on each set.",
  },
  {
    icon: Users,
    title: "Role-based access",
    copy: "Everyone sees their lane.",
  },
];

const views = [
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Forecasts", href: "/forecasts", icon: TrendingUp },
  { label: "Transfers", href: "/transfers", icon: Waypoints },
  { label: "Approvals", href: "/transfers", icon: ClipboardCheck },
  { label: "Audit", href: "/data", icon: ShieldCheck },
  { label: "Mobile", href: "/m", icon: Smartphone },
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

  const facility = hero?.facilityShortName ?? "Gwagwalada PHC";
  const source =
    data.facilities.find((f) => f.id === heroSourceId)?.shortName ?? "General Hospital Abuja";
  const days = Math.max(1, Math.floor(opportunity?.daysToStockout ?? hero?.daysToStockout ?? 11));
  const transfer = opportunity?.quantity ?? 156;
  const coverAfter = Math.round(opportunity?.daysCoveredAfter ?? 49);
  const medicine = hero ? `${hero.genericName} ${hero.strength}` : "ACT 20/120mg";
  const shelfLife = opportunity?.expiryDate ? formatDate(opportunity.expiryDate) : "250 days";

  const medicineMap = new Map<string, { name: string; category: string }>();
  for (const line of data.series) {
    if (!medicineMap.has(line.medicineId)) {
      medicineMap.set(line.medicineId, {
        name: `${line.genericName} ${line.strength}`,
        category: line.category,
      });
    }
  }
  const medicines = [...medicineMap.values()];

  const medicineGroups = [
    {
      title: "Antimalarials & antibiotics",
      categories: ["ANTIMALARIAL", "ANTIBIOTIC"],
    },
    {
      title: "Pain, fever & everyday care",
      categories: ["ANALGESIC"],
    },
    {
      title: "Rehydration & essentials",
      categories: ["ORS", "OTHER"],
    },
    {
      title: "Chronic & respiratory",
      categories: ["CHRONIC", "RESPIRATORY"],
    },
  ].map((group) => ({
    ...group,
    items: medicines
      .filter((m) => group.categories.includes(m.category))
      .map((m) => m.name),
  }));

  const signalCards = [
    {
      image: "/sentry/signal-pharmacy.jpg",
      value: String(days),
      unit: "days",
      name: medicine,
      meta: facility,
      description: `${transfer} tablets short. ${source} can cover ${coverAfter} days.`,
      level: 2,
    },
    {
      image: "/sentry/signal-counter.jpg",
      value: String(data.totals.seriesCount),
      unit: "lines",
      name: "Forecast register",
      meta: `${data.totals.facilities} facilities`,
      description: "Every line scored on held-out data.",
      level: 4,
    },
    {
      image: "/sentry/split-care.jpg",
      value: `${data.totals.facilities}/${data.totals.facilities}`,
      unit: "facilities",
      name: "Facilities visible",
      meta: "One network",
      description: "The same stock picture for every shelf.",
      level: 3,
    },
    {
      image: "/sentry/signal-shelves.jpg",
      value: "731",
      unit: "days",
      name: "Consumption history",
      meta: "Two years",
      description: "Batches, counts and issues in one record.",
      level: 5,
    },
    {
      image: "/sentry/signal-clinic.jpg",
      value: "16.7%",
      unit: "WAPE",
      name: "Forecast error",
      meta: "28.6% baseline",
      description: "Measured on the demo network.",
      level: 4,
    },
  ];

  return (
    <div className="min-h-dvh bg-bone">
      <SiteHeader />

      <main>
        {/* ---------------------------------------------------------------- hero */}
        <section className="relative isolate min-h-[100svh] overflow-hidden bg-ink text-bone">
          <div className="hero-media absolute inset-0">
            <picture>
              <source media="(min-width: 768px)" srcSet="/sentry/hero-desktop.jpg" />
              {/* Art direction needs a real <picture>; next/image has no media source. */}
              <img
                src="/sentry/hero-mobile.jpg"
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover object-[58%_42%] md:object-center"
              />
            </picture>
            <div className="absolute inset-0 bg-[#6c4833] opacity-20 mix-blend-multiply" />
            <div className="absolute inset-x-0 top-0 h-64 bg-bark/55 mix-blend-color" />
            <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-ink/85 via-ink/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-ink/80 via-ink/25 to-transparent md:block" />
            <div className="print-grain opacity-20" />
          </div>

          <div className="relative z-10 flex min-h-[100svh] flex-col px-5 pb-6 pt-[104px] sm:px-8 sm:pb-8 sm:pt-[124px] lg:px-12 lg:pb-10 lg:pt-[144px]">
            <h1 className="max-w-[1180px] text-[clamp(2.4rem,10.8vw,4.2rem)] font-medium leading-[0.94] tracking-[-0.05em] text-bone md:text-[clamp(4.2rem,7.2vw,8rem)]">
              <span className="hero-line" style={{ overflow: "visible" }}>
                <span>See the shortage.</span>
              </span>
              <span
                className="hero-line hero-line-2 mt-[0.2em]"
                style={{ overflow: "visible" }}
              >
                <span>Before it happens.</span>
              </span>
            </h1>

            <div className="mt-auto hidden items-end justify-between gap-10 xl:flex">
              <ul className="grid w-full max-w-[840px] grid-cols-3 gap-8">
                {[
                  {
                    icon: Radar,
                    title: "Real-time stock",
                    copy: "Every batch, up to date.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Demand forecasts",
                    copy: "Thirty days ahead.",
                  },
                  {
                    icon: Waypoints,
                    title: "Network transfers",
                    copy: "Surplus moves with approval.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title} className="flex gap-4">
                      <Icon
                        className="mt-0.5 h-9 w-9 shrink-0 text-bone"
                        strokeWidth={1.05}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-[20px] font-medium leading-[1.1] text-bone">
                          {item.title}
                        </p>
                        <p className="mt-2 max-w-[250px] text-[14px] leading-[1.5] text-bone/65">
                          {item.copy}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="hero-fade-up w-full max-w-[500px] shrink-0">
                <p className="text-[clamp(1.65rem,2.4vw,2.5rem)] leading-[1.14] tracking-[-0.03em] text-bone">
                  Your network holds the signal. We help you see it.
                </p>
                <ArrowPill light label="Explore the dashboard" className="mt-6" />
              </div>
            </div>

            <div className="mt-auto pt-8 xl:hidden">
              <p className="hero-fade-up max-w-[480px] text-[clamp(1.6rem,4.4vw,2.2rem)] leading-[1.15] tracking-[-0.03em] text-bone">
                Your network holds the signal. We help you see it.
              </p>
              <ArrowPill
                light
                label="Explore the dashboard"
                className="hero-fade-up hero-fade-up-late mt-5 w-full sm:w-[340px]"
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- overview */}
        <section id="system" className="overflow-hidden bg-bone text-ink">
          <div className="mx-auto max-w-[1440px] px-5 pt-20 sm:px-8 sm:pt-28 lg:px-12">
            <Reveal className="flex items-start gap-3 sm:gap-4">
              <Asterisk className="mt-[1px] h-6 w-6 shrink-0" strokeWidth={1.5} />
              <p className="max-w-[250px] text-[11px] font-medium uppercase leading-[1.45] tracking-[0.09em]">
                What the network is telling you
              </p>
            </Reveal>

            <Reveal delay={90}>
              <h2 className="mt-16 max-w-[1300px] text-[clamp(2.6rem,6.2vw,5.9rem)] font-medium leading-[1.02] tracking-[-0.04em] sm:mt-20">
                A shared view of every shelf, every forecast and every move.
              </h2>
            </Reveal>
          </div>

          <div className="mt-14 overflow-hidden pb-20 sm:mt-20 sm:pb-28">
            <div className="animate-marquee flex w-max hover:[animation-play-state:paused] motion-reduce:[animation-duration:140s]">
              {[0, 1].map((set) => (
                <div key={set} className="flex" aria-hidden={set === 1 || undefined}>
                  {signalCards.map((card) => (
                    <SignalCard key={`${set}-${card.name}`} {...card} />
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-6 px-5 text-[10px] uppercase tracking-[0.14em] text-muted sm:px-8 lg:px-12">
              Illustrative signals from the FCT network
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- platform */}
        <section id="platform" className="bg-bone px-5 pb-24 text-ink sm:px-8 sm:pb-32 lg:px-12">
          <div className="mx-auto max-w-[1440px]">
            <Reveal>
              <h2 className="max-w-[1080px] text-[clamp(2.5rem,5.1vw,4.9rem)] font-medium leading-[1.02] tracking-[-0.04em]">
                The network, line by line.
                <br />
                {data.totals.seriesCount} forecast lines across {data.totals.facilities}{" "}
                facilities.
              </h2>
            </Reveal>

            <div className="mt-14 grid border-y border-dotted border-line sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: ScanLine,
                  title: "Live stock",
                  copy: "Current to the batch, at every facility.",
                },
                {
                  icon: TrendingUp,
                  title: "Real forecasts",
                  copy: "Thirty days out, with the signals shown.",
                },
                {
                  icon: Waypoints,
                  title: "Approved transfers",
                  copy: "Surplus matched to the next shortage.",
                },
                {
                  icon: ShieldCheck,
                  title: "Early warnings",
                  copy: "Expiry and stockouts, before they bite.",
                },
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Reveal
                    key={feature.title}
                    delay={index * 80}
                    className="border-b border-dotted border-line last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"
                  >
                    <div className="px-1 py-10 sm:px-7">
                      <Icon className="h-10 w-10" strokeWidth={1.05} aria-hidden="true" />
                      <h3 className="mt-10 text-[24px] font-medium leading-[1.05] tracking-[-0.025em] sm:mt-20">
                        {feature.title}
                      </h3>
                      <p className="mt-3 max-w-[260px] text-[13.5px] leading-[1.55] text-muted">
                        {feature.copy}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------- network */}
        <section id="network" className="bg-bone text-ink">
          <div className="grid lg:grid-cols-2">
            <div className="relative min-h-[440px] overflow-hidden lg:min-h-[760px]">
              <Image
                src="/sentry/split-care.jpg"
                alt="A nurse checking a child in a Nigerian hospital ward"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="photo-warm object-cover"
              />
              <div className="absolute inset-0 bg-bark/20 mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
            </div>

            <div className="flex flex-col justify-between gap-20 bg-sand px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-20">
              <Reveal>
                <h2 className="max-w-[520px] text-[clamp(2.8rem,4.7vw,5.2rem)] font-medium leading-[0.98] tracking-[-0.045em]">
                  Every facility
                  <br />
                  counts.
                </h2>
              </Reveal>

              <Reveal delay={120} className="max-w-[520px]">
                <p className="text-[clamp(1.25rem,1.55vw,1.55rem)] leading-[1.35] tracking-[-0.02em]">
                  A health centre and a general hospital should see the same supply
                  picture. Sentry gives them one.
                </p>
                <ArrowPill label="See every facility" className="mt-8" />
              </Reveal>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------- command */}
        <section className="bg-bone px-5 py-24 text-center text-ink sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1440px]">
            <Reveal>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                One screen
              </p>
              <h2 className="mx-auto mt-5 max-w-[900px] text-[clamp(2.5rem,4.9vw,4.8rem)] font-medium leading-[1.0] tracking-[-0.04em]">
                The whole network,
                <br />
                in one view.
              </h2>
              <p className="mx-auto mt-6 max-w-[540px] text-[14px] leading-[1.65] text-muted">
                Stock, forecasts, transfers and approvals. The next decision is
                visible, and so is the reason.
              </p>
            </Reveal>

            <Reveal delay={120} className="mx-auto mt-14 max-w-[1180px] sm:mt-20">
              <div className="rounded-[22px] bg-ink p-1.5 shadow-[0_50px_100px_-50px_rgba(25,15,10,0.75)] sm:rounded-[30px] sm:p-2.5">
                <Image
                  src="/sentry/command.png"
                  alt="Sentry network overview dashboard"
                  width={2400}
                  height={1500}
                  sizes="(min-width: 1180px) 1180px, 100vw"
                  className="h-auto w-full rounded-[17px] sm:rounded-[23px]"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------------- designed */}
        <section className="bg-bone px-5 pb-24 text-ink sm:px-8 sm:pb-32 lg:px-12">
          <div className="mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
            <div className="self-start lg:sticky lg:top-16">
              <h2 className="max-w-[560px] text-[clamp(2.5rem,4.6vw,4.9rem)] font-medium leading-[1.01] tracking-[-0.04em]">
                Built for the counter and the command centre.
              </h2>
              <p className="mt-6 max-w-[390px] text-[14px] leading-[1.65] text-muted">
                The person at the shelf gets a fast, offline tool. The network gets
                the same record.
              </p>
            </div>

            <Reveal className="border-t border-dotted border-line">
              {[
                {
                  icon: Activity,
                  title: "Risk, not just low stock",
                  copy: "Safe cover and shelf life decide what needs attention.",
                },
                {
                  icon: TrendingUp,
                  title: "Forecasts you can defend",
                  copy: "Every curve shows the signals behind it.",
                },
                {
                  icon: Boxes,
                  title: "Batch-level records",
                  copy: "Expiry, quantity and FEFO on every line.",
                },
                {
                  icon: ClipboardCheck,
                  title: "Transfers with a trail",
                  copy: "Recommended, approved, moved, received.",
                },
                {
                  icon: WifiOff,
                  title: "Works offline",
                  copy: "Counts and issues sync when the network returns.",
                },
                {
                  icon: Smartphone,
                  title: "Built for the counter",
                  copy: "Fast search and a phone-sized workflow.",
                },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="grid grid-cols-[28px_1fr] gap-3 border-b border-dotted border-line py-8 sm:grid-cols-[48px_1fr] sm:gap-6"
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.1} aria-hidden="true" />
                    <div>
                      <h3 className="text-[19px] font-medium leading-[1.2] tracking-[-0.02em]">
                        {feature.title}
                      </h3>
                      <p className="mt-2 max-w-[540px] text-[13px] leading-[1.6] text-muted">
                        {feature.copy}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Reveal>
          </div>

          <div className="mx-auto mt-20 max-w-[1440px] sm:mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-dotted border-line pt-8">
              <h3 className="text-[clamp(1.8rem,2.6vw,2.6rem)] font-medium tracking-[-0.03em]">
                Every medicine, accounted for.
              </h3>
              <Link
                href="/inventory"
                className="inline-flex items-center gap-2 text-[12px] font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink"
              >
                Browse the catalogue
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
              {medicineGroups.map((group, index) => (
                <div
                  key={group.title}
                  className={cn(
                    "border-t border-dotted border-line pt-6 lg:border-t-0 lg:pt-0",
                    index > 0 && "lg:border-l lg:border-dotted lg:pl-6",
                  )}
                >
                  <h4 className="max-w-[220px] text-[clamp(1.5rem,2.1vw,2.1rem)] font-medium leading-[1.02] tracking-[-0.03em]">
                    {group.title}
                  </h4>
                  <ul className="mt-8 space-y-2 text-[12.5px] leading-[1.5] text-muted">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- views */}
        <section id="views" className="relative isolate overflow-hidden bg-ink text-bone">
          <Image
            src="/sentry/fullbleed-apothecary.jpg"
            alt="Warmly lit shelves of medicine bottles"
            fill
            sizes="100vw"
            className="photo-warm object-cover"
          />
          <div className="absolute inset-0 bg-ink/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/35 to-ink/60" />

          <div className="relative mx-auto flex min-h-[540px] max-w-[1100px] flex-col items-center justify-center px-5 py-24 text-center sm:min-h-[620px] sm:px-8">
            <Reveal className="flex flex-col items-center">
              <h2 className="text-[clamp(2.4rem,4.5vw,4.4rem)] font-medium leading-[1.0] tracking-[-0.045em]">
                Choose your view.
              </h2>

              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {views.map((view) => {
                  const Icon = view.icon;
                  return (
                    <Link
                      key={view.label}
                      href={view.href}
                      className="group inline-flex h-[58px] items-center gap-3 rounded-full border border-bone/25 bg-ink/55 pl-2 pr-5 text-[13px] font-medium text-bone backdrop-blur-sm transition-colors hover:bg-ink/85"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-bone text-ink">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.4} />
                      </span>
                      {view.label}
                    </Link>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------------------------- roles */}
        <section className="bg-bone px-3 py-6 text-ink sm:px-4 sm:py-8">
          <div className="mx-auto grid max-w-[1440px] gap-3 lg:grid-cols-2">
            <Reveal>
              <RoleCard
                title="Frontline"
                subtitle="For the person at the shelf."
                items={frontline}
                className="bg-surface"
              />
            </Reveal>
            <Reveal delay={100}>
              <RoleCard
                title="Network"
                subtitle="For the people responsible for the whole network."
                items={network}
                className="bg-sand"
              />
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------------------------- proof */}
        <section className="relative isolate overflow-hidden bg-ink px-5 py-24 text-bone sm:px-8 sm:py-32 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_18%,#8e775c_0%,#492415_34%,#190f0a_72%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/80" />
          <div className="print-grain opacity-25" />

          <div className="relative mx-auto max-w-[1440px]">
            <Reveal className="flex flex-wrap items-end justify-between gap-8">
              <h2 className="max-w-[760px] text-[clamp(2.5rem,4.8vw,4.8rem)] font-medium leading-[0.98] tracking-[-0.045em]">
                From signal
                <br />
                to shelf.
              </h2>
              <p className="max-w-[340px] pb-2 text-[13px] leading-[1.65] text-bone/60">
                Three steps from a predicted shortage to a received transfer.
              </p>
            </Reveal>

            <Reveal delay={100} className="mt-14 border-y border-bone/20">
              {[
                {
                  icon: Radar,
                  when: "Day 0",
                  title: "The signal",
                  items: [
                    "Stock, use and expiry in one place.",
                    "The network sees itself.",
                    "Critical lines rise first.",
                  ],
                },
                {
                  icon: TrendingUp,
                  when: "Day 1",
                  title: "The forecast",
                  items: [
                    "Thirty days of demand.",
                    "Rain, fever and seasonality shown.",
                    "The stockout date appears.",
                  ],
                },
                {
                  icon: Waypoints,
                  when: "Week 2",
                  title: "The move",
                  items: [
                    "Surplus matched to shortage.",
                    "A manager approves the batch.",
                    "Receipt recalculates cover.",
                  ],
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.when}
                    className="grid gap-5 border-b border-bone/20 py-8 last:border-b-0 sm:grid-cols-[64px_180px_1fr] sm:items-start sm:gap-8 sm:py-10"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full border border-bone/30">
                      <Icon className="h-5 w-5" strokeWidth={1.2} />
                    </span>
                    <p className="text-[15px] font-medium text-bone/70">{step.when}</p>
                    <div className="grid gap-6 sm:grid-cols-[0.8fr_1.2fr]">
                      <h3 className="text-[clamp(1.5rem,2vw,2rem)] font-medium leading-[1.05] tracking-[-0.03em]">
                        {step.title}
                      </h3>
                      <ul className="space-y-2 text-[13px] leading-[1.55] text-bone/70">
                        {step.items.map((item) => (
                          <li key={item} className="flex gap-2.5">
                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-bone/60" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </Reveal>

            <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              <ProofStat value={String(data.totals.facilities)} label="Facilities" />
              <ProofStat value={String(data.totals.seriesCount)} label="Forecast lines" />
              <ProofStat value="16.7%" label="Model WAPE" />
              <ProofStat value={`${days} to ${coverAfter}`} label="Days of cover" />
            </div>

            <p className="mt-10 max-w-[720px] text-[10px] leading-[1.65] text-bone/40">
              Simulated facility records, real Abuja weather, public disease signals.
              Model metrics come from a held-out backtest. They prove the pipeline,
              not real-world impact. The recommended batch has {shelfLife} of shelf
              life.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------- faq */}
        <section id="faq" className="bg-bone px-5 py-24 text-ink sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            <div className="relative min-h-[400px] overflow-hidden bg-ink lg:min-h-[760px]">
              <Image
                src="/sentry/faq-pharmacy.jpg"
                alt="A pharmacist arranging medicine on a warm wooden shelf"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="photo-warm object-cover"
              />
              <div className="absolute inset-0 bg-bark/15 mix-blend-multiply" />
            </div>

            <Reveal>
              <h2 className="text-[clamp(2.6rem,4.7vw,4.7rem)] font-medium leading-[1] tracking-[-0.045em]">
                Quick answers.
              </h2>
              <div className="mt-10 border-t border-dotted border-line">
                {faqs.map((faq) => (
                  <details
                    key={faq.q}
                    className="group border-b border-dotted border-line"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15.5px] font-medium leading-[1.3] [&::-webkit-details-marker]:hidden">
                      {faq.q}
                      <Plus
                        className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-45"
                        strokeWidth={1.4}
                      />
                    </summary>
                    <p className="max-w-[620px] pb-6 pr-8 text-[13px] leading-[1.7] text-muted">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------------- cta */}
        <section className="relative isolate flex min-h-[620px] items-center justify-center overflow-hidden bg-ink px-5 py-24 text-bone sm:min-h-[720px] sm:px-8 lg:px-12">
          <Image
            src="/sentry/hero-desktop.jpg"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            className="object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 bg-[#6c4833] opacity-20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/55 via-transparent to-ink/55" />

          <Reveal className="relative mx-auto flex max-w-[900px] flex-col items-center text-center">
            <h2 className="text-[clamp(2.7rem,5.6vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.045em]">
              Know before
              <br />
              the shelf does.
            </h2>
            <ArrowPill light label="Open dashboard" className="mt-9" />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ArrowPill({
  href = "/home",
  label = "View dashboard",
  light = false,
  className,
}: {
  href?: string;
  label?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-[58px] items-center gap-8 rounded-full pl-6 pr-2 text-[13px] font-medium transition-colors",
        light ? "bg-bone text-ink hover:bg-sand" : "bg-ink text-bone hover:bg-bark",
        className,
      )}
    >
      {label}
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full",
          light ? "bg-ink text-bone" : "bg-bone text-ink",
        )}
      >
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function SignalCard({
  image,
  value,
  unit,
  name,
  meta,
  description,
  level,
}: {
  image: string;
  value: string;
  unit: string;
  name: string;
  meta: string;
  description: string;
  level: number;
}) {
  return (
    <article className="relative mr-3 h-[430px] w-[304px] shrink-0 overflow-hidden bg-ink text-bone sm:h-[500px] sm:w-[388px] lg:h-[540px] lg:w-[442px]">
      <Image
        src={image}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width: 1024px) 442px, (min-width: 640px) 388px, 304px"
        className="photo-warm object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/20 to-ink/50" />
      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
        <div>
          <div className="flex items-start justify-between gap-3 border-b border-bone/30 pb-3">
            <div className="flex items-end gap-2">
              <span className="text-[56px] font-medium leading-[0.8] tracking-[-0.06em] sm:text-[64px]">
                {value}
              </span>
              <span className="pb-1.5 text-[12px] text-bone/65">{unit}</span>
            </div>
            <div className="flex gap-1 pt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={cn("h-2 w-2", i < level ? "bg-bone" : "bg-bone/25")}
                />
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="max-w-[250px] text-[17px] font-medium leading-[1.15]">
              {name}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-bone/55">
              {meta}
            </p>
          </div>
        </div>
        <p className="max-w-[340px] text-[13.5px] leading-[1.5] text-bone/75">
          {description}
        </p>
      </div>
    </article>
  );
}

function RoleCard({
  title,
  subtitle,
  items,
  className,
}: {
  title: string;
  subtitle: string;
  items: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; copy: string }[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-[14px] px-6 py-12 sm:px-9 sm:py-16 lg:px-11", className)}>
      <div className="flex items-start justify-between gap-6">
        <h3 className="text-[clamp(2.4rem,3.4vw,3.5rem)] font-medium leading-none tracking-[-0.045em]">
          {title}
        </h3>
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-ink" />
      </div>
      <p className="mt-3 text-[13px] text-body">{subtitle}</p>

      <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/15 bg-ink/[0.04]">
                <Icon className="h-4 w-4" strokeWidth={1.3} />
              </span>
              <div>
                <p className="text-[15px] font-medium leading-[1.25] tracking-[-0.01em]">
                  {item.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-muted">
                  {item.copy}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProofStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-[clamp(2.6rem,4vw,4rem)] font-medium leading-none tracking-[-0.04em]">
        {value}
      </p>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.1em] text-bone/55">
        {label}
      </p>
    </div>
  );
}
