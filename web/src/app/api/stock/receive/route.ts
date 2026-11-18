import { z } from "zod";
import { appNow } from "@/lib/config";
import { prisma } from "@/lib/db";
import { jsonError, requireFacilityAccess } from "@/lib/api";

const schema = z.object({
  facilityId: z.string().min(1),
  medicineId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000_000),
  batchNumber: z.string().min(1).max(80),
  expiryDate: z.string().min(8),
  supplierId: z.string().optional().nullable(),
  unitCostNgn: z.number().nonnegative().optional(),
  clientId: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid receive payload", 400);
  const data = parsed.data;

  const access = await requireFacilityAccess(data.facilityId);
  if (!access.ok) return access.response;

  const medicine = await prisma.medicine.findUnique({ where: { id: data.medicineId } });
  if (!medicine) return jsonError("Medicine not found", 404);

  const expiry = new Date(data.expiryDate);
  if (Number.isNaN(expiry.getTime())) return jsonError("Invalid expiry date", 400);

  const now = appNow();
  const idempotencyKey = data.clientId ? `MOB-${data.clientId}` : null;
  if (idempotencyKey) {
    const existing = await prisma.stockMovement.findFirst({ where: { reference: idempotencyKey } });
    if (existing) return Response.json({ ok: true, idempotent: true, batchId: existing.batchId });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingUsable = await tx.inventoryBatch.aggregate({
        where: {
          facilityId: data.facilityId,
          medicineId: data.medicineId,
          status: "ACTIVE",
          expiryDate: { gt: now },
        },
        _sum: { quantityRemaining: true },
      });
      const balanceAfter =
        (existingUsable._sum.quantityRemaining ?? 0) + data.quantity;

      const batch = await tx.inventoryBatch.create({
        data: {
          facilityId: data.facilityId,
          medicineId: data.medicineId,
          supplierId: data.supplierId || null,
          batchNumber: data.batchNumber,
          quantityReceived: data.quantity,
          quantityRemaining: data.quantity,
          expiryDate: expiry,
          receivedAt: now,
          unitCostNgn: data.unitCostNgn ?? 0,
          status: "ACTIVE",
        },
      });

      await tx.stockMovement.create({
        data: {
          facilityId: data.facilityId,
          medicineId: data.medicineId,
          batchId: batch.id,
          type: "RECEIPT",
          quantity: data.quantity,
          balanceAfter,
          reason: "Stock received at facility",
          reference: idempotencyKey ?? `RCV-${now.toISOString().slice(0, 10)}`,
          performedById: access.persona.id,
          occurredAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          facilityId: data.facilityId,
          userId: access.persona.id,
          entity: "InventoryBatch",
          entityId: batch.id,
          action: "STOCK_RECEIVED",
          detail: JSON.stringify({
            medicine: medicine.name,
            quantity: data.quantity,
            batchNumber: data.batchNumber,
          }),
        },
      });

      return { batchId: batch.id, balanceAfter };
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return jsonError("Could not receive stock", 500);
  }
}
