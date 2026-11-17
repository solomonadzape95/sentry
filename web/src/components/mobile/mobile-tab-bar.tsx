"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CloudOff, Home, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/m", label: "Home", icon: Home },
  { href: "/m/scan", label: "Scan", icon: ScanLine },
  { href: "/m/issue", label: "Issue", icon: ArrowUpRight },
  { href: "/m/queue", label: "Queue", icon: CloudOff },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl">
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active =
            tab.href === "/m" ? pathname === "/m" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg py-1 text-[9px] font-medium",
                active ? "text-brand" : "text-muted",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-9 place-items-center rounded-full",
                  active ? "bg-brand-soft" : "",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
