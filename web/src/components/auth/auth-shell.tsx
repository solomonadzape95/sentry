import Link from "next/link";
import { ShieldCheck, Smartphone, TrendingUp } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { Logo } from "@/components/logo";

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
  footer,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="relative hidden overflow-hidden bg-brand-deep p-10 text-bone lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 18% 12%, rgba(204,183,163,0.24), transparent 62%), radial-gradient(ellipse 55% 45% at 92% 88%, rgba(142,119,92,0.28), transparent 66%)",
          }}
        />
        <div className="relative">
          <Logo theme="dark" />
          <p className="mt-16 max-w-md text-[11px] font-medium uppercase tracking-[0.18em] text-bone/45">
            {APP_TAGLINE}
          </p>
          <h2 className="mt-4 max-w-lg text-[42px] font-medium leading-[1.02] tracking-[-0.045em] text-bone xl:text-[52px]">
            The shortage is visible before the shelf is empty.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-bone/65">
            Forecast demand, protect batch expiry and move verified surplus between
            facilities, with every decision attributable to a person.
          </p>

          <div className="mt-12 grid max-w-md gap-4">
            {[
              {
                icon: TrendingUp,
                title: "Forecast before the gap",
                body: "Thirty-day demand curves with uncertainty, stockout dates and reorder gaps.",
              },
              {
                icon: ShieldCheck,
                title: "Two-party stock control",
                body: "The sending facility dispatches; the receiving facility confirms. Every step audited.",
              },
              {
                icon: Smartphone,
                title: "Works on the ward round",
                body: "Mobile issue, receive and count with an offline queue that syncs when the signal returns.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-bone/15 bg-bone/[0.06]">
                    <Icon className="h-4 w-4 text-sand" />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-bone">{item.title}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-bone/50">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mt-12 border-t border-bone/10 pt-5">
          <p className="text-[10px] leading-relaxed text-bone/35">
            {APP_NAME} demo build. Facility inventory and consumption are simulated.
            Disease signals mix real NCDC reports with derived indices.
          </p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between px-5 py-5 lg:hidden">
          <Logo theme="light" />
          <Link href="/" className="text-[11px] font-medium text-muted hover:text-ink">
            Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[420px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[32px] font-medium leading-[1.05] tracking-[-0.04em] text-ink">
              {title}
            </h1>
            <div className="mt-2 text-[13px] leading-relaxed text-muted">{description}</div>

            <div className="mt-7">{children}</div>

            {footer ? (
              <div className="mt-7 border-t border-line pt-5 text-[12px] leading-relaxed text-muted">
                {footer}
              </div>
            ) : null}
          </div>
        </div>

        <footer className="px-5 pb-6 text-[10px] leading-relaxed text-muted sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-ink/70">{APP_NAME}</span>
            <Link href="/" className="hover:text-ink">
              Public site
            </Link>
            <span>Access is invite-only.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
