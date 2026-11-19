"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { formatDays, formatNumber, formatShortDate } from "@/lib/format";
import { ActionLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NextMove, TransferPipeline } from "@/components/dashboard/types";

export function NextMoveCard({
  move,
  onShowOnMap,
}: {
  move: NextMove | null;
  onShowOnMap: () => void;
}) {
  if (!move) {
    return (
      <div className="rounded-[16px] bg-ink p-5 text-bone">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sand">
          Next best move
        </p>
        <p className="mt-3 text-[18px] font-medium tracking-[-0.03em]">
          No transfer clears a shortage right now.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-bone/55">
          Every open shortage is either covered by an incoming delivery or has no
          verified surplus elsewhere in the network.
        </p>
        <Link
          href="/transfers"
          className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-medium text-sand hover:underline"
        >
          Open transfer queue <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const transferHref = `/transfers?${new URLSearchParams({
    from: move.fromFacilityId,
    to: move.toFacilityId,
    medicine: move.medicineId,
    qty: String(move.quantity),
    ...(move.batchId ? { batch: move.batchId } : {}),
  }).toString()}`;

  return (
    <div className="relative overflow-hidden rounded-[16px] bg-ink p-5 text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(204,183,163,0.22),transparent_68%)]"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sand">
            Next best move
          </p>
          <Badge className="border-0 bg-bone/10 text-bone/70 ring-0" dot>
            Needs approval
          </Badge>
        </div>

        <p className="mt-4 font-display text-[38px] leading-[0.9] tracking-[-0.05em] text-bone">
          {formatNumber(move.quantity)}
          <span className="ml-2 text-[10px] font-medium tracking-normal text-bone/50">
            {move.unit}s
          </span>
        </p>
        <p className="mt-2 text-[12px] leading-tight text-bone/80">
          {move.genericName}
        </p>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-bone/10 pt-3.5">
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-[0.1em] text-bone/40">From</p>
            <p className="mt-1 truncate text-[10.5px] font-medium text-bone/85">
              {move.fromFacilityName}
            </p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-sand" strokeWidth={1.5} />
          <div className="min-w-0 text-right">
            <p className="text-[8px] uppercase tracking-[0.1em] text-bone/40">To</p>
            <p className="mt-1 truncate text-[10.5px] font-medium text-bone/85">
              {move.toFacilityName}
            </p>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-bone/10 pt-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.1em] text-bone/40">Cover added</p>
            <p className="tabular mt-1 text-[11px] font-medium text-bone/85">
              {move.daysCoveredAfter === null ? "5+ weeks" : `+${formatDays(move.daysCoveredAfter)}`}
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-[0.1em] text-bone/40">Batch expiry</p>
            <p className="tabular mt-1 text-[11px] font-medium text-bone/85">
              {move.expiryDate ? formatShortDate(move.expiryDate) : "No batch"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <ActionLink
            href={transferHref}
            tone="light"
            className="min-w-0 flex-1 justify-between pl-4 text-[10.5px]"
          >
            Review transfer
          </ActionLink>
          <button
            type="button"
            onClick={onShowOnMap}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-bone/15 text-bone/65 hover:bg-bone/[0.06] hover:text-bone"
            aria-label="Show the recommended transfer on the map"
            title="Show on map"
          >
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[8.5px] text-bone/35">
          <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
          Stock moves only after a person approves it.
        </p>
      </div>
    </div>
  );
}

export function PipelineCard({ pipeline }: { pipeline: TransferPipeline }) {
  if (pipeline.pending === 0 && pipeline.inTransit === 0 && pipeline.received === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              Transfer pipeline
            </p>
            <p className="mt-1 text-[13px] font-medium tracking-[-0.02em] text-ink">
              Nothing open
            </p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-muted">
              No dispatch or receipt is waiting for approval.
            </p>
          </div>
          <Link
            href="/transfers"
            className="inline-flex items-center gap-1 text-[9.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          >
            Open queue <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>
    );
  }

  const rows = [
    {
      label: "Pending approval",
      value: pipeline.pending,
      note: `${formatNumber(pipeline.pendingUnits)} units`,
      icon: Clock3,
      tone: "text-warn",
    },
    {
      label: "In transit",
      value: pipeline.inTransit,
      note: `${formatNumber(pipeline.inTransitUnits)} units`,
      icon: Truck,
      tone: "text-clay",
    },
    {
      label: "Received",
      value: pipeline.received,
      note: "Completed records",
      icon: CheckCircle2,
      tone: "text-ok",
    },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            Transfer pipeline
          </p>
          <p className="mt-1 text-[13px] font-medium tracking-[-0.02em] text-ink">
            {pipeline.pending + pipeline.inTransit > 0
              ? `${pipeline.pending + pipeline.inTransit} open`
              : "Nothing open"}
          </p>
        </div>
        <Link
          href="/transfers"
          className="inline-flex items-center gap-1 text-[9.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
        >
          Open
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 divide-y divide-line/70">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-2.5 py-2.5">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${row.tone}`} strokeWidth={1.5} />
              <span className="min-w-0 flex-1 text-[10px] text-muted">{row.label}</span>
              <span className="tabular text-[11px] font-medium text-ink">{row.value}</span>
              <span className="w-[66px] text-right text-[8.5px] text-muted">{row.note}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
