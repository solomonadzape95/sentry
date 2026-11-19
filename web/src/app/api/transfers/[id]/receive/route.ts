import { appNow } from "@/lib/config";
import { prisma } from "@/lib/db";
import { jsonError, requireReceiver } from "@/lib/api";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const transfer = await prisma.transferRequest.findUnique({
    where: { id },
    include: {
      medicine: true,
      batch: true,
      fromFacility: true,
      toFacility: true,
      approvedBy: true,
    },
  });
  if (!transfer) return jsonError("Transfer not found", 404);

  const access = await requireReceiver(transfer.toFacilityId);
  if (!access.ok) return access.response;
  if (transfer.status !== "IN_TRANSIT") {
    return jsonError("Transfer must be approved and in transit before receipt", 409);
  }

  const now = appNow();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryBatch.aggregate({
        where: {
          facilityId: transfer.toFacilityId,
          medicineId: transfer.medicineId,
          status: "ACTIVE",
          expiryDate: { gt: now },
        },
        _sum: { quantityRemaining: true },
      });
      const balanceAfter = (existing._sum.quantityRemaining ?? 0) + transfer.quantity;

      const batch = await tx.inventoryBatch.create({
        data: {
          facilityId: transfer.toFacilityId,
          medicineId: transfer.medicineId,
          supplierId: transfer.batch?.supplierId ?? null,
          batchNumber: `${transfer.batch?.batchNumber ?? "TRANSFER"}-T`,
          quantityReceived: transfer.quantity,
          quantityRemaining: transfer.quantity,
          expiryDate: transfer.batch?.expiryDate ?? now,
          receivedAt: now,
          unitCostNgn: transfer.batch?.unitCostNgn ?? 0,
          status: "ACTIVE",
        },
      });

      await tx.stockMovement.create({
        data: {
          facilityId: transfer.toFacilityId,
          medicineId: transfer.medicineId,
          batchId: batch.id,
          type: "TRANSFER_IN",
          quantity: transfer.quantity,
          balanceAfter,
          reason: `Transfer received from ${transfer.fromFacility.shortName}`,
          reference: transfer.reference,
          performedById: access.persona.id,
          occurredAt: now,
        },
      });

      const updated = await tx.transferRequest.update({
        where: { id: transfer.id },
        data: { status: "COMPLETED", completedAt: now },
      });

      await tx.auditLog.create({
        data: {
          facilityId: transfer.toFacilityId,
          userId: access.persona.id,
          entity: "TransferRequest",
          entityId: transfer.id,
          action: "TRANSFER_RECEIVED",
          detail: JSON.stringify({
            reference: transfer.reference,
            quantity: transfer.quantity,
            medicine: transfer.medicine.name,
            source: transfer.fromFacility.shortName,
          }),
        },
      });

      return {
        status: updated.status,
        batchId: batch.id,
        balanceAfter,
        reference: transfer.reference,
      };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return jsonError("Could not receive transfer", 500);
  }
}
