import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";

const links = [
  { href: "#system", label: "The system" },
  { href: "#platform", label: "Platform" },
  { href: "#network", label: "Network" },
  { href: "#faq", label: "Answers" },
];

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 text-bone">
      <div className="flex h-[78px] items-center gap-6 px-5 sm:h-[90px] sm:px-8 lg:px-12">
        <Logo theme="dark" className="shrink-0" />

        <nav className="ml-auto hidden items-center gap-3.5 md:flex">
          {links.map((link, index) => (
            <span key={link.href} className="flex items-center gap-3.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-[10px] text-bone/35">
                  ·
                </span>
              ) : null}
              <Link
                href={link.href}
                className="text-[13px] text-bone/80 transition-colors hover:text-bone"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>

        <Link
          href="/dashboard"
          className="group ml-6 hidden h-[50px] items-center gap-4 rounded-full bg-ink/80 pl-6 pr-1.5 text-[13px] font-medium text-bone backdrop-blur-sm transition-colors hover:bg-ink md:inline-flex"
        >
          Dashboard
          <span className="grid h-9 w-9 place-items-center rounded-full bg-bone text-ink">
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </Link>

        <details className="group relative ml-auto md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-medium text-bone [&::-webkit-details-marker]:hidden">
            Menu
            <span className="h-1.5 w-1.5 rounded-full bg-bone" />
          </summary>

          <div className="absolute right-0 top-[calc(100%+18px)] w-[262px] rounded-[22px] border border-line bg-bone p-5 text-ink shadow-[0_30px_80px_-20px_rgba(25,15,10,0.55)]">
            <nav className="flex flex-col divide-y divide-line">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="py-3 text-[14px] text-body transition-colors first:pt-0 last:pb-0 hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/dashboard"
              className="mt-5 flex h-12 items-center justify-between rounded-full bg-ink pl-5 pr-1.5 text-[12px] font-medium text-bone"
            >
              Go to dashboard
              <span className="grid h-9 w-9 place-items-center rounded-full bg-bone text-ink">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
