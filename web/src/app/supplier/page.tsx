import { redirect } from "next/navigation";
import {
  Building2,
  LogOut,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getScope } from "@/lib/session";
import { signOutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatDate, formatNumber, relativeToDemo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier portal" };

const statusTone: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CONFIRMED: "warning",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  CONFIRMED: "Confirmed",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function PortalHeader({ name, title }: { name: string; title: string }) {
  return (
    <header className="border-b border-line bg-brand-deep px-5 py-4 text-bone sm:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Logo theme="dark" href="/supplier" />
        <div className="flex items-center gap-3">
          <span className="hidden text-right sm:block">
            <span className="block text-[11px] font-medium text-bone">{name}</span>
            <span className="block text-[10px] text-bone/45">{title}</span>
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
  );
}

export default async function SupplierPage() {
  const scope = await getScope();
  if (scope.persona.role !== "SUPPLIER") redirect(scope.home);

  const supplierId = scope.persona.supplierId;
  const supplier = supplierId
    ? await prisma.supplier.findUnique({ where: { id: supplierId } })
    : null;

  if (!supplierId || !supplier) {
    return (
      <div className="min-h-dvh bg-canvas">
        <PortalHeader name={scope.persona.name} title={scope.persona.title} />
        <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone">
            Supplier access
          </p>
          <h1 className="mt-3 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-ink">
            Account not linked.
          </h1>
          <Card className="mt-6">
            <CardBody className="space-y-3">
              <p className="text-[12px] leading-relaxed text-muted">
                This supplier account is not attached to a supplier organisation, so no
                purchase orders can be shown. Ask a network administrator to link the
                account before signing in again.
              </p>
              <p className="text-[10px] text-muted">
                Signed in as {scope.persona.email}.
              </p>
            </CardBody>
          </Card>
        </main>
      </div>
    );
  }

  const orders = await prisma.purchaseOrder.findMany({
    where: { supplierId: supplier.id },
    include: { medicine: true, facility: true },
    orderBy: [{ expectedAt: "asc" }, { reference: "asc" }],
  });

  const open = orders.filter(
    (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
  );
  const delivered = orders.filter((order) => order.status === "DELIVERED");
  const openUnits = open.reduce((sum, order) => sum + order.quantity, 0);

  return (
    <div className="min-h-dvh bg-canvas">
      <PortalHeader name={scope.persona.name} title={scope.persona.title} />

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone">
          Supplier access · {supplier.name}
        </p>
        <h1 className="mt-3 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-ink">
          Orders, not inventory.
        </h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
          This portal is scoped to {supplier.name}. You only see purchase orders
          addressed to your organisation. Facility stock, consumption, forecasts and
          patient-adjacent signals are never exposed here.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Organisation
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-tight text-ink">
              {supplier.name}
            </p>
            <p className="mt-1 text-[10px] text-muted">
              {supplier.type.replaceAll("_", " ").toLowerCase()} · {supplier.leadTimeDays}-day lead time
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Open orders
            </p>
            <p className="tabular mt-2 text-[28px] font-semibold leading-none text-warn">
              {open.length}
            </p>
            <p className="mt-2 text-[10px] text-muted">
              {formatNumber(openUnits)} units awaiting delivery
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Delivered
            </p>
            <p className="tabular mt-2 text-[28px] font-semibold leading-none text-ok">
              {delivered.length}
            </p>
            <p className="mt-2 text-[10px] text-muted">Completed against this organisation</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Scope
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-tight text-ink">
              Orders only
            </p>
            <p className="mt-1 text-[10px] text-muted">
              No facility stock, demand or forecast data
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <Card>
            <CardHeader
              title="Assigned purchase orders"
              subtitle={`Every order addressed to ${supplier.name}`}
              action={<Badge tone="brand">{orders.length} total</Badge>}
              icon={<PackageCheck className="h-4 w-4" />}
            />
            <div className="divide-y divide-line">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[10px] font-medium text-muted">
                        {order.reference}
                      </p>
                      <Badge tone={statusTone[order.status] ?? "neutral"}>
                        {statusLabel[order.status] ?? order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-ink">
                      {order.medicine.genericName} {order.medicine.strength}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatNumber(order.quantity)} {order.medicine.unit}s ·{" "}
                      {order.facility.shortName}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-muted">
                    <p>Expected {formatDate(order.expectedAt)}</p>
                    <p>{relativeToDemo(order.expectedAt)}</p>
                    {order.deliveredAt ? (
                      <p className="mt-0.5 text-ok">
                        Delivered {formatDate(order.deliveredAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
              {orders.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[12px] font-medium text-ink">No orders yet</p>
                  <p className="mt-1 text-[10px] text-muted">
                    Purchase orders addressed to {supplier.name} will appear here.
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader
                title="Organisation"
                subtitle="The account acts for this supplier"
                icon={<Building2 className="h-4 w-4" />}
              />
              <CardBody className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Name</span>
                  <span className="font-medium text-ink">{supplier.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Type</span>
                  <span className="font-medium text-ink">
                    {supplier.type.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Lead time</span>
                  <span className="font-medium text-ink">{supplier.leadTimeDays} days</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Account</span>
                  <span className="font-medium text-ink">{scope.persona.email}</span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Portal boundaries" icon={<ShieldCheck className="h-4 w-4" />} />
              <CardBody className="space-y-3 text-[11px] leading-relaxed text-muted">
                <p className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  Supplier accounts are denied facility inventory, stock movements,
                  forecasts and transfers.
                </p>
                <p className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  Orders are filtered by the organisation on the account — never by
                  the user alone.
                </p>
                <p className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  Dispatch confirmation and the supplier catalogue are not enabled in
                  this build.
                </p>
                <div className="rounded-lg bg-canvas px-3 py-2 text-[10px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="h-3 w-3" /> Read-only portal. No stock data is
                    readable or writable from here.
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        <p className="mt-6 text-[10px] leading-relaxed text-muted">
          Signed in as {scope.persona.email} · {supplier.name}
        </p>
      </main>
    </div>
  );
}
