import Link from "next/link";
import { Monitor } from "lucide-react";
import { getScope } from "@/lib/session";
import { Logo } from "@/components/logo";
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar";
import { NetworkStatus } from "@/components/mobile/network-status";

export const dynamic = "force-dynamic";

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const scope = await getScope();

  return (
    <div className="min-h-dvh bg-brand-deep sm:flex sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:py-8">
      <div className="hidden items-center gap-2 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[#8fe3cd]" />
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
          Aisec mobile · installable PWA
        </p>
      </div>

      <div className="relative mx-auto flex h-dvh w-full flex-col overflow-hidden bg-canvas sm:h-[860px] sm:max-h-[calc(100dvh-6rem)] sm:max-w-[418px] sm:rounded-[2.2rem] sm:border-[7px] sm:border-[#081c17] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]">
        <header className="z-20 flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <Logo theme="light" compact />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-ink">
              {scope.activeFacility?.shortName ?? "No facility scope"}
            </p>
            <NetworkStatus compact />
          </div>
          <Link
            href="/"
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted"
            aria-label="Open desktop dashboard"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Link>
        </header>

        <main className="scrollbar-thin flex-1 overflow-y-auto pb-24">{children}</main>
        <MobileTabBar />
      </div>

      <p className="hidden max-w-[418px] text-center text-[10px] leading-relaxed text-white/30 sm:block">
        Demo clock 17 Nov 2026 · Simulated facility data · Camera scanning requires permission
      </p>
    </div>
  );
}
