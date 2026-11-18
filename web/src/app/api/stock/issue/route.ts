import { z } from "zod";
import { appNow } from "@/lib/config";
import { prisma } from "@/lib/db";
import { jsonError, requireFacilityAccess } from "@/lib/api";

const schema = z.object({
  facilityId: z.string().min(1),
  medicineId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000_000),
  reason: z.string().max(240).optional(),
  clientId: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid issue payload", 400);
  const { facilityId, medicineId, quantity, reason, clientId } = parsed.data;

  const access = await requireFacilityAccess(facilityId);
  if (!access.ok) return access.response;

  const idempotencyKey = clientId ? `MOB-${clientId}` : null;
  if (idempotencyKey) {
    const existing = await prisma.stockMovement.findFirst({ where: { reference: idempotencyKey } });
    if (existing) {
      return Response.json({ ok: true, idempotent: true, balanceAfter: existing.balanceAfter });
    }
  }

  const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
  if (!medicine) return jsonError("Medicine not found", 404);

  const now = appNow();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const batches = await tx.inventoryBatch.findMany({
        where: {
          facilityId,
          medicineId,
          status: "ACTIVE",
          quantityRemaining: { gt: 0 },
          expiryDate: { gt: now },
        },
        orderBy: { expiryDate: "asc" },
      });
      const available = batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
      if (available < quantity) {
        throw new Error(`INSUFFICIENT:${available}`);
      }

      let remaining = quantity;
      let balance = available;
      const movements = [];
      for (const batch of batches) {
        if (remaining <= 0) break;
        const used = Math.min(batch.quantityRemaining, remaining);
        const newQty = batch.quantityRemaining - used;
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            quantityRemaining: newQty,
            status: newQty === 0 ? "DEPLETED" : batch.status,
          },
        });
        balance -= used;
        remaining -= used;
        movements.push({
          facilityId,
          medicineId,
          batchId: batch.id,
          type: "ISSUE",
          quantity: -used,
          balanceAfter: balance,
          reason: reason ?? "Issued to clinical units",
          reference: idempotencyKey ?? `ISS-${now.toISOString().slice(0, 10)}`,
          performedById: access.persona.id,
          occurredAt: now,
        });
      }
      await tx.stockMovement.createMany({ data: movements });

      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const existing = await tx.consumptionRecord.findUnique({
        where: { facilityId_medicineId_date: { facilityId, medicineId, date: day } },
      });
      if (existing) {
        await tx.consumptionRecord.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        });
      } else {
        await tx.consumptionRecord.create({
          data: { facilityId, medicineId, date: day, quantity, source: "SYSTEM" },
        });
      }

      await tx.auditLog.create({
        data: {
          facilityId,
          userId: access.persona.id,
          entity: "InventoryBatch",
          entityId: medicineId,
          action: "STOCK_ISSUED",
          detail: JSON.stringify({ medicine: medicine.name, quantity, reason }),
        },
      });

      return { balanceAfter: balance, movements: movements.length };
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT:")) {
      const available = Number(error.message.split(":")[1]);
      return jsonError(`Only ${available} ${medicine.unit}s available`, 409);
    }
    console.error(error);
    return jsonError("Could not issue stock", 500);
  }
}
