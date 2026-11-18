import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, LogOut, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { getScope } from "@/lib/session";
import { signOutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier portal" };

export default async function SupplierPage() {
  const scope = await getScope();
  if (scope.persona.role !== "SUPPLIER") redirect(scope.home);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-brand-deep px-5 py-4 text-bone sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Logo theme="dark" href="/supplier" />
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-[11px] font-medium text-bone">{scope.persona.name}</span>
              <span className="block text-[10px] text-bone/45">{scope.persona.title}</span>
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-bone/15 px-3 text-[11px] font-medium text-bone/75 transition-colors hover:bg-white/5 hover:text-bone"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone">
          Supplier access
        </p>
        <h1 className="mt-3 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-ink">
          Orders, not inventory.
        </h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
          Supplier accounts only see purchase orders addressed to their organisation.
          Facility stock, consumption, forecasts and patient-adjacent signals are never
          exposed here.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: PackageCheck,
              title: "Assigned orders",
              body: "Purchase orders, quantities, delivery windows and status.",
            },
            {
              icon: Truck,
              title: "Dispatch confirmation",
              body: "Confirm what left the warehouse and when it should arrive.",
            },
            {
              icon: Building2,
              title: "Catalogue",
              body: "Your availability and lead times for the essential medicines list.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <CardBody>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-[13px] font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.body}</p>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <Card className="mt-5">
          <CardHeader
            title="Purchase-order portal"
            subtitle="Deferred in this build"
            action={<Badge tone="warning">Not enabled</Badge>}
            icon={<ShieldCheck className="h-4 w-4" />}
          />
          <CardBody className="space-y-4">
            <p className="text-[12px] leading-relaxed text-muted">
              The backend already stores suppliers, purchase orders and delivery dates.
              The supplier portal is the next increment after the internal three-role
              build. Until then, supplier accounts are denied internal data and cannot
              modify facility inventory.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className={buttonClass({ variant: "secondary", size: "sm" })}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Public site
              </Link>
            </div>
          </CardBody>
        </Card>

        <p className="mt-6 text-[10px] leading-relaxed text-muted">
          Signed in as {scope.persona.email}. Supplier identity is not yet linked to a
          supplier organisation; that link is part of the portal work.
        </p>
      </main>
    </div>
  );
}
