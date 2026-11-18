"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Building2,
  ClipboardCheck,
  Database,
  Package,
  Radar,
  Settings,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { NAV_SECTIONS } from "@/lib/config";
import { canSeeNav } from "@/lib/authz";
import { cn } from "@/lib/utils";

const icons = {
  today: ClipboardCheck,
  network: Radar,
  building: Building2,
  package: Package,
  trend: TrendingUp,
  shuffle: ArrowLeftRight,
  activity: Activity,
  database: Database,
  settings: Settings,
  user: UserRound,
} as const;

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSeeNav(role, item.href)),
  })).filter((section) => section.items.length > 0);

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = icons[item.icon];
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-white/10 text-white shadow-sm ring-1 ring-inset ring-white/10"
                      : "text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4", active ? "text-[#f4e6ac]" : "text-white/45")}
                    strokeWidth={2}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = [
    { href: "/today", label: "Today" },
    { href: "/dashboard", label: "Network" },
    { href: "/facilities", label: "Facilities" },
    { href: "/inventory", label: "Inventory" },
    { href: "/forecasts", label: "Forecasts" },
    { href: "/transfers", label: "Transfers" },
    { href: "/account", label: "Account" },
  ].filter((item) => canSeeNav(role, item.href));
  return (
    <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b border-line bg-canvas px-4 py-2 lg:hidden">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
              active ? "bg-brand text-white" : "bg-surface text-muted ring-1 ring-line",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
