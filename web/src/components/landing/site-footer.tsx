import Link from "next/link";
import { ArrowUpRight, Monitor } from "lucide-react";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="bg-black px-5 pb-8 pt-16 text-bone sm:px-8 sm:pt-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.7fr_0.7fr_0.7fr] lg:gap-10">
          <div>
            <Logo theme="dark" />
            <p className="mt-5 max-w-[400px] text-[13px] leading-[1.7] text-bone/55">
              A predictive supply layer for Nigerian health facilities. See what
              every shelf holds, what it will need and where stock can move.
            </p>
            <Link
              href="/home"
              className="group mt-7 inline-flex h-[54px] items-center gap-8 rounded-full bg-bone pl-6 pr-2 text-[13px] font-medium text-ink transition-colors hover:bg-sand"
            >
              <span className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Go to dashboard
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-bone">
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          <FooterColumn
            title="Platform"
            links={[
              { href: "#system", label: "The system" },
              { href: "#platform", label: "Platform" },
              { href: "#network", label: "Network" },
              { href: "#faq", label: "Answers" },
            ]}
          />
          <FooterColumn
            title="Demo"
            links={[
              { href: "/dashboard", label: "Network overview" },
              { href: "/inventory", label: "Inventory" },
              { href: "/forecasts", label: "Forecasts" },
              { href: "/transfers", label: "Transfers" },
            ]}
          />
          <FooterColumn
            title="Evidence"
            links={[
              { href: "/model", label: "Model performance" },
              { href: "/data", label: "Data provenance" },
              { href: "/m", label: "Mobile PWA" },
            ]}
          />
        </div>

        <div className="mt-16 border-t border-bone/15 pt-6 text-[10px] text-bone/35">
          <span>© 2026 {APP_NAME}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-bone/35">
        {title}
      </p>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-[13px] text-bone/65 transition-colors hover:text-bone"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
