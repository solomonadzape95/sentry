import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Package,
  ShieldCheck,
} from "lucide-react";
import { DEMO_TODAY, TRANSFER_STATUS_LABEL } from "@/lib/config";
import {
  formatDate,
  formatDays,
  formatNumber,
  formatShortDate,
} from "@/lib/format";
import { getNetworkData, getTransfers } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { CreateTransferForm } from "@/components/create-transfer-form";
import { TransferActions } from "@/components/transfer-actions";
import { EmptyState } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "warning" | "info" | "success" | "danger" | "neutral"> = {
  RECOMMENDED: "warning",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  IN_TRANSIT: "info",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    medicine?: string;
    qty?: string;
    batch?: string;
  }>;
}) {
  const params = await searchParams;
  const [scope, data, allTransfers] = await Promise.all([
    getScope(),
    getNetworkData(),
    getTransfers(),
  ]);

  const inScope = (facilityId: string) =>
    scope.isNetworkAuthority || scope.facilities.some((f) => f.id === facilityId);
  const transfers = allTransfers.filter(
    (t) => inScope(t.fromFacilityId) || inScope(t.toFacilityId),
  );
  const opportunities = data.opportunities.filter(
    (o) => inScope(o.fromFacilityId) || inScope(o.toFacilityId),
  );

  const fromFacility = data.facilities.find((f) => f.id === params.from);
  const toFacility = data.facilities.find((f) => f.id === params.to);
  const sourceSeries = data.series.find(
    (s) => s.facilityId === params.from && s.medicineId === params.medicine,
  );
  const destSeries = data.series.find(
    (s) => s.facilityId === params.to && s.medicineId === params.medicine,
  );
  const opportunity = opportunities.find(
    (o) =>
      o.fromFacilityId === params.from &&
      o.toFacilityId === params.to &&
      o.medicineId === params.medicine,
  );

  const draftQty = Math.max(1, Number(params.qty) || opportunity?.quantity || 1);
  const draftBatch =
    (params.batch ? sourceSeries?.batches.find((b) => b.id === params.batch) : null) ??
    sourceSeries?.batches.find((b) => b.daysToExpiry > 90 && b.quantityRemaining >= draftQty) ??
    sourceSeries?.batches.find((b) => b.daysToExpiry > 90) ??
    null;

  const draft =
    fromFacility && toFacility && sourceSeries && destSeries
      ? {
          fromFacility,
          toFacility,
          sourceSeries,
          destSeries,
          quantity: draftQty,
          batch: draftBatch,
          reason:
            opportunity?.reason ??
            `${destSeries.facilityShortName} has ${formatDays(destSeries.daysToStockout)} of cover. ${sourceSeries.facilityShortName} holds verified surplus with adequate shelf life.`,
          urgency: opportunity?.urgency ?? destSeries.risk,
          daysAfter: opportunity?.daysCoveredAfter ?? null,
        }
      : null;

  const pending = transfers.filter((t) => t.status === "PENDING_APPROVAL" || t.status === "RECOMMENDED");
  const inTransit = transfers.filter((t) => t.status === "IN_TRANSIT" || t.status === "APPROVED");
  const completed = transfers.filter((t) => t.status === "COMPLETED");
  const unitsMoved = completed.reduce((s, t) => s + t.quantity, 0);

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <ArrowLeftRight className="h-3.5 w-3.5" /> Coordination · {formatDate(DEMO_TODAY)}
          </>
        }
        title="Stock transfers"
        description="Move verified surplus to facilities that need it, with batch traceability, approvals and a complete audit trail."
        actions={
          <Link href="/dashboard#alerts" className={buttonClass({ variant: "secondary", size: "sm" })}>
            Network alerts
          </Link>
        }
      />

      {!scope.canApproveTransfers ? (
        <div className="mb-5 rounded-xl border border-info/20 bg-info-soft px-4 py-3 text-xs text-info">
          You are viewing in read-only mode. Approvals are restricted to facility managers and network
          authorities.
        </div>
      ) : null}

      {draft ? (
        <Card className="mb-5 overflow-hidden border-brand/25">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" dot>
                  Recommended transfer
                </Badge>
                <RiskBadge risk={draft.urgency} compact />
              </div>
              <h2 className="mt-3 text-xl font-semibold text-ink">{draft.sourceSeries.genericName}</h2>
              <p className="mt-1 text-xs text-muted">
                {draft.sourceSeries.strength} · {formatNumber(draft.quantity)} {draft.sourceSeries.unit}s
              </p>

              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-canvas/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Release from</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{draft.fromFacility.shortName}</p>
                  <p className="text-[10px] text-muted">
                    {formatNumber(draft.sourceSeries.usable)} on hand · {formatNumber(draft.sourceSeries.surplus45)} transferable surplus
                  </p>
                </div>
                <ArrowRight className="hidden h-5 w-5 text-brand sm:block" />
                <div className="sm:text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted">Receive at</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{draft.toFacility.shortName}</p>
                  <p className="text-[10px] text-muted">
                    {formatDays(draft.destSeries.daysToStockout)} cover now · {draft.destSeries.avgDailyDemand.toFixed(1)}/day
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-muted">Batch</p>
                  <p className="mt-0.5 font-mono text-[10px] font-medium text-ink">{draft.batch?.batchNumber ?? "FEFO at dispatch"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-muted">Expiry</p>
                  <p className="mt-0.5 font-medium text-ink">{draft.batch ? formatDate(draft.batch.expiryDate) : "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-muted">Shelf life</p>
                  <p className="mt-0.5 font-medium text-ink">{draft.batch ? `${draft.batch.daysToExpiry} days` : "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-muted">Cover after</p>
                  <p className="mt-0.5 font-medium text-ink">{draft.daysAfter ? formatDays(draft.daysAfter) : "Improved"}</p>
                </div>
              </div>

              <p className="mt-4 rounded-lg bg-brand-soft/50 px-3 py-2 text-[11px] leading-relaxed text-brand-dark">
                {draft.reason}
              </p>
            </div>

            <div className="border-t border-line bg-canvas/40 p-5 lg:border-l lg:border-t-0">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                Create request
              </p>
              <CreateTransferForm
                fromFacilityId={draft.fromFacility.id}
                toFacilityId={draft.toFacility.id}
                medicineId={draft.sourceSeries.medicineId}
                quantity={draft.quantity}
                unit={draft.sourceSeries.unit}
                batchId={draft.batch?.id}
                reason={draft.reason}
                canApprove={
                  scope.isNetworkAuthority ||
                  scope.facilities.some((f) => f.id === draft.fromFacility.id)
                }
              />
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Pending approval</p>
          <p className="tabular mt-2 text-[28px] font-semibold leading-none text-warn">{pending.length}</p>
          <p className="mt-2 text-xs text-muted">Awaiting authorised sign-off</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">In transit</p>
          <p className="tabular mt-2 text-[28px] font-semibold leading-none text-info">{inTransit.length}</p>
          <p className="mt-2 text-xs text-muted">Dispatched, not yet received</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Completed</p>
          <p className="tabular mt-2 text-[28px] font-semibold leading-none text-ok">{completed.length}</p>
          <p className="mt-2 text-xs text-muted">Stock received and reconciled</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Units moved</p>
          <p className="tabular mt-2 text-[28px] font-semibold leading-none text-ink">{formatNumber(unitsMoved)}</p>
          <p className="mt-2 text-xs text-muted">Across completed transfers</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
        <div className="space-y-5" id="pipeline">
          <Card>
            <CardHeader
              title="Transfer pipeline"
              subtitle="Every movement is batch-level and reversible only through a new audited movement"
              action={<Badge tone="neutral">{transfers.length} total</Badge>}
            />
            <div className="divide-y divide-line">
              {transfers.map((transfer) => {
                const step = transfer.status === "COMPLETED" ? 3 : transfer.status === "IN_TRANSIT" || transfer.status === "APPROVED" ? 2 : transfer.status === "PENDING_APPROVAL" || transfer.status === "RECOMMENDED" ? 1 : 0;
                return (
                  <div key={transfer.id} id={`transfer-${transfer.id}`} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-[10px] font-medium text-muted">{transfer.reference}</p>
                          <Badge tone={statusTone[transfer.status] ?? "neutral"}>
                            {TRANSFER_STATUS_LABEL[transfer.status] ?? transfer.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-ink">
                          {transfer.medicine.genericName} · {formatNumber(transfer.quantity)} {transfer.medicine.unit}s
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {transfer.fromFacility.shortName} → {transfer.toFacility.shortName}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-muted">
                        <p>Created {formatShortDate(transfer.createdAt)}</p>
                        {transfer.completedAt ? <p>Received {formatShortDate(transfer.completedAt)}</p> : null}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5">
                      {[
                        { label: "Requested", icon: Clock3, at: transfer.createdAt },
                        { label: "Approved", icon: ShieldCheck, at: transfer.approvedAt },
                        { label: "Received", icon: CheckCircle2, at: transfer.completedAt },
                      ].map((s, i) => {
                        const active = step > i;
                        const Icon = s.icon;
                        return (
                          <div key={s.label} className="flex flex-1 items-center gap-1.5">
                            <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-medium ${active ? "bg-brand-soft text-brand-dark" : "bg-canvas text-muted"}`}>
                              <Icon className="h-3 w-3" />
                              {s.label}
                            </div>
                            {i < 2 ? <div className={`h-px flex-1 ${step > i + 1 ? "bg-brand/35" : "bg-line"}`} /> : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-canvas/50 px-3 py-2.5 text-[10px] text-muted sm:grid-cols-3">
                      <p>
                        <span className="text-muted">Batch:</span>{" "}
                        <span className="font-mono text-ink">{transfer.batch?.batchNumber ?? "—"}</span>
                      </p>
                      <p>
                        <span className="text-muted">Expiry:</span>{" "}
                        <span className="text-ink">{transfer.batch ? formatDate(transfer.batch.expiryDate) : "—"}</span>
                      </p>
                      <p>
                        <span className="text-muted">Requested by:</span>{" "}
                        <span className="text-ink">{transfer.requestedBy?.name ?? "System recommendation"}</span>
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="max-w-xl text-[10px] leading-relaxed text-muted">{transfer.reason}</p>
                      <TransferActions
                        id={transfer.id}
                        status={transfer.status}
                        canApprove={
                          scope.isNetworkAuthority ||
                          (transfer.status === "PENDING_APPROVAL" || transfer.status === "RECOMMENDED"
                            ? scope.facilities.some((f) => f.id === transfer.fromFacilityId)
                            : scope.facilities.some((f) => f.id === transfer.toFacilityId))
                        }
                      />
                    </div>
                  </div>
                );
              })}
              {transfers.length === 0 ? (
                <EmptyState
                  title="No transfers yet"
                  description="Prepare a transfer from the network opportunities to start the approval workflow."
                  icon={<ArrowLeftRight className="h-5 w-5" />}
                />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Workflow safeguards" subtitle="What the platform will not do automatically" />
            <CardBody className="grid grid-cols-1 gap-3 text-[11px] text-muted sm:grid-cols-3">
              <div className="rounded-lg border border-line p-3">
                <ShieldCheck className="mb-2 h-4 w-4 text-brand" />
                <p className="font-medium text-ink">Authorised approval</p>
                <p className="mt-1 leading-relaxed">No stock moves without a manager or network authority.</p>
              </div>
              <div className="rounded-lg border border-line p-3">
                <Package className="mb-2 h-4 w-4 text-brand" />
                <p className="font-medium text-ink">FEFO batch selection</p>
                <p className="mt-1 leading-relaxed">The earliest safe-expiry batch is selected and traced end to end.</p>
              </div>
              <div className="rounded-lg border border-line p-3">
                <Check className="mb-2 h-4 w-4 text-brand" />
                <p className="font-medium text-ink">Receipt confirmation</p>
                <p className="mt-1 leading-relaxed">Source stock is deducted at dispatch; destination stock is added only on receipt.</p>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Network opportunities"
              subtitle="Live matches between shortage and surplus"
              action={<Badge tone="brand">{opportunities.length}</Badge>}
            />
            <div className="divide-y divide-line">
              {opportunities.slice(0, 6).map((o) => {
                const href = `/transfers?${new URLSearchParams({
                  from: o.fromFacilityId,
                  to: o.toFacilityId,
                  medicine: o.medicineId,
                  qty: String(o.quantity),
                  batch: o.batchId ?? "",
                }).toString()}`;
                return (
                  <div key={o.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-ink">{o.genericName}</p>
                        <p className="text-[10px] text-muted">
                          {o.fromFacilityName} → {o.toFacilityName}
                        </p>
                      </div>
                      <RiskBadge risk={o.urgency} compact />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-muted">
                        <span className="tabular font-medium text-ink">{formatNumber(o.quantity)}</span> {o.unit}s ·{" "}
                        {formatDays(o.daysToStockout)} cover
                      </p>
                      <Link href={href} className="text-[10px] font-medium text-brand hover:underline">
                        Prepare
                      </Link>
                    </div>
                  </div>
                );
              })}
              {opportunities.length === 0 ? (
                <EmptyState title="No matches right now" description="Shortages and verified surpluses will appear here." />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Why transfers help" />
            <CardBody className="space-y-3 text-[11px] leading-relaxed text-muted">
              <p className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                A transfer can prevent a stockout days before a supplier order could arrive.
              </p>
              <p className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                Moving short-dated stock protects both access and working capital.
              </p>
              <p className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                Every recommendation is a suggestion. Clinical suitability and storage conditions remain a human decision.
              </p>
              <div className="rounded-lg bg-warn-soft/70 px-3 py-2 text-[10px] text-warn">
                Do not use this demo to move real medicines. Batch, storage and regulatory checks must be completed by authorised staff.
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
