import Link from "next/link";
import { ArrowUpRight, Building2, Package, ShieldAlert, Wallet } from "lucide-react";
import { DEMO_TODAY, FACILITY_TYPE_LABEL, RISK_ORDER } from "@/lib/config";
import { formatDate, formatNaira, formatNumber } from "@/lib/format";
import { getNetworkData } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { MetricStrip } from "@/components/ui/stat";
import { buttonClass } from "@/components/ui/button";
import { FacilityExplorer, type FacilityCardData } from "@/components/facility-explorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facilities" };

export default async function FacilitiesPage() {
  const [scope, data] = await Promise.all([getScope(), getNetworkData()]);
  const facilities = data.facilities.filter((facility) =>
    scope.facilities.some((item) => item.id === facility.id),
  );

  const rows = facilities.map((facility) => {
    const series = data.series.filter((line) => line.facilityId === facility.id);
    const atRisk = series
      .filter((line) => line.risk !== "LOW" && line.avgDailyDemand > 0)
      .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999));
    const critical = atRisk.filter((line) => line.risk === "CRITICAL").length;
    const high = atRisk.filter((line) => line.risk === "HIGH").length;
    const watch = atRisk.filter((line) => line.risk === "MEDIUM").length;
    const risk =
      critical > 0 ? "CRITICAL" : high > 0 ? "HIGH" : watch > 0 ? "MEDIUM" : "LOW";
    return {
      facility,
      series,
      atRisk,
      critical,
      high,
      watch,
      risk,
      stockValue: series.reduce((sum, line) => sum + line.usableValue, 0),
      expiring: series.reduce((sum, line) => sum + line.nearExpiryValue, 0),
    };
  });

  const stockValue = rows.reduce((sum, row) => sum + row.stockValue, 0);
  const atRiskFacilities = rows.filter((row) => row.critical > 0 || row.high > 0).length;
  const transferableUnits = rows.reduce(
    (sum, row) => sum + row.series.reduce((inner, line) => inner + line.surplus45, 0),
    0,
  );

  const cards: FacilityCardData[] = rows
    .slice()
    .sort(
      (a, b) =>
        (RISK_ORDER[a.risk] ?? 9) - (RISK_ORDER[b.risk] ?? 9) ||
        a.facility.name.localeCompare(b.facility.name),
    )
    .map((row) => ({
      id: row.facility.id,
      name: row.facility.name,
      shortName: row.facility.shortName,
      type: row.facility.type,
      typeLabel: FACILITY_TYPE_LABEL[row.facility.type] ?? row.facility.type,
      lga: row.facility.lga,
      address: row.facility.address,
      risk: row.risk,
      stockValue: row.stockValue,
      atRiskCount: row.atRisk.length,
      critical: row.critical,
      high: row.high,
      watch: row.watch,
      expiringValue: row.expiring,
      totalLines: row.series.length,
      topRisk: row.atRisk[0]
        ? {
            name: row.atRisk[0].genericName,
            days: row.atRisk[0].daysToStockout,
            usable: row.atRisk[0].usable,
            unit: row.atRisk[0].unit,
            demand: row.atRisk[0].avgDailyDemand,
          }
        : null,
    }));

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <Building2 className="h-3.5 w-3.5" strokeWidth={1.5} /> FCT demonstration network ·{" "}
            {formatDate(DEMO_TODAY)}
          </>
        }
        title="Facility network."
        description={
          scope.isNetworkAuthority
            ? "Four facilities, four operating models, one shared stock picture."
            : "The facilities you are authorised to manage. Inventory remains private to each facility."
        }
        actions={
          <Link href="/m" className={buttonClass({ variant: "secondary", size: "sm" })}>
            Mobile inventory
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <MetricStrip
        className="mb-5"
        columns={3}
        items={[
          {
            label: "Network stock value",
            value: formatNaira(stockValue),
            sub: "Across the facilities in your scope",
            icon: <Wallet className="h-3.5 w-3.5" />,
          },
          {
            label: "Facilities with risk",
            value: `${atRiskFacilities} / ${rows.length}`,
            sub: "At least one line under 30 days of cover",
            tone: atRiskFacilities > 0 ? "warning" : "success",
            icon: <ShieldAlert className="h-3.5 w-3.5" />,
          },
          {
            label: "Transferable surplus",
            value: `${formatNumber(transferableUnits)} units`,
            sub: "Above 45-day cover with safe shelf life",
            icon: <Package className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <FacilityExplorer rows={cards} />
    </div>
  );
}
