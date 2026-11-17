import { prisma } from "@/lib/db";
import { getNetworkData } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { BarcodeScanner } from "@/components/mobile/barcode-scanner";
import { EmptyState } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MobileScanPage() {
  const [scope, data, medicines] = await Promise.all([
    getScope(),
    getNetworkData(),
    prisma.medicine.findMany({ orderBy: { name: "asc" } }),
  ]);

  const facility = scope.activeFacility;
  if (!facility) {
    return (
      <div className="p-4">
        <EmptyState title="No facility assigned" description="Switch to a facility persona to scan stock." />
      </div>
    );
  }

  const seriesByMedicine = new Map(
    data.series.filter((s) => s.facilityId === facility.id).map((s) => [s.medicineId, s]),
  );

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
          {facility.shortName}
        </p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">Scan medicine</h1>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Identify a product by barcode, then issue it without leaving the counter.
        </p>
      </div>

      <BarcodeScanner
        facilityId={facility.id}
        facilityName={facility.shortName}
        medicines={medicines.map((m) => {
          const s = seriesByMedicine.get(m.id);
          return {
            id: m.id,
            genericName: m.genericName,
            strength: m.strength,
            unit: m.unit,
            barcode: m.barcode,
            usable: s?.usable ?? 0,
            daysToStockout: s?.daysToStockout ?? null,
            avgDailyDemand: s?.avgDailyDemand ?? 0,
            risk: s?.risk ?? "LOW",
          };
        })}
        canManage={scope.canManageInventory}
      />
    </div>
  );
}
