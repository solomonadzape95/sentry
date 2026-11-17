import { getNetworkData } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { getScope } from "@/lib/session";
import { MobileStockForm } from "@/components/mobile/mobile-stock-form";
import { EmptyState } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MobileIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ medicine?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const [scope, data, suppliers] = await Promise.all([
    getScope(),
    getNetworkData(),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  const facility = scope.activeFacility;
  if (!facility) {
    return (
      <div className="p-4">
        <EmptyState title="No facility assigned" description="Switch to a facility persona to record stock." />
      </div>
    );
  }

  const series = data.series
    .filter((s) => s.facilityId === facility.id)
    .sort((a, b) => a.genericName.localeCompare(b.genericName));
  const initialMedicine =
    series.find((s) => s.medicineId === params.medicine)?.medicineId ??
    series[0]?.medicineId;

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
          {facility.shortName}
        </p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">Record stock</h1>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Issue or receive medicine. Entries are saved locally if the connection drops.
        </p>
      </div>

      <MobileStockForm
        facilityId={facility.id}
        facilityName={facility.shortName}
        medicines={series.map((s) => ({
          id: s.medicineId,
          genericName: s.genericName,
          strength: s.strength,
          unit: s.unit,
          barcode: null,
          usable: s.usable,
          daysToStockout: s.daysToStockout,
          avgDailyDemand: s.avgDailyDemand,
          packSize: s.packSize,
          risk: s.risk,
        }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        initialMedicineId={initialMedicine}
        initialMode={params.mode === "receive" ? "receive" : "issue"}
        canManage={scope.canManageInventory}
      />
    </div>
  );
}
