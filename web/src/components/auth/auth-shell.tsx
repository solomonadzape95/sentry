import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/config";
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
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <Image
          src="/sentry/hero-desktop.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="52vw"
          className="object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-ink/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/5 to-ink/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/35 via-transparent to-transparent" />
        <div className="print-grain opacity-20" />
        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Logo theme="dark" />
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
