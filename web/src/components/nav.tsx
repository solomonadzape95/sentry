"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Building2,
  Package,
  Radar,
  Settings,
  TrendingUp,
} from "lucide-react";
import { NAV_SECTIONS } from "@/lib/config";
import { cn } from "@/lib/utils";

const icons = {
  network: Radar,
  building: Building2,
  package: Package,
  trend: TrendingUp,
  shuffle: ArrowLeftRight,
  activity: Activity,
  settings: Settings,
} as const;

const visibility: Record<string, string[]> = {
  "/": ["NETWORK_AUTHORITY"],
  "/facilities": ["NETWORK_AUTHORITY", "FACILITY_MANAGER"],
  "/inventory": ["NETWORK_AUTHORITY", "FACILITY_MANAGER", "INVENTORY_OFFICER"],
  "/forecasts": ["NETWORK_AUTHORITY", "FACILITY_MANAGER", "INVENTORY_OFFICER"],
  "/transfers": ["NETWORK_AUTHORITY", "FACILITY_MANAGER", "INVENTORY_OFFICER"],
  "/model": ["NETWORK_AUTHORITY"],
  "/admin": ["NETWORK_AUTHORITY"],
};

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => visibility[item.href]?.includes(role) ?? false),
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
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                    className={cn("h-4 w-4", active ? "text-[#8fe3cd]" : "text-white/45")}
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
    { href: "/", label: "Network overview" },
    { href: "/facilities", label: "Facilities" },
    { href: "/inventory", label: "Inventory" },
    { href: "/forecasts", label: "Forecasts" },
    { href: "/transfers", label: "Transfers" },
  ].filter((item) => visibility[item.href]?.includes(role));
  return (
    <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b border-line bg-canvas px-4 py-2 lg:hidden">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
