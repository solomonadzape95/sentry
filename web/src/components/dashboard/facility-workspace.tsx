"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  ClipboardCheck,
  Gauge,
  Package,
  Truck,
} from "lucide-react";
import { formatDate, formatDays, formatNumber, formatShortDate } from "@/lib/format";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MiniBar } from "@/components/ui/stat";
import { ForecastExplorer } from "@/components/dashboard/forecast-explorer";
import type { DashboardLine } from "@/components/dashboard/types";

export type FacilityApproval = {
  id: string;
  medicineName: string;
  quantity: number;
  unit: string;
  counterparty: string;
  reference: string;
  kind: "dispatch" | "receipt";
};

export type FacilityExpiry = {
  id: string;
  medicineName: string;
  batchNumber: string;
  quantityRemaining: number;
  unit: string;
  daysToExpiry: number;
  expiryDate: string;
};

export type FacilityIncoming = {
  id: string;
  medicineName: string;
  quantity: number;
  unit: string;
  expectedAt: string;
  supplierName: string;
  reference: string;
};

export function FacilityWorkspace({
  facilityId,
  facilityName,
  lines,
  initialLineKey,
  approvals,
  expiry,
  incoming,
}: {
  facilityId: string;
  facilityName: string;
  lines: DashboardLine[];
  initialLineKey: string | null;
  approvals: FacilityApproval[];
  expiry: FacilityExpiry[];
  incoming: FacilityIncoming[];
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(initialLineKey);

  const riskCounts = {
    critical: lines.filter((line) => line.risk === "CRITICAL").length,
    high: lines.filter((line) => line.risk === "HIGH").length,
    medium: lines.filter((line) => line.risk === "MEDIUM").length,
    low: lines.filter((line) => line.risk === "LOW").length,
  };
  const totalLines = Math.max(1, lines.length);

  function chooseLine(line: DashboardLine) {
    setSelectedKey(line.key);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      document.getElementById("facility-forecast")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-12">
        <div id="facility-forecast" className="scroll-mt-24 xl:col-span-8">
          <ForecastExplorer
            lines={lines}
            facilities={[{ id: facilityId, shortName: facilityName }]}
            selectedKey={selectedKey}
            selectedFacilityId={facilityId}
            onSelectLine={chooseLine}
            onFacilityChange={() => undefined}
            showFacilitySelect={false}
          />
        </div>

        <div className="space-y-5 xl:col-span-4">
          <Card id="risk" className="scroll-mt-24 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Coverage
                </p>
                <p className="mt-1 text-[15px] font-medium tracking-[-0.02em] text-ink">
                  {lines.length} medicine lines
                </p>
              </div>
              <Gauge className="h-4 w-4 text-muted" strokeWidth={1.5} />
            </div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-canvas">
              {riskCounts.critical > 0 ? (
                <span
                  className="bg-danger"
                  style={{ width: `${(riskCounts.critical / totalLines) * 100}%` }}
                />
              ) : null}
              {riskCounts.high > 0 ? (
                <span
                  className="bg-warn"
                  style={{ width: `${(riskCounts.high / totalLines) * 100}%` }}
                />
              ) : null}
              {riskCounts.medium > 0 ? (
                <span
                  className="bg-clay"
                  style={{ width: `${(riskCounts.medium / totalLines) * 100}%` }}
                />
              ) : null}
              {riskCounts.low > 0 ? (
                <span
                  className="bg-ok/70"
                  style={{ width: `${(riskCounts.low / totalLines) * 100}%` }}
                />
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[9px]">
              <RiskLegend label="Critical" value={riskCounts.critical} dot="bg-danger" />
              <RiskLegend label="High" value={riskCounts.high} dot="bg-warn" />
              <RiskLegend label="Watch" value={riskCounts.medium} dot="bg-clay" />
              <RiskLegend label="Stable" value={riskCounts.low} dot="bg-ok/70" />
            </div>
          </Card>

          {approvals.length > 0 ? (
            <Card className="border-warn/25">
              <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-warn">
                    Approvals
                  </p>
                  <h2 className="mt-1 text-[15px] font-medium tracking-[-0.025em] text-ink">
                    Needs your signature
                  </h2>
                </div>
                <Badge tone="warning" dot>
                  {approvals.length} waiting
                </Badge>
              </div>
              <div className="mt-1 divide-y divide-line">
                {approvals.map((approval) => (
                  <div key={approval.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10.5px] font-medium text-ink">
                          {approval.medicineName} · {formatNumber(approval.quantity)}{" "}
                          {approval.unit}s
                        </p>
                        <p className="mt-0.5 truncate text-[9px] text-muted">
                          {approval.kind === "dispatch" ? "Release to" : "Receive from"}{" "}
                          {approval.counterparty} · {approval.reference}
                        </p>
                      </div>
                      <Badge tone={approval.kind === "dispatch" ? "warning" : "info"}>
                        {approval.kind === "dispatch" ? "Dispatch" : "Receipt"}
                      </Badge>
                    </div>
                    <Link
                      href={`/transfers#transfer-${approval.id}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-medium text-ink hover:underline"
                    >
                      Open transfer <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Expiry watch
                </p>
                <h2 className="mt-1 text-[15px] font-medium tracking-[-0.025em] text-ink">
                  Batches inside 90 days
                </h2>
              </div>
              <CalendarClock className="h-4 w-4 text-muted" strokeWidth={1.5} />
            </div>
            <div className="mt-1 divide-y divide-line">
              {expiry.map((batch) => (
                <div key={batch.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10.5px] font-medium text-ink">
                        {batch.medicineName}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[8.5px] text-muted">
                        {batch.batchNumber}
                      </p>
                    </div>
                    <Badge tone={batch.daysToExpiry <= 30 ? "danger" : "warning"}>
                      {Math.max(0, batch.daysToExpiry)}d
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <MiniBar
                      value={90 - Math.min(90, batch.daysToExpiry)}
                      max={90}
                      tone={batch.daysToExpiry <= 30 ? "danger" : "warn"}
                      className="flex-1"
                    />
                    <span className="shrink-0 text-[8.5px] text-muted">
                      {formatNumber(batch.quantityRemaining)} {batch.unit}s
                    </span>
                  </div>
                  <p className="mt-1.5 text-[8.5px] text-muted">
                    Expires {formatDate(batch.expiryDate)}
                  </p>
                </div>
              ))}
              {expiry.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <Package className="mx-auto h-5 w-5 text-muted" strokeWidth={1.4} />
                  <p className="mt-2 text-[10.5px] font-medium text-ink">No near-expiry batches</p>
                  <p className="mt-0.5 text-[9.5px] text-muted">Every batch has more than 90 days left.</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Incoming
                </p>
                <h2 className="mt-1 text-[15px] font-medium tracking-[-0.025em] text-ink">
                  Confirmed deliveries
                </h2>
              </div>
              <Truck className="h-4 w-4 text-muted" strokeWidth={1.5} />
            </div>
            <div className="mt-1 divide-y divide-line">
              {incoming.map((delivery) => (
                <div key={delivery.id} className="flex items-start gap-3 px-5 py-3">
                  <ArrowDownToLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-medium text-ink">
                      {delivery.medicineName}
                    </p>
                    <p className="mt-0.5 truncate text-[8.5px] text-muted">
                      {delivery.reference} · {delivery.supplierName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[10px] font-medium text-ink">
                      {formatNumber(delivery.quantity)}
                    </p>
                    <p className="text-[8.5px] text-muted">{formatShortDate(delivery.expectedAt)}</p>
                  </div>
                </div>
              ))}
              {incoming.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <ClipboardCheck className="mx-auto h-5 w-5 text-muted" strokeWidth={1.4} />
                  <p className="mt-2 text-[10.5px] font-medium text-ink">No confirmed deliveries</p>
                  <p className="mt-0.5 text-[9.5px] text-muted">Orders appear once a supplier confirms.</p>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              Medicine lines
            </p>
            <h2 className="mt-1 text-[16px] font-medium tracking-[-0.025em] text-ink">
              Stock, demand and cover
            </h2>
            <p className="mt-1 text-[11px] text-muted">
              Select a medicine to load its forecast above.
            </p>
          </div>
          <Link
            href={`/inventory?facility=${facilityId}`}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          >
            Manage inventory
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-y border-line text-[8px] uppercase tracking-[0.11em] text-muted">
                <th className="px-5 py-2 font-medium">Medicine</th>
                <th className="px-3 py-2 text-right font-medium">On hand</th>
                <th className="px-3 py-2 text-right font-medium">Demand</th>
                <th className="px-3 py-2 text-right font-medium">Cover</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-5 py-2 text-right font-medium">Forecast</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const active = line.key === selectedKey;
                return (
                  <tr
                    key={line.key}
                    className={
                      active
                        ? "bg-ink/[0.045]"
                        : "transition-colors hover:bg-ink/[0.025]"
                    }
                  >
                    <td className="px-5 py-2.5">
                      <button
                        type="button"
                        onClick={() => chooseLine(line)}
                        className="block max-w-[320px] truncate text-left text-[10.5px] font-medium text-ink hover:underline"
                      >
                        {line.genericName}
                      </button>
                      <p className="mt-0.5 text-[8.5px] text-muted">{line.strength}</p>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right text-[10px] text-ink">
                      {formatNumber(line.usable)}
                    </td>
                    <td className="tabular px-3 py-2.5 text-right text-[10px] text-muted">
                      {line.avgDailyDemand.toFixed(1)}/d
                    </td>
                    <td
                      className={`tabular px-3 py-2.5 text-right text-[10px] font-medium ${
                        line.risk === "CRITICAL"
                          ? "text-danger"
                          : line.risk === "HIGH"
                            ? "text-warn"
                            : "text-ink"
                      }`}
                    >
                      {formatDays(line.daysToStockout)}
                    </td>
                    <td className="px-3 py-2.5">
                      <RiskBadge risk={line.risk} compact />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => chooseLine(line)}
                        className="inline-flex items-center gap-1 text-[9.5px] font-medium text-ink hover:underline"
                        aria-label={`Open forecast for ${line.genericName}`}
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RiskLegend({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="text-muted">{label}</span>
      <span className="tabular ml-auto font-medium text-ink">{value}</span>
    </div>
  );
}
