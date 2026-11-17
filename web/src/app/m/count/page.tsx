import { getNetworkData } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { StockCountForm } from "@/components/mobile/stock-count-form";
import { EmptyState } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MobileCountPage() {
  const [scope, data] = await Promise.all([getScope(), getNetworkData()]);
  const facility = scope.activeFacility;
  if (!facility) {
    return (
      <div className="p-4">
        <EmptyState title="No facility assigned" description="Switch to a facility persona to count stock." />
      </div>
    );
  }

  const series = data.series
    .filter((s) => s.facilityId === facility.id)
    .sort((a, b) => a.genericName.localeCompare(b.genericName));
  const initialMedicineId =
    series
      .filter((s) => s.risk !== "LOW" && s.avgDailyDemand > 0)
      .sort((a, b) => (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999))[0]?.medicineId ??
    series[0]?.medicineId;

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
          {facility.shortName}
        </p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">Physical stock count</h1>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Verify the shelf against the system. Variances create an audited adjustment.
        </p>
      </div>

      <StockCountForm
        facilityId={facility.id}
        medicines={series.map((s) => ({
          id: s.medicineId,
          genericName: s.genericName,
          strength: s.strength,
          unit: s.unit,
          usable: s.usable,
        }))}
        canManage={scope.canManageInventory}
        initialMedicineId={initialMedicineId}
      />
    </div>
  );
}
