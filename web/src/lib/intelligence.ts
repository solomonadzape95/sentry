import type {
  Facility,
  InventoryBatch,
  Medicine,
  Prisma,
  PurchaseOrder,
  Supplier,
} from "@prisma/client";
import { DEMO_TODAY, RISK_ORDER } from "@/lib/config";
import { addDays, daysBetween, startOfUtcDay } from "@/lib/format";
import { ceilToPack } from "@/lib/utils";

export type ForecastWithPoints = Prisma.ForecastGetPayload<{ include: { points: true } }>;

export type ForecastPointView = {
  date: string;
  predicted: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
};

export type ForecastView = {
  model: string;
  modelLabel: string;
  confidence: string;
  lowData: boolean;
  wape: number;
  mae: number;
  bias: number;
  dataPoints: number;
  points: ForecastPointView[];
};

export type BatchView = {
  id: string;
  batchNumber: string;
  quantityRemaining: number;
  quantityReceived: number;
  expiryDate: string;
  receivedAt: string;
  unitCostNgn: number;
  status: string;
  daysToExpiry: number;
};

export type IncomingView = {
  id: string;
  reference: string;
  quantity: number;
  expectedAt: string;
  status: string;
  supplierName: string;
};

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type StockSeries = {
  facilityId: string;
  facilityName: string;
  facilityShortName: string;
  facilityType: string;
  lga: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  strength: string;
  category: string;
  unit: string;
  packSize: number;
  leadTimeDays: number;
  usable: number;
  expired: number;
  nearExpiry: number;
  expiringSoon: number;
  usableValue: number;
  expiredValue: number;
  nearExpiryValue: number;
  batches: BatchView[];
  incoming: IncomingView[];
  nextIncomingDate: string | null;
  avgDailyDemand: number;
  daysToStockout: number | null;
  stockoutDate: string | null;
  coverageDays: number | null;
  risk: RiskLevel;
  shortage45: number;
  reorderQty: number;
  expedite: boolean;
  forecast: ForecastView | null;
  hasTransferableBatch: boolean;
  surplus45: number;
  lastRestockedAt: string | null;
};

export type AlertView = {
  id: string;
  type: "STOCKOUT_RISK" | "EXPIRY" | "OVERSTOCK" | "LOW_STOCK";
  severity: RiskLevel;
  facilityId: string;
  facilityName: string;
  medicineId: string;
  medicineName: string;
  message: string;
  detail: string;
  date: string | null;
  quantity: number | null;
  value: number | null;
};

export type OpportunityView = {
  id: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  unit: string;
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  quantity: number;
  surplus: number;
  batchId: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  daysToStockout: number | null;
  urgency: RiskLevel;
  reason: string;
  daysCoveredAfter: number | null;
};

export type NetworkIntelligence = {
  facilities: Facility[];
  series: StockSeries[];
  alerts: AlertView[];
  opportunities: OpportunityView[];
  totals: {
    facilities: number;
    medicines: number;
    seriesCount: number;
    stockValue: number;
    expiringValue: number;
    atRiskFacilities: number;
    criticalSeries: number;
    highSeries: number;
    mediumSeries: number;
    openAlerts: number;
    transferableUnits: number;
  };
};

export type IntelligenceInput = {
  facilities: Facility[];
  medicines: Medicine[];
  batches: InventoryBatch[];
  purchaseOrders: PurchaseOrder[];
  forecasts: ForecastWithPoints[];
  suppliers: Supplier[];
};

function demandThrough(points: ForecastPointView[], avgDaily: number, days: number): number {
  let total = 0;
  for (let i = 0; i < days; i++) {
    total += points[i]?.predicted ?? avgDaily;
  }
  return total;
}

function projectDepletion(
  usable: number,
  points: ForecastPointView[],
  avgDaily: number,
  incoming: IncomingView[],
  extraQty = 0,
  horizon = 60,
): { days: number | null; date: Date | null } {
  let stock = usable + extraQty;
  const arrivals = new Map<number, number>();
  for (const po of incoming) {
    const offset = daysBetween(new Date(po.expectedAt), DEMO_TODAY);
    if (offset >= 0 && offset < horizon) {
      arrivals.set(offset, (arrivals.get(offset) ?? 0) + po.quantity);
    }
  }
  for (let day = 0; day < horizon; day++) {
    const arrival = arrivals.get(day);
    if (arrival) stock += arrival;
    const demand = points[day]?.predicted ?? avgDaily;
    if (demand <= 0) continue;
    if (stock < demand) {
      const fraction = stock / demand;
      return { days: day + fraction, date: addDays(DEMO_TODAY, day + fraction) };
    }
    stock -= demand;
  }
  return { days: null, date: null };
}

