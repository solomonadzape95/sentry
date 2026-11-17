import Link from "next/link";
import { Bell, FlaskConical, Smartphone } from "lucide-react";
import { APP_NAME, DEMO_META, DEMO_TODAY, ROLE_LABEL } from "@/lib/config";
import { formatDayMonth } from "@/lib/format";
import { Logo } from "@/components/logo";
import { MobileNav, SidebarNav } from "@/components/nav";
import { PersonaSwitcher } from "@/components/persona-switcher";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";

type Persona = {
  id: string;
  name: string;
  title: string;
  role: string;
};

export function AppShell({
  children,
  persona,
  personas,
  alertCount,
  facilityCount,
}: {
  children: React.ReactNode;
  persona: Persona;
  personas: Persona[];
  alertCount: number;
  facilityCount: number;
}) {
  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-brand-dark lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Logo />
        </div>

        <div className="mx-3 mb-4 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8fe3cd]" />
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/50">
              Demo network
            </p>
          </div>
          <p className="mt-1 text-xs font-medium text-white/85">
            FCT · {facilityCount} {facilityCount === 1 ? "facility" : "facilities"}
          </p>
          <p className="text-[10px] text-white/40">17 Nov 2026 · simulated records</p>
        </div>

        <SidebarNav role={persona.role} />

        <div className="mt-auto border-t border-white/10 p-3">
          <PersonaSwitcher personas={personas} currentId={persona.id} />
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2">
            <FlaskConical className="mt-0.5 h-3 w-3 shrink-0 text-amber-300/80" />
            <p className="text-[10px] leading-relaxed text-white/40">
              Hackathon build. Facility and consumption data are simulated; disease
              signals are illustrative.
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <Logo theme="light" compact />
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-xs font-semibold text-ink">FCT demonstration network</span>
              <span className="text-line">/</span>
              <span className="text-xs text-muted">{formatDayMonth(DEMO_TODAY)}</span>
              <Badge tone="warning" className="ml-1">
                Demo clock
              </Badge>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-[10px] font-medium text-warn ring-1 ring-inset ring-warn/15 sm:flex">
                <FlaskConical className="h-3 w-3" />
                Simulated facility data
              </div>
              <Link
                href="/#alerts"
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-muted shadow-sm hover:text-ink"
                aria-label="Open alerts"
              >
                <Bell className="h-4 w-4" />
                {alertCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                ) : null}
              </Link>
              <Link href="/m" className={buttonClass({ variant: "secondary", size: "sm" })}>
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mobile app</span>
              </Link>
              <div className="lg:hidden">
                <PersonaSwitcher personas={personas} currentId={persona.id} variant="light" />
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                <Avatar name={persona.name} className="h-8 w-8" />
                <div className="leading-tight">
                  <p className="max-w-[130px] truncate text-xs font-semibold text-ink">
                    {persona.name}
                  </p>
                  <p className="text-[10px] text-muted">{ROLE_LABEL[persona.role]}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <MobileNav role={persona.role} />

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1500px] px-4 pb-8 pt-2 text-[10px] leading-relaxed text-muted sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4">
            <span className="font-medium text-ink/70">{APP_NAME} demo build</span>
            <span>Weather: {DEMO_META.weatherSource}</span>
            <span>Disease indicators: illustrative</span>
            <span>Facility inventory and consumption: simulated</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
