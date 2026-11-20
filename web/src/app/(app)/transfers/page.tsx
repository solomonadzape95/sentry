import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Clock3,
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
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { CreateTransferForm } from "@/components/create-transfer-form";
import { TransferActions } from "@/components/transfer-actions";
import { EmptyState } from "@/components/ui/page-header";
import { MetricStrip } from "@/components/ui/stat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transfers" };

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
  // A facility raises requests for stock it needs (it is the destination).
  // Approval and dispatch belong to the releasing facility.
  const canRequestFor = (facilityId: string) =>
    scope.isNetworkAuthority || scope.facilities.some((f) => f.id === facilityId);
  const canApproveFor = (facilityId: string) =>
    scope.canApproveTransfers && canRequestFor(facilityId);
  const canReceiveFor = (facilityId: string) =>
    scope.canReceiveTransfers && canRequestFor(facilityId);

  const opportunities = data.opportunities
    .filter((o) => inScope(o.fromFacilityId) || inScope(o.toFacilityId))
    .sort((a, b) => {
      if (scope.isNetworkAuthority) return 0;
      // Requests the user can actually raise come first.
      const aIncoming = canRequestFor(a.toFacilityId) ? 0 : 1;
      const bIncoming = canRequestFor(b.toFacilityId) ? 0 : 1;
      return aIncoming - bIncoming;
    });

  // A forecast link knows only the receiving facility and medicine. Resolve
  // the recommended donor so the request opens pre-filled.
  const requestedFromId =
    params.from ??
    (params.to && params.medicine
      ? opportunities.find(
          (o) => o.toFacilityId === params.to && o.medicineId === params.medicine,
        )?.fromFacilityId
      : undefined);

  const fromFacility = data.facilities.find((f) => f.id === requestedFromId);
  const toFacility = data.facilities.find((f) => f.id === params.to);
  const sourceSeries = data.series.find(
    (s) => s.facilityId === requestedFromId && s.medicineId === params.medicine,
  );
  const destSeries = data.series.find(
    (s) => s.facilityId === params.to && s.medicineId === params.medicine,
  );
  const opportunity = opportunities.find(
    (o) =>
      o.fromFacilityId === requestedFromId &&
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
    fromFacility &&
    toFacility &&
    sourceSeries &&
    destSeries &&
    (inScope(fromFacility.id) || inScope(toFacility.id))
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
        description="A facility in shortage requests stock, the facility holding surplus approves and dispatches, and the requester confirms receipt. Every movement is batch-traced."
        actions={
          <Link
            href={
              scope.isNetworkAuthority
                ? "/dashboard#risk"
                : scope.activeFacility
                  ? `/facilities/${scope.activeFacility.id}#risk`
                  : "/today#risk"
            }
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            Risk view
          </Link>
        }
      />

      {!scope.canApproveTransfers ? (
        <div className="mb-5 rounded-xl border border-info/20 bg-info-soft px-4 py-3 text-xs text-info">
          You can request stock for your facility and confirm receipt. Dispatch approval belongs to
          the releasing facility or the network authority.
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
                  <p className="mt-0.5 font-medium text-ink">{draft.batch ? formatDate(draft.batch.expiryDate) : "N/A"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-muted">Shelf life</p>
                  <p className="mt-0.5 font-medium text-ink">{draft.batch ? `${draft.batch.daysToExpiry} days` : "N/A"}</p>
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
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                {canRequestFor(draft.toFacility.id) ? "Request stock" : "Awaiting a request"}
              </p>
              <p className="mb-3 text-[10px] leading-relaxed text-muted">
                {scope.isNetworkAuthority
                  ? `Raised for ${draft.toFacility.shortName}; ${draft.fromFacility.shortName} approves and dispatches.`
                  : canRequestFor(draft.toFacility.id)
                    ? `You are requesting for ${draft.toFacility.shortName}. ${draft.fromFacility.shortName} approves and dispatches.`
                    : `${draft.toFacility.shortName} must raise this request. As the releasing facility you approve and dispatch once it arrives.`}
              </p>
              <CreateTransferForm
                fromFacilityId={draft.fromFacility.id}
                toFacilityId={draft.toFacility.id}
                medicineId={draft.sourceSeries.medicineId}
                quantity={draft.quantity}
                unit={draft.sourceSeries.unit}
                batchId={draft.batch?.id}
                reason={draft.reason}
                canRequest={canRequestFor(draft.toFacility.id)}
                blockedReason={`${draft.toFacility.shortName} must raise this request. As the releasing facility you approve and dispatch once it arrives.`}
              />
            </div>
          </div>
        </Card>
      ) : null}

      <MetricStrip
        className="mb-5"
        items={[
          {
            label: "Pending approval",
            value: pending.length,
            sub: "Awaiting authorised sign-off",
            tone: pending.length > 0 ? "warning" : "default",
          },
          {
            label: "In transit",
            value: inTransit.length,
            sub: "Dispatched, not yet received",
          },
          {
            label: "Completed",
            value: completed.length,
            sub: "Stock received and reconciled",
            tone: completed.length > 0 ? "success" : "default",
          },
          {
            label: "Units moved",
            value: formatNumber(unitsMoved),
            sub: "Across completed transfers",
          },
        ]}
      />

      <section className="mb-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              Coordination
            </p>
            <h2 className="mt-1 text-[19px] font-medium tracking-[-0.03em] text-ink">
              Move surplus to shortage.
            </h2>
            <p className="mt-1 text-[11px] text-muted">
              Live matches between verified surplus and projected shortage.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[8.5px] uppercase tracking-[0.1em] text-muted">Scroll →</span>
            <Badge tone="brand">{opportunities.length} matches</Badge>
          </div>
        </div>

        {opportunities.length > 0 ? (
          <div
            className="scrollbar-thin -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            tabIndex={0}
            aria-label="Transfer opportunities. Scroll horizontally for more."
          >
            {opportunities.slice(0, 8).map((opportunity, index) => {
              const href = `/transfers?${new URLSearchParams({
                from: opportunity.fromFacilityId,
                to: opportunity.toFacilityId,
                medicine: opportunity.medicineId,
                qty: String(opportunity.quantity),
                batch: opportunity.batchId ?? "",
              }).toString()}`;
              const incoming = canRequestFor(opportunity.toFacilityId);
              const cue = scope.isNetworkAuthority
                ? "Coordinate"
                : incoming
                  ? "You receive"
                  : "You release";
              const images = [
                "/sentry/signal-shelves.jpg",
                "/sentry/signal-pharmacy.jpg",
                "/sentry/signal-counter.jpg",
                "/sentry/signal-clinic.jpg",
              ];
              return (
                <Link
                  key={opportunity.id}
                  href={href}
                  className="group w-[272px] shrink-0 snap-start overflow-hidden rounded-[16px] border border-line bg-surface transition-colors hover:border-ink/25"
                >
                  <div className="relative h-[104px] overflow-hidden">
                    <Image
                      src={images[index % images.length]}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="272px"
                      className="photo-warm object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-ink/25" />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                      <RiskBadge risk={opportunity.urgency} compact />
                      <span className="rounded-none border border-bone/20 bg-ink/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-bone/70 backdrop-blur-sm">
                        {formatDays(opportunity.daysToStockout)} cover
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="truncate text-[10px] font-medium text-bone/85">
                        {opportunity.fromFacilityName}
                        <span className="mx-1.5 text-sand">→</span>
                        {opportunity.toFacilityName}
                      </p>
                      <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-bone/60">
                        {cue}
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-[10px] text-muted">{opportunity.genericName}</p>
                    <p className="tabular mt-1 font-display text-[30px] leading-none tracking-[-0.04em] text-ink">
                      {formatNumber(opportunity.quantity)}
                      <span className="ml-1.5 font-sans text-[9px] font-medium tracking-normal text-muted">
                        {opportunity.unit}s
                      </span>
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2.5">
                      <span className="text-[9px] text-muted">
                        From {formatNumber(opportunity.surplus)} surplus
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-ink">
                        {incoming ? "Request" : "View"}
                        <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-line px-5 py-10 text-center">
            <p className="text-[12px] font-medium text-ink">No matches right now.</p>
            <p className="mt-1 text-[10px] text-muted">
              Shortages and verified surpluses will appear here.
            </p>
          </div>
        )}
      </section>

      <Card className="overflow-hidden" id="pipeline">
        <CardHeader
          title="Transfer pipeline"
          subtitle="Every movement is batch-level and auditable end to end"
          action={<Badge tone="neutral">{transfers.length} total</Badge>}
        />
        <div className="divide-y divide-line">
          {transfers.map((transfer) => {
            const step =
              transfer.status === "COMPLETED"
                ? 3
                : transfer.status === "IN_TRANSIT" || transfer.status === "APPROVED"
                  ? 2
                  : transfer.status === "PENDING_APPROVAL" || transfer.status === "RECOMMENDED"
                    ? 1
                    : 0;
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
                    <p className="mt-1 text-sm font-medium text-ink">
                      {transfer.medicine.genericName} · {formatNumber(transfer.quantity)}{" "}
                      {transfer.medicine.unit}s
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {transfer.fromFacility.shortName} → {transfer.toFacility.shortName}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-muted">
                    <p>Created {formatShortDate(transfer.createdAt)}</p>
                    {transfer.completedAt ? (
                      <p>Received {formatShortDate(transfer.completedAt)}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  {[
                    { label: "Requested", icon: Clock3, at: transfer.createdAt },
                    { label: "Approved", icon: ShieldCheck, at: transfer.approvedAt },
                    { label: "Received", icon: CheckCircle2, at: transfer.completedAt },
                  ].map((stage, index) => {
                    const active = step > index;
                    const Icon = stage.icon;
                    return (
                      <div key={stage.label} className="flex flex-1 items-center gap-1.5">
                        <div
                          className={`flex items-center gap-1.5 rounded-none px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.08em] ${
                            active ? "bg-brand-soft text-brand-dark" : "bg-canvas text-muted"
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {stage.label}
                        </div>
                        {index < 2 ? (
                          <div className={`h-px flex-1 ${step > index + 1 ? "bg-brand/35" : "bg-line"}`} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-none bg-canvas/50 px-3 py-2.5 text-[10px] text-muted sm:grid-cols-3">
                  <p>
                    <span className="text-muted">Batch:</span>{" "}
                    <span className="font-mono text-ink">{transfer.batch?.batchNumber ?? "N/A"}</span>
                  </p>
                  <p>
                    <span className="text-muted">Expiry:</span>{" "}
                    <span className="text-ink">
                      {transfer.batch ? formatDate(transfer.batch.expiryDate) : "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted">Requested by:</span>{" "}
                    <span className="text-ink">
                      {transfer.requestedBy?.name ?? "System recommendation"}
                    </span>
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-xl text-[10px] leading-relaxed text-muted">{transfer.reason}</p>
                  <TransferActions
                    id={transfer.id}
                    status={transfer.status}
                    waitingOn={
                      transfer.status === "PENDING_APPROVAL" || transfer.status === "RECOMMENDED"
                        ? `Awaiting approval and dispatch from ${transfer.fromFacility.shortName}.`
                        : transfer.status === "IN_TRANSIT"
                          ? `Awaiting receipt confirmation from ${transfer.toFacility.shortName}.`
                          : undefined
                    }
                    canAct={
                      transfer.status === "PENDING_APPROVAL" || transfer.status === "RECOMMENDED"
                        ? canApproveFor(transfer.fromFacilityId)
                        : transfer.status === "IN_TRANSIT"
                          ? canReceiveFor(transfer.toFacilityId)
                          : false
                    }
                  />
                </div>
              </div>
            );
          })}
          {transfers.length === 0 ? (
            <EmptyState
              title="No transfers yet"
              description="Request stock from a network opportunity to start the approval workflow."
              icon={<ArrowLeftRight className="h-5 w-5" />}
            />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