function riskFor(days: number | null, usable: number, leadTimeDays: number): RiskLevel {
  if (usable <= 0) return "CRITICAL";
  if (days === null) return "LOW";
  if (days <= 7) return "CRITICAL";
  if (days < leadTimeDays) return "CRITICAL";
  if (days <= 14) return "HIGH";
  if (days <= 30) return "MEDIUM";
  return "LOW";
}

export function buildIntelligence(input: IntelligenceInput): NetworkIntelligence {
  const today = startOfUtcDay(DEMO_TODAY);
  const supplierById = new Map(input.suppliers.map((s) => [s.id, s]));
  const batchesBySeries = new Map<string, InventoryBatch[]>();
  const posBySeries = new Map<string, PurchaseOrder[]>();
  const forecastBySeries = new Map<string, ForecastWithPoints>();

  const key = (facilityId: string, medicineId: string) => `${facilityId}:${medicineId}`;

  for (const batch of input.batches) {
    const k = key(batch.facilityId, batch.medicineId);
    batchesBySeries.set(k, [...(batchesBySeries.get(k) ?? []), batch]);
  }
  for (const po of input.purchaseOrders) {
    const k = key(po.facilityId, po.medicineId);
    posBySeries.set(k, [...(posBySeries.get(k) ?? []), po]);
  }
  for (const forecast of input.forecasts) {
    forecastBySeries.set(key(forecast.facilityId, forecast.medicineId), forecast);
  }

  const series: StockSeries[] = [];
  for (const facility of input.facilities) {
    for (const medicine of input.medicines) {
      const k = key(facility.id, medicine.id);
      const rawBatches = batchesBySeries.get(k) ?? [];
      const rawForecast = forecastBySeries.get(k);
      if (rawBatches.length === 0 && !rawForecast) continue;

      const batches: BatchView[] = rawBatches
        .map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantityRemaining: b.quantityRemaining,
          quantityReceived: b.quantityReceived,
          expiryDate: b.expiryDate.toISOString(),
          receivedAt: b.receivedAt.toISOString(),
          unitCostNgn: b.unitCostNgn,
          status: b.status,
          daysToExpiry: daysBetween(b.expiryDate, today),
        }))
        .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

      const active = batches.filter(
        (b) => b.status === "ACTIVE" && b.quantityRemaining > 0 && b.daysToExpiry > 0,
      );
      const usable = active.reduce((sum, b) => sum + b.quantityRemaining, 0);
      const expiredBatches = batches.filter(
        (b) => b.status === "EXPIRED" || b.daysToExpiry <= 0,
      );
      const expired = expiredBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
      const nearExpiryBatches = active.filter((b) => b.daysToExpiry <= 90);
      const expiringSoonBatches = active.filter((b) => b.daysToExpiry <= 60);
      const nearExpiry = nearExpiryBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
      const expiringSoon = expiringSoonBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);

      const incoming: IncomingView[] = (posBySeries.get(k) ?? [])
        .filter(
          (p) =>
            (p.status === "CONFIRMED" || p.status === "SUBMITTED") &&
            p.expectedAt >= addDays(today, -1),
        )
        .map((p) => ({
          id: p.id,
          reference: p.reference,
          quantity: p.quantity,
          expectedAt: p.expectedAt.toISOString(),
          status: p.status,
          supplierName: supplierById.get(p.supplierId)?.name ?? "Supplier",
        }))
        .sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));

      const forecast: ForecastView | null = rawForecast
        ? {
            model: rawForecast.model,
            modelLabel: rawForecast.modelLabel,
            confidence: rawForecast.confidence,
            lowData: rawForecast.lowData,
            wape: rawForecast.wape,
            mae: rawForecast.mae,
            bias: rawForecast.bias,
            dataPoints: rawForecast.dataPoints,
            points: rawForecast.points
              .slice()
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((p) => ({
                date: p.date.toISOString(),
                predicted: p.predicted,
                lower80: p.lower80,
                upper80: p.upper80,
                lower95: p.lower95,
                upper95: p.upper95,
              })),
          }
        : null;

      const points = forecast?.points ?? [];
      const avgDaily =
        points.length > 0
          ? points.slice(0, 14).reduce((s, p) => s + p.predicted, 0) /
            Math.min(14, points.length)
          : 0;

      const depletion = projectDepletion(usable, points, avgDaily, incoming);
      const daysToStockout = depletion.days;
      const coverageDays = avgDaily > 0 ? usable / avgDaily : null;
      const incomingWithin45 = incoming
        .filter((p) => daysBetween(new Date(p.expectedAt), today) <= 45)
        .reduce((s, p) => s + p.quantity, 0);
      const shortage45 = Math.max(
        0,
        Math.ceil(demandThrough(points, avgDaily, 45) - usable - incomingWithin45),
      );

      const lead = medicine.leadTimeDays;
      const review = 14;
      const safety = 7;
      const incomingWithinLead = incoming
        .filter((p) => daysBetween(new Date(p.expectedAt), today) <= lead)
        .reduce((s, p) => s + p.quantity, 0);
      const reorderRaw = Math.max(
        0,
        demandThrough(points, avgDaily, lead + review + safety) - usable - incomingWithinLead,
      );
      const reorderQty = ceilToPack(reorderRaw, medicine.packSize);
      const expedite = daysToStockout !== null && daysToStockout < lead;

      const transferableBatches = active.filter((b) => b.daysToExpiry > 90);
      const hasTransferableBatch = transferableBatches.length > 0;
      const demand45 = demandThrough(points, avgDaily, 45);
      const safetyUnits = avgDaily * 7;
      const surplus45 = hasTransferableBatch
        ? Math.max(0, Math.floor(usable - demand45 - safetyUnits))
        : 0;

      const lastRestockedAt = rawBatches.length
        ? new Date(Math.max(...rawBatches.map((b) => b.receivedAt.getTime()))).toISOString()
        : null;

      series.push({
        facilityId: facility.id,
        facilityName: facility.name,
        facilityShortName: facility.shortName,
        facilityType: facility.type,
        lga: facility.lga,
        medicineId: medicine.id,
        medicineName: medicine.name,
        genericName: medicine.genericName,
        strength: medicine.strength,
        category: medicine.category,
        unit: medicine.unit,
        packSize: medicine.packSize,
        leadTimeDays: medicine.leadTimeDays,
        usable,
        expired,
        nearExpiry,
        expiringSoon,
        usableValue: usable * (rawBatches[0]?.unitCostNgn ?? 0),
        expiredValue: expiredBatches.reduce((s, b) => s + b.quantityRemaining * b.unitCostNgn, 0),
        nearExpiryValue: nearExpiryBatches.reduce((s, b) => s + b.quantityRemaining * b.unitCostNgn, 0),
        batches,
        incoming,
        nextIncomingDate: incoming[0]?.expectedAt ?? null,
        avgDailyDemand: avgDaily,
        daysToStockout,
        stockoutDate: depletion.date ? depletion.date.toISOString() : null,
        coverageDays,
        risk: riskFor(daysToStockout, usable, medicine.leadTimeDays),
        shortage45,
        reorderQty,
        expedite,
        forecast,
        hasTransferableBatch,
        surplus45,
        lastRestockedAt,
      });
    }
  }

  const alerts: AlertView[] = [];
  for (const s of series) {
    if (s.risk !== "LOW" && s.avgDailyDemand > 0) {
      const days = s.daysToStockout;
      alerts.push({
        id: `stock:${s.facilityId}:${s.medicineId}`,
        type: "STOCKOUT_RISK",
        severity: s.risk,
        facilityId: s.facilityId,
        facilityName: s.facilityShortName,
        medicineId: s.medicineId,
        medicineName: s.medicineName,
        message:
          days === null
            ? "Low stock cover"
            : days <= 0
              ? "Stocked out"
              : `Projected stockout in ${Math.floor(days)} days`,
        detail:
          s.usable === 0
            ? "No usable stock remains."
            : `${s.usable.toLocaleString()} ${s.unit}s usable at ${s.avgDailyDemand.toFixed(1)}/day forecast demand.`,
        date: s.stockoutDate,
        quantity: s.usable,
        value: s.usableValue,
      });
    }
    if (s.expiringSoon > 0) {
      const earliest = s.batches.find((b) => b.quantityRemaining > 0 && b.daysToExpiry > 0 && b.daysToExpiry <= 60);
      alerts.push({
        id: `expiry:${s.facilityId}:${s.medicineId}`,
        type: "EXPIRY",
        severity: (earliest?.daysToExpiry ?? 60) <= 30 ? "HIGH" : "MEDIUM",
        facilityId: s.facilityId,
        facilityName: s.facilityShortName,
        medicineId: s.medicineId,
        medicineName: s.medicineName,
        message: `${s.expiringSoon.toLocaleString()} ${s.unit}s expire in ${earliest?.daysToExpiry ?? 60} days`,
        detail: "Prioritise FEFO issue or consider redistribution before expiry.",
        date: earliest?.expiryDate ?? null,
        quantity: s.expiringSoon,
        value: s.nearExpiryValue,
      });
    }
    if (s.surplus45 > 0 && s.daysToStockout === null && s.avgDailyDemand > 0) {
      alerts.push({
        id: `over:${s.facilityId}:${s.medicineId}`,
        type: "OVERSTOCK",
        severity: "LOW",
        facilityId: s.facilityId,
        facilityName: s.facilityShortName,
        medicineId: s.medicineId,
        medicineName: s.medicineName,
        message: `${s.surplus45.toLocaleString()} ${s.unit}s above 45-day cover`,
        detail: "Potential surplus available for network redistribution.",
        date: null,
        quantity: s.surplus45,
        value: s.surplus45 * (s.batches[0]?.unitCostNgn ?? 0),
      });
    }
  }
  alerts.sort((a, b) => {
    const severity = RISK_ORDER[a.severity] - RISK_ORDER[b.severity];
    if (severity !== 0) return severity;
    return (a.date ?? "9999").localeCompare(b.date ?? "9999");
  });

  const opportunities: OpportunityView[] = [];
  const shortages = series.filter(
    (s) => s.avgDailyDemand > 0 && s.risk !== "LOW" && s.daysToStockout !== null,
  );
  for (const shortage of shortages) {
    const candidates = series
      .filter(
        (s) =>
          s.medicineId === shortage.medicineId &&
          s.facilityId !== shortage.facilityId &&
          s.surplus45 > 10 &&
          s.hasTransferableBatch,
      )
      .sort((a, b) => b.surplus45 - a.surplus45);
    const source = candidates[0];
    if (!source) continue;

    const nextIncomingDays = shortage.nextIncomingDate
      ? daysBetween(new Date(shortage.nextIncomingDate), today)
      : null;
    let need = shortage.shortage45;
    if (
      nextIncomingDays !== null &&
      shortage.daysToStockout !== null &&
      shortage.daysToStockout < nextIncomingDays
    ) {
      need = Math.max(
        need,
        Math.ceil(
          demandThrough(shortage.forecast?.points ?? [], shortage.avgDailyDemand, nextIncomingDays + 7) -
            shortage.usable,
        ),
      );
    }
    let quantity = Math.min(need, source.surplus45);
    quantity = ceilToPack(quantity, shortage.packSize);
    quantity = Math.min(quantity, source.surplus45);
    if (quantity <= 0) continue;

    const batch = source.batches.find(
      (b) => b.quantityRemaining >= quantity && b.daysToExpiry > 90,
    ) ?? source.batches.find((b) => b.daysToExpiry > 90 && b.quantityRemaining > 0);

    const after = projectDepletion(
      shortage.usable,
      shortage.forecast?.points ?? [],
      shortage.avgDailyDemand,
      shortage.incoming,
      quantity,
    );

    opportunities.push({
      id: `${shortage.facilityId}:${shortage.medicineId}:${source.facilityId}`,
      medicineId: shortage.medicineId,
      medicineName: shortage.medicineName,
      genericName: shortage.genericName,
      unit: shortage.unit,
      fromFacilityId: source.facilityId,
      fromFacilityName: source.facilityShortName,
      toFacilityId: shortage.facilityId,
      toFacilityName: shortage.facilityShortName,
      quantity,
      surplus: source.surplus45,
      batchId: batch?.id ?? null,
      batchNumber: batch?.batchNumber ?? null,
      expiryDate: batch?.expiryDate ?? null,
      daysToStockout: shortage.daysToStockout,
      urgency: shortage.risk,
      reason:
        nextIncomingDays !== null && shortage.daysToStockout !== null && shortage.daysToStockout < nextIncomingDays
          ? `Stockout projected before the next delivery, which is ${nextIncomingDays} days away. Bridges demand with 7 days of safety stock.`
          : `Covers the projected 45-day shortfall while preserving ${source.facilityShortName}'s own cover.`,
      daysCoveredAfter: after.days,
    });
  }
  opportunities.sort((a, b) => {
    const urgency = RISK_ORDER[a.urgency] - RISK_ORDER[b.urgency];
    if (urgency !== 0) return urgency;
    return (a.daysToStockout ?? 999) - (b.daysToStockout ?? 999);
  });

  const atRiskFacilities = new Set(
    series
      .filter((s) => (s.risk === "CRITICAL" || s.risk === "HIGH") && s.avgDailyDemand > 0)
      .map((s) => s.facilityId),
  );
  const transferableUnits = series.reduce((sum, s) => sum + s.surplus45, 0);

  return {
    facilities: input.facilities,
    series,
    alerts,
    opportunities,
    totals: {
      facilities: input.facilities.length,
      medicines: input.medicines.length,
      seriesCount: series.length,
      stockValue: series.reduce((s, x) => s + x.usableValue, 0),
      expiringValue: series.reduce((s, x) => s + x.nearExpiryValue, 0),
      atRiskFacilities: atRiskFacilities.size,
      criticalSeries: series.filter((s) => s.risk === "CRITICAL" && s.avgDailyDemand > 0).length,
      highSeries: series.filter((s) => s.risk === "HIGH" && s.avgDailyDemand > 0).length,
      mediumSeries: series.filter((s) => s.risk === "MEDIUM" && s.avgDailyDemand > 0).length,
      openAlerts: alerts.filter((a) => a.severity !== "LOW").length,
      transferableUnits,
    },
  };
}
