"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
  X,
} from "lucide-react";
import { DEMO_TODAY, ROLE_LABEL } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/nav";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  NotificationsMenu,
  type AppNotification,
} from "@/components/notifications-menu";

type Persona = {
  id: string;
  name: string;
  title: string;
  role: string;
};

function pageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Overview";
  if (pathname === "/today") return "Today";
  if (pathname === "/facilities") return "Facilities";
  if (pathname.startsWith("/facilities/")) return "Facility";
  if (pathname === "/inventory") return "Inventory";
  if (pathname === "/forecasts") return "Forecasts";
  if (pathname === "/transfers") return "Transfers";
  if (pathname === "/model") return "Model performance";
  if (pathname === "/data") return "Data provenance";
  if (pathname === "/admin") return "Administration";
  if (pathname === "/admin/users") return "Users & access";
  if (pathname === "/account") return "Account";
  return "Overview";
}

export function AppShell({
  children,
  persona,
  alertCount,
  facilityCount,
  demo,
  initialCollapsed,
  activeFacility,
  notifications,
  notificationViewAllHref,
}: {
  children: React.ReactNode;
  persona: Persona;
  alertCount: number;
  facilityCount: number;
  demo: boolean;
  initialCollapsed: boolean;
  activeFacility: { id: string; shortName: string } | null;
  notifications: AppNotification[];
  notificationViewAllHref: string;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      document.cookie = `sentry_sidebar=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  const roleLabel = ROLE_LABEL[persona.role] ?? persona.role;

  return (
    <div className="min-h-dvh bg-bone">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-ink text-bone lg:flex shell-transition",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        <SidebarContents
          collapsed={collapsed}
          persona={persona}
          roleLabel={roleLabel}
          facilityCount={facilityCount}
          demo={demo}
          activeFacility={activeFacility}
          onToggleCollapsed={toggleCollapsed}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[292px] max-w-[86vw] flex-col bg-ink text-bone shadow-[20px_0_60px_-30px_rgba(25,15,10,0.7)]">
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-5 z-10 grid h-8 w-8 place-items-center rounded-full border border-bone/15 text-bone/70 hover:bg-bone/10 hover:text-bone"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContents
              collapsed={false}
              persona={persona}
              roleLabel={roleLabel}
              facilityCount={facilityCount}
              demo={demo}
              activeFacility={activeFacility}
              onNavigate={() => setMobileOpen(false)}
              mobile
            />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-dvh shell-transition",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-line/80 bg-bone/85 backdrop-blur-xl">
          <div className="flex h-[60px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 text-ink hover:bg-ink/[0.05] lg:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="lg:hidden">
              <Logo theme="light" compact href="/home" />
            </div>

            <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                FCT network
              </span>
              <span aria-hidden="true" className="text-[10px] text-line">
                /
              </span>
              <span className="truncate text-[12px] font-medium text-ink">{pageTitle(pathname)}</span>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <span className="hidden items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 text-[9.5px] font-medium text-muted sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-clay" />
                {demo ? "Demo clock" : "Live"} · {formatDate(DEMO_TODAY)}
              </span>
              <NotificationsMenu
                notifications={notifications}
                count={alertCount}
                viewAllHref={notificationViewAllHref}
              />
              <Link
                href="/m"
                className="hidden h-9 items-center gap-1.5 rounded-full border border-line bg-panel/70 px-3 text-[10.5px] font-medium text-muted transition-colors hover:border-ink/20 hover:text-ink sm:inline-flex"
              >
                <Smartphone className="h-3.5 w-3.5" strokeWidth={1.5} />
                Mobile
              </Link>
              <Link
                href="/account"
                className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-ink/[0.05] sm:flex"
                aria-label="Account and security"
              >
                <Avatar name={persona.name} className="h-8 w-8" />
                <span className="hidden leading-tight xl:block">
                  <span className="block max-w-[160px] truncate text-[10.5px] font-medium text-ink">
                    {persona.name}
                  </span>
                  <span className="block text-[9px] text-muted">{roleLabel}</span>
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <div className="h-8" aria-hidden="true" />
      </div>
    </div>
  );
}

function SidebarContents({
  collapsed,
  persona,
  roleLabel,
  facilityCount,
  demo,
  activeFacility,
  onToggleCollapsed,
  onNavigate,
  mobile = false,
}: {
  collapsed: boolean;
  persona: Persona;
  roleLabel: string;
  facilityCount: number;
  demo: boolean;
  activeFacility: { id: string; shortName: string } | null;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  if (collapsed) {
    return (
      <>
        <div className="flex h-[72px] items-center justify-center">
          <Logo theme="dark" compact href="/home" />
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mx-auto mb-3 grid h-8 w-8 place-items-center rounded-full border border-bone/10 text-bone/45 hover:bg-bone/[0.06] hover:text-bone"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div
          className="mx-auto mb-4 grid h-9 w-9 place-items-center rounded-full border border-bone/10 bg-bone/[0.04]"
          title={`FCT network · ${facilityCount} facilities · demo clock`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sand" />
        </div>
        <SidebarNav
          role={persona.role}
          collapsed
          activeFacility={activeFacility}
          onNavigate={onNavigate}
        />
        <div className="mt-auto border-t border-bone/10 p-2">
          <Link
            href="/account"
            onClick={onNavigate}
            className="mx-auto grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-bone/[0.06]"
            title={`${persona.name} · ${roleLabel}`}
            aria-label="Account and security"
          >
            <Avatar name={persona.name} tone="dark" className="h-8 w-8" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex h-[72px] items-center justify-between px-4">
        <Logo theme="dark" href="/home" />
        {mobile ? null : (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="grid h-8 w-8 place-items-center rounded-full border border-bone/10 text-bone/45 hover:bg-bone/[0.06] hover:text-bone"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="mx-3 mb-5 rounded-[12px] border border-bone/10 bg-bone/[0.04] px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-sand" />
          <p className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-bone/45">
            {demo ? "Demo network" : "Network"}
          </p>
          <Badge className="ml-auto border-0 bg-bone/10 text-[8px] text-bone/65 ring-0">
            FCT
          </Badge>
        </div>
        <p className="mt-2 text-[12px] font-medium text-bone">
          {facilityCount} {facilityCount === 1 ? "facility" : "facilities"}
        </p>
        <p className="mt-0.5 text-[9.5px] text-bone/40">{formatDate(DEMO_TODAY)} · simulated records</p>
      </div>

      <SidebarNav
        role={persona.role}
        activeFacility={activeFacility}
        onNavigate={onNavigate}
      />

      <div className="mt-auto border-t border-bone/10 p-3">
        {mobile ? (
          <Link
            href="/m"
            onClick={onNavigate}
            className="mb-1 flex items-center gap-3 rounded-full px-3 py-2.5 text-[12px] font-medium text-bone/60 hover:bg-bone/[0.06] hover:text-bone"
          >
            <Smartphone className="h-[18px] w-[18px] text-bone/40" strokeWidth={1.5} />
            Mobile workspace
          </Link>
        ) : null}
        <Link
          href="/account"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-full px-2 py-2 text-bone/75 transition-colors hover:bg-bone/[0.06] hover:text-bone"
        >
          <Avatar name={persona.name} tone="dark" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium text-bone">
              {persona.name}
            </span>
            <span className="block truncate text-[9px] text-bone/40">{roleLabel}</span>
          </span>
          <span className="h-1 w-1 rounded-full bg-bone/25" />
        </Link>
      </div>
    </>
  );
}
