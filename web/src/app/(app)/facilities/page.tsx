import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  MapPin,
  Package,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { DEMO_TODAY, FACILITY_TYPE_LABEL } from "@/lib/config";
import { formatDate, formatDays, formatNaira, formatNumber } from "@/lib/format";
import { getNetworkData } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facilities" };

export default async function FacilitiesPage() {
  const [scope, data] = await Promise.all([getScope(), getNetworkData()]);
  const facilities = data.facilities.filter((f) =>
    scope.facilities.some((s) => s.id === f.id),
  );

  const rows = facilities.map((facility) => {
    const series = data.series.filter((s) => s.facilityId === facility.id);
    const atRisk = series
      .filter((s) => s.risk !== "LOW" && s.avgDailyDemand > 0)
      .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
    const critical = atRisk.filter((s) => s.risk === "CRITICAL").length;
    const high = atRisk.filter((s) => s.risk === "HIGH").length;
    const watch = atRisk.filter((s) => s.risk === "MEDIUM").length;
    const risk = critical > 0 ? "CRITICAL" : high > 0 ? "HIGH" : watch > 0 ? "MEDIUM" : "LOW";
    return {
      facility,
      series,
      atRisk,
      critical,
      high,
      watch,
      risk,
      stockValue: series.reduce((s, x) => s + x.usableValue, 0),
      expiring: series.reduce((s, x) => s + x.nearExpiryValue, 0),
    };
  });

  const stockValue = rows.reduce((sum, row) => sum + row.stockValue, 0);
  const atRiskFacilities = rows.filter((row) => row.critical > 0 || row.high > 0).length;
  const transferableUnits = rows.reduce(
    (sum, row) => sum + row.series.reduce((inner, s) => inner + s.surplus45, 0),
    0,
  );

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <Building2 className="h-3.5 w-3.5" /> FCT demonstration network · {formatDate(DEMO_TODAY)}
          </>
        }
        title="Facility network"
        description={
          scope.isNetworkAuthority
            ? "Four illustrative facilities with different operating models, stock positions and demand patterns."
            : "The facilities you are authorised to manage. Inventory remains private to each facility."
        }
        actions={
          <Link href="/m" className={buttonClass({ variant: "secondary", size: "sm" })}>
            Mobile inventory
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.facility.id} className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 pt-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-ink">{row.facility.shortName}</h2>
                  <RiskBadge risk={row.risk} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {FACILITY_TYPE_LABEL[row.facility.type] ?? row.facility.type} · {row.facility.lga}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                  <MapPin className="h-3 w-3" /> {row.facility.address}
                </p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Building2 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line bg-canvas/40">
              <div className="px-4 py-3">
                <p className="text-[9px] uppercase tracking-wide text-muted">Stock value</p>
                <p className="tabular mt-0.5 text-sm font-semibold">{formatNaira(row.stockValue)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[9px] uppercase tracking-wide text-muted">At risk</p>
                <p className={`tabular mt-0.5 text-sm font-semibold ${row.critical > 0 ? "text-danger" : row.atRisk.length > 0 ? "text-warn" : "text-ok"}`}>
                  {row.atRisk.length} {row.atRisk.length === 1 ? "line" : "lines"}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[9px] uppercase tracking-wide text-muted">Expiring 60d</p>
                <p className={`tabular mt-0.5 text-sm font-semibold ${row.expiring > 0 ? "text-warn" : "text-ink"}`}>
                  {formatNaira(row.expiring)}
                </p>
              </div>
            </div>

            <CardBody className="pt-4">
              {row.atRisk.length > 0 ? (
                <div className="space-y-2">
                  {row.atRisk.slice(0, 2).map((s) => (
                    <div key={s.medicineId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink">{s.genericName}</p>
                        <p className="text-[10px] text-muted">
                          {formatNumber(s.usable)} {s.unit}s on hand · {s.avgDailyDemand.toFixed(1)}/day
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`tabular text-xs font-semibold ${s.risk === "CRITICAL" ? "text-danger" : "text-warn"}`}>
                          {formatDays(s.daysToStockout)}
                        </p>
                        <p className="text-[9px] text-muted">cover</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">All medicine lines have healthy cover.</p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <div className="flex items-center gap-1.5 text-[10px] text-muted">
                  <Package className="h-3 w-3" /> {row.series.length} medicine lines
                </div>
                <Link
                  href={`/facilities/${row.facility.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                >
                  Open facility <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Network comparison"
          subtitle="Stock position and risk concentration across the demonstration network"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                <th className="px-5 py-2.5 font-medium">Facility</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Stock value</th>
                <th className="px-3 py-2.5 font-medium">Critical</th>
                <th className="px-3 py-2.5 font-medium">High</th>
                <th className="px-3 py-2.5 font-medium">Watch</th>
                <th className="px-3 py-2.5 font-medium">Expiring 60d</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.facility.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{row.facility.shortName}</p>
                    <p className="text-[10px] text-muted">{row.facility.lga}</p>
                  </td>
                  <td className="px-3 py-3 text-muted">{FACILITY_TYPE_LABEL[row.facility.type] ?? row.facility.type}</td>
                  <td className="tabular px-3 py-3">{formatNaira(row.stockValue)}</td>
                  <td className={`tabular px-3 py-3 font-medium ${row.critical > 0 ? "text-danger" : "text-muted"}`}>{row.critical}</td>
                  <td className={`tabular px-3 py-3 font-medium ${row.high > 0 ? "text-warn" : "text-muted"}`}>{row.high}</td>
                  <td className="tabular px-3 py-3 text-muted">{row.watch}</td>
                  <td className={`tabular px-3 py-3 ${row.expiring > 0 ? "text-warn" : "text-muted"}`}>
                    {formatNaira(row.expiring)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/facilities/${row.facility.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                    >
                      Open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Total usable stock"
          value={formatNaira(stockValue)}
          sub="Across 12 essential medicine lines"
          icon={<Wallet className="h-4 w-4" />}
        />
        <Stat
          label="Facilities with risk"
          value={`${atRiskFacilities} of ${rows.length}`}
          sub="At least one line under 30 days cover"
          icon={<ShieldAlert className="h-4 w-4" />}
          tone="warning"
        />
        <Stat
          label="Transferable surplus"
          value={formatNumber(transferableUnits)}
          sub="Units above 45-day cover with >90 days shelf life"
          icon={<Package className="h-4 w-4" />}
          tone="brand"
        />
      </div>
    </div>
  );
}
