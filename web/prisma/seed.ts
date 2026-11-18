/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();
const SEED = join(process.cwd(), "..", "data", "seed");

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(SEED, name), "utf8")) as T;
}

function loadOptional<T>(name: string, fallback: T): T {
  try {
    return load<T>(name);
  } catch {
    return fallback;
  }
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
  await prisma.ingestRun.deleteMany();
  await prisma.dataSource.deleteMany();
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
  const dataSources = loadOptional<any[]>("data_sources.json", []);
  const ingestRuns = loadOptional<any[]>("ingest_runs.json", []);
  const dataQuality = loadOptional<any>("data_quality.json", null);

  // Keep the bundled demo metadata in sync with the latest pipeline run.
  writeFileSync(
    join(process.cwd(), "src", "data", "demo-meta.json"),
    readFileSync(join(SEED, "meta.json"), "utf8"),
  );
  if (dataQuality) {
    writeFileSync(
      join(process.cwd(), "src", "data", "data-quality.json"),
      readFileSync(join(SEED, "data_quality.json"), "utf8"),
    );
  }

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
      sourceId: f.sourceId ?? null,
      nhfrId: f.nhfrId ?? null,
      grid3Id: f.grid3Id ?? null,
      level: f.level ?? null,
      catchmentPopulation: f.catchmentPopulation ?? null,
      isIllustrative: f.isIllustrative ?? true,
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

  console.log("Data sources and ingest runs...");
  for (const s of dataSources) {
    await prisma.dataSource.create({
      data: {
        id: s.id,
        name: s.name,
        kind: s.kind,
        coverage: s.coverage ?? null,
        url: s.url ?? null,
        licence: s.licence ?? null,
        status: s.status ?? "ACTIVE",
        lastRunAt: s.lastRunAt ? new Date(s.lastRunAt) : null,
      },
    });
  }
  for (const r of ingestRuns) {
    const source = await prisma.dataSource.findUnique({ where: { id: r.sourceId } });
    if (!source) continue;
    await prisma.ingestRun.create({
      data: {
        sourceId: r.sourceId,
        status: r.status ?? "success",
        rowsRead: r.rowsRead ?? 0,
        rowsAccepted: r.rowsAccepted ?? 0,
        rowsRejected: r.rowsRejected ?? 0,
        dateMin: r.dateMin ? new Date(r.dateMin) : null,
        dateMax: r.dateMax ? new Date(r.dateMax) : null,
        startedAt: r.startedAt ? new Date(r.startedAt) : new Date(),
        finishedAt: r.finishedAt ? new Date(r.finishedAt) : null,
        warnings: r.warnings ?? null,
        errors: r.errors ?? null,
      },
    });
  }

  const demoPassword = process.env.DEMO_PASSWORD ?? "sentry-demo-2026";
  const demoPasswordHash = await hashPassword(demoPassword);
  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title,
        phone: u.phone,
        passwordHash: demoPasswordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
        memberships: { create: u.memberships ?? [] },
      },
    });
  }
  console.log(`Demo users seeded. Password: ${demoPassword}`);

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
        isIllustrative: true,
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
        sourceUrl: d.sourceUrl ?? null,
        isIllustrative: d.isIllustrative,
        isDerived: Boolean(d.isDerived),
        isImputed: Boolean(d.isImputed),
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
