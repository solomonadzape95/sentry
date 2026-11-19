import { cache } from "react";
import { prisma } from "@/lib/db";
import { DEMO_TODAY } from "@/lib/config";
import { addDays } from "@/lib/format";
import { buildIntelligence } from "@/lib/intelligence";

export const getNetworkData = cache(async () => {
  const [facilities, medicines, batches, purchaseOrders, forecasts, suppliers] =
    await Promise.all([
      prisma.facility.findMany({ orderBy: { name: "asc" } }),
      prisma.medicine.findMany({ orderBy: { name: "asc" } }),
      prisma.inventoryBatch.findMany(),
      prisma.purchaseOrder.findMany(),
      prisma.forecast.findMany({ include: { points: true } }),
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    ]);

  return buildIntelligence({
    facilities,
    medicines,
    batches,
    purchaseOrders,
    forecasts,
    suppliers,
  });
});

export async function getFacilityConsumption(facilityId: string, days = 365) {
  return prisma.consumptionRecord.findMany({
    where: {
      facilityId,
      date: { gte: addDays(DEMO_TODAY, -days) },
    },
    orderBy: { date: "asc" },
  });
}

/**
 * One read for the network workspace: enough history to draw the actual line
 * under a forecast without querying per series.
 */
export const getConsumptionWindow = cache(async (days = 120) => {
  return prisma.consumptionRecord.findMany({
    where: { date: { gte: addDays(DEMO_TODAY, -days) } },
    orderBy: { date: "asc" },
    select: {
      facilityId: true,
      medicineId: true,
      date: true,
      quantity: true,
    },
  });
});

export async function getSeriesDetail(facilityId: string, medicineId: string, days = 400) {
  const [batches, forecast, consumption, movements, purchaseOrders] = await Promise.all([
    prisma.inventoryBatch.findMany({
      where: { facilityId, medicineId },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.forecast.findUnique({
      where: { facilityId_medicineId: { facilityId, medicineId } },
      include: { points: { orderBy: { date: "asc" } } },
    }),
    prisma.consumptionRecord.findMany({
      where: {
        facilityId,
        medicineId,
        date: { gte: addDays(DEMO_TODAY, -days) },
      },
      orderBy: { date: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { facilityId, medicineId },
      orderBy: { occurredAt: "desc" },
      take: 12,
      include: { performedBy: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { facilityId, medicineId },
      orderBy: { expectedAt: "asc" },
      include: { supplier: true },
    }),
  ]);

  return { batches, forecast, consumption, movements, purchaseOrders };
}

export async function getRecentMovements(facilityId: string, take = 20) {
  return prisma.stockMovement.findMany({
    where: { facilityId },
    orderBy: { occurredAt: "desc" },
    take,
    include: { medicine: true, performedBy: true },
  });
}

export async function getSignals() {
  const [weather, disease] = await Promise.all([
    prisma.weatherObservation.findMany({
      where: { date: { gte: addDays(DEMO_TODAY, -120) } },
      orderBy: { date: "asc" },
    }),
    prisma.diseaseObservation.findMany({
      where: { periodStart: { gte: addDays(DEMO_TODAY, -140) } },
      orderBy: { periodStart: "asc" },
    }),
  ]);
  return { weather, disease };
}

export async function getTransfers() {
  return prisma.transferRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      medicine: true,
      fromFacility: true,
      toFacility: true,
      batch: true,
      requestedBy: true,
      approvedBy: true,
    },
  });
}

export async function getModelRuns() {
  return prisma.modelRun.findMany({ orderBy: { overallWape: "asc" } });
}

export async function getAdminData() {
  const [facilities, users, medicines, suppliers] = await Promise.all([
    prisma.facility.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      include: { memberships: { include: { facility: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.medicine.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { facilities, users, medicines, suppliers };
}

export async function getMedicines() {
  return prisma.medicine.findMany({ orderBy: { name: "asc" } });
}

export async function getDataProvenance() {
  const [sources, runs] = await Promise.all([
    prisma.dataSource.findMany({ orderBy: { name: "asc" } }),
    prisma.ingestRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 24,
      include: { source: true },
    }),
  ]);
  return { sources, runs };
}

export async function getDiseaseProvenance() {
  return prisma.diseaseObservation.findMany({
    select: {
      disease: true,
      source: true,
      sourceUrl: true,
      isDerived: true,
      isImputed: true,
      periodStart: true,
    },
    distinct: ["disease", "source"],
    orderBy: { disease: "asc" },
  });
}
