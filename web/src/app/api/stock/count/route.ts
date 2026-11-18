import { z } from "zod";
import { appNow } from "@/lib/config";
import { prisma } from "@/lib/db";
import { jsonError, requireFacilityAccess } from "@/lib/api";

const schema = z.object({
  facilityId: z.string().min(1),
  medicineId: z.string().min(1),
  countedQuantity: z.number().int().nonnegative().max(1_000_000),
  note: z.string().max(240).optional(),
  clientId: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid stock count payload", 400);
  const { facilityId, medicineId, countedQuantity, note, clientId } = parsed.data;

  const access = await requireFacilityAccess(facilityId);
  if (!access.ok) return access.response;

  const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
  if (!medicine) return jsonError("Medicine not found", 404);

  const now = appNow();
  const reference = clientId
    ? `CNT-${clientId}`
    : `CNT-${now.toISOString().slice(0, 10)}-${medicineId}`;
  const existing = await prisma.stockMovement.findFirst({
    where: { reference, type: "ADJUSTMENT", facilityId, medicineId },
  });
  if (existing) {
    return Response.json({ ok: true, idempotent: true, balanceAfter: existing.balanceAfter });
  }

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
      const current = batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
      const delta = countedQuantity - current;

      if (delta > 0) {
        throw new Error(`SURPLUS:${current}`);
      }
      if (delta === 0) {
        return { current, counted: countedQuantity, delta, balanceAfter: current };
      }

      let remaining = -delta;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const used = Math.min(batch.quantityRemaining, remaining);
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            quantityRemaining: batch.quantityRemaining - used,
            status: batch.quantityRemaining - used === 0 ? "DEPLETED" : batch.status,
          },
        });
        remaining -= used;
      }

      await tx.stockMovement.create({
        data: {
          facilityId,
          medicineId,
          type: "ADJUSTMENT",
          quantity: delta,
          balanceAfter: countedQuantity,
          reason: note || "Physical stock count variance",
          reference,
          performedById: access.persona.id,
          occurredAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          facilityId,
          userId: access.persona.id,
          entity: "InventoryBatch",
          entityId: medicineId,
          action: "STOCK_COUNTED",
          detail: JSON.stringify({
            medicine: medicine.name,
            systemQuantity: current,
            countedQuantity,
            variance: delta,
          }),
        },
      });

      return { current, counted: countedQuantity, delta, balanceAfter: countedQuantity };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("SURPLUS:")) {
      const current = Number(error.message.split(":")[1]);
      return jsonError(
        `Physical count is higher than the system (${current}). Receive the surplus as a batch so the expiry is captured.`,
        409,
      );
    }
    console.error(error);
    return jsonError("Could not record stock count", 500);
  }
}
