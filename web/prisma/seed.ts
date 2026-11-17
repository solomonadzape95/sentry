/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const SEED = join(process.cwd(), "..", "data", "seed");

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(SEED, name), "utf8")) as T;
}

async function chunked<T>(rows: T[], size: number, fn: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) {
    await fn(rows.slice(i, i + size));
  }
}

const performedBy: Record<string, string> = {
  fac_phc: "usr_amara",
  fac_gh: "usr_chidi",
  fac_sunrise: "usr_bola",
  fac_carepoint: "usr_emeka",
};

async function main() {
  console.log("Clearing existing data...");
  await prisma.forecastPoint.deleteMany();
  await prisma.forecast.deleteMany();
  await prisma.stockAlert.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.consumptionRecord.deleteMany();
  await prisma.inventoryBatch.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.modelRun.deleteMany();
  await prisma.weatherObservation.deleteMany();
  await prisma.diseaseObservation.deleteMany();
  await prisma.facilityMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.supplier.deleteMany();

  const facilities = load<any[]>("facilities.json");
  const medicines = load<any[]>("medicines.json");
  const suppliers = load<any[]>("suppliers.json");
  const users = load<any[]>("users.json");
  const inventory = load<any[]>("inventory.json");
  const movements = load<any[]>("movements.json");
  const purchaseOrders = load<any[]>("purchase_orders.json");
  const weather = load<any[]>("weather.json");
  const disease = load<any[]>("disease.json");
  const consumption = load<any[][]>("consumption.json");
  const forecasts = load<any[]>("forecasts.json");
  const modelRuns = load<any[]>("model_runs.json");

  // Keep the bundled demo metadata in sync with the latest pipeline run.
  writeFileSync(
    join(process.cwd(), "src", "data", "demo-meta.json"),
    readFileSync(join(SEED, "meta.json"), "utf8"),
  );

  console.log("Facilities, medicines, suppliers, users...");
  await prisma.facility.createMany({
    data: facilities.map((f) => ({
      id: f.id,
      name: f.name,
      shortName: f.shortName,
      type: f.type,
      ownership: f.ownership,
      address: f.address,
      lga: f.lga,
      state: f.state,
      latitude: f.latitude,
      longitude: f.longitude,
      phone: f.phone,
      contactName: f.contactName,
      bedCount: f.bedCount,
    })),
  });

  await prisma.medicine.createMany({
    data: medicines.map((m) => ({
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      strength: m.strength,
      form: m.form,
      category: m.category,
      unit: m.unit,
      packSize: m.packSize,
      barcode: m.barcode,
      atcCode: m.atcCode,
      essential: m.essential,
      storage: m.storage,
      leadTimeDays: m.leadTimeDays,
      shelfLifeDays: m.shelfLifeDays,
    })),
  });

  await prisma.supplier.createMany({
    data: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      leadTimeDays: s.leadTimeDays,
      phone: s.phone,
      email: s.email,
    })),
  });

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title,
        phone: u.phone,
        memberships: { create: u.memberships ?? [] },
      },
    });
  }

  console.log("Inventory batches...");
  await prisma.inventoryBatch.createMany({
    data: inventory.map((b) => ({
      id: b.id,
      facilityId: b.facilityId,
      medicineId: b.medicineId,
      supplierId: b.supplierId,
      batchNumber: b.batchNumber,
      quantityReceived: b.quantityReceived,
      quantityRemaining: b.quantityRemaining,
      expiryDate: new Date(b.expiryDate),
      receivedAt: new Date(b.receivedAt),
      unitCostNgn: b.unitCostNgn,
      status: b.status,
    })),
  });

  const batchRows = await prisma.inventoryBatch.findMany({ select: { id: true, batchNumber: true } });
  const batchIdByNumber = new Map(batchRows.map((b) => [b.batchNumber, b.id]));

  console.log("Stock movements...");
  await chunked(movements, 500, (rows) =>
    prisma.stockMovement.createMany({
      data: rows.map((m) => ({
        facilityId: m.facilityId,
        medicineId: m.medicineId,
        batchId: m.batchNumber ? batchIdByNumber.get(m.batchNumber) ?? null : null,
        type: m.type,
        quantity: m.quantity,
        balanceAfter: m.balanceAfter,
        reason: m.reason,
        reference: m.reference,
        performedById: performedBy[m.facilityId] ?? null,
        occurredAt: new Date(m.occurredAt),
      })),
    }),
  );

  console.log("Consumption history...");
  await chunked(consumption, 1500, (rows) =>
    prisma.consumptionRecord.createMany({
      data: rows.map((r) => ({
        facilityId: r[0] as string,
        medicineId: r[1] as string,
        date: new Date(r[2] as string),
        quantity: r[3] as number,
        wasStockout: Boolean(r[4]),
        source: "SYSTEM",
      })),
    }),
  );

  console.log("Purchase orders...");
  await prisma.purchaseOrder.createMany({
    data: purchaseOrders.map((p) => ({
      reference: p.reference,
      facilityId: p.facilityId,
      supplierId: p.supplierId,
      medicineId: p.medicineId,
      quantity: p.quantity,
      status: p.status,
      orderedAt: new Date(p.orderedAt),
      expectedAt: new Date(p.expectedAt),
    })),
  });

  console.log("Weather and disease observations...");
  await chunked(weather, 500, (rows) =>
    prisma.weatherObservation.createMany({
      data: rows.map((w) => ({
        location: w.location,
        state: w.state,
        date: new Date(w.date),
        rainfallMm: w.rainfallMm,
        tempMaxC: w.tempMaxC,
        tempMinC: w.tempMinC,
        humidityPct: w.humidityPct,
        source: w.source,
      })),
    }),
  );

  await chunked(disease, 500, (rows) =>
    prisma.diseaseObservation.createMany({
      data: rows.map((d) => ({
        disease: d.disease,
        state: d.state,
        lga: d.lga,
        periodStart: new Date(d.periodStart),
        periodEnd: new Date(d.periodEnd),
        cases: d.cases,
        source: d.source,
        isIllustrative: d.isIllustrative,
      })),
    }),
  );

  console.log("Forecasts...");
  for (const f of forecasts) {
    await prisma.forecast.create({
      data: {
        facilityId: f.facilityId,
        medicineId: f.medicineId,
        model: f.model,
        modelLabel: f.modelLabel,
        horizonDays: f.horizonDays,
        mae: f.mae,
        wape: f.wape,
        bias: f.bias,
        confidence: f.confidence,
        dataPoints: f.dataPoints,
        lowData: f.lowData,
        trainedAt: new Date(f.trainedAt),
        points: {
          create: f.points.map((p: any) => ({
            date: new Date(p.date),
            predicted: p.predicted,
            lower80: p.lower80,
            upper80: p.upper80,
            lower95: p.lower95,
            upper95: p.upper95,
          })),
        },
      },
    });
  }

  console.log("Model runs...");
  await prisma.modelRun.createMany({
    data: modelRuns.map((r) => ({
      model: r.model,
      horizonDays: r.horizonDays,
      seriesCount: r.seriesCount,
      overallMae: r.overallMae,
      overallWape: r.overallWape,
      overallBias: r.overallBias,
      baselineWape: r.baselineWape,
      notes: r.notes,
    })),
  });

  const counts = {
    facilities: await prisma.facility.count(),
    medicines: await prisma.medicine.count(),
    batches: await prisma.inventoryBatch.count(),
    consumption: await prisma.consumptionRecord.count(),
    forecasts: await prisma.forecast.count(),
    forecastPoints: await prisma.forecastPoint.count(),
    movements: await prisma.stockMovement.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
