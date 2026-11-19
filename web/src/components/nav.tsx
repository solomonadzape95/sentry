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
} as const;

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
};

export function SidebarNav({
  role,
  collapsed = false,
  activeFacility,
  onNavigate,
}: {
  role: string;
  collapsed?: boolean;
  activeFacility?: { id: string; shortName: string } | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSeeNav(role, item.href)),
  })).filter((section) => section.items.length > 0) as {
    label: string;
    items: NavItem[];
  }[];

  const facilityItem =
    role === "FACILITY_MANAGER" && activeFacility
      ? {
          href: `/facilities/${activeFacility.id}`,
          label: "My facility",
          icon: "building" as const,
        }
      : null;

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
      {facilityItem ? (
        <div>
          <p
            className={cn(
              "mb-2 px-3 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-bone/35",
              collapsed && "sr-only",
            )}
          >
            Facility
          </p>
          <NavLink
            item={facilityItem}
            active={pathname === facilityItem.href}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </div>
      ) : null}

      {sections.map((section) => (
        <div key={section.label}>
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-bone/15" aria-hidden="true" />
          ) : (
            <p className="mb-2 px-3 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-bone/35">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
              return (
                <NavLink
                  key={item.href}
                  item={item}
                  active={active}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = icons[item.icon];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-full text-[12.5px] font-medium tracking-[-0.01em] transition-colors",
        collapsed ? "mx-auto h-10 w-10 justify-center" : "px-3 py-2.5",
        active
          ? "bg-bone text-ink"
          : "text-bone/60 hover:bg-bone/[0.06] hover:text-bone",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-ink" : "text-bone/40 group-hover:text-bone/80",
        )}
        strokeWidth={1.5}
      />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
      {!collapsed && active ? (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ink" />
      ) : null}
    </Link>
  );
}
