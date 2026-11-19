import { appNow } from "@/lib/config";
import { prisma } from "@/lib/db";
import { jsonError, requireApprover } from "@/lib/api";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const transfer = await prisma.transferRequest.findUnique({
    where: { id },
    include: { medicine: true, batch: true, fromFacility: true, toFacility: true },
  });
  if (!transfer) return jsonError("Transfer not found", 404);

  const access = await requireApprover(transfer.fromFacilityId);
  if (!access.ok) return access.response;
  if (transfer.status !== "PENDING_APPROVAL" && transfer.status !== "RECOMMENDED") {
    return jsonError(`Transfer is ${transfer.status.toLowerCase()} and cannot be approved`, 409);
  }

  const now = appNow();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const batches = await tx.inventoryBatch.findMany({
        where: {
          facilityId: transfer.fromFacilityId,
          medicineId: transfer.medicineId,
          status: "ACTIVE",
          quantityRemaining: { gt: 0 },
          expiryDate: { gt: now },
        },
        orderBy: { expiryDate: "asc" },
      });
      const available = batches.reduce((s, b) => s + b.quantityRemaining, 0);
      if (available < transfer.quantity) {
        throw new Error(`INSUFFICIENT:${available}`);
      }

      let remaining = transfer.quantity;
      let balance = available;
      let chosenBatchId = transfer.batchId;
      let chosenExpiry = transfer.batch?.expiryDate ?? batches[0]?.expiryDate ?? now;
      let chosenNumber = transfer.batch?.batchNumber ?? batches[0]?.batchNumber ?? "TRANSFER";

      for (const batch of batches) {
        if (remaining <= 0) break;
        const used = Math.min(batch.quantityRemaining, remaining);
        if (!chosenBatchId) {
          chosenBatchId = batch.id;
          chosenExpiry = batch.expiryDate;
          chosenNumber = batch.batchNumber;
        }
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            quantityRemaining: batch.quantityRemaining - used,
            status: batch.quantityRemaining - used === 0 ? "DEPLETED" : batch.status,
          },
        });
        balance -= used;
        remaining -= used;
        await tx.stockMovement.create({
          data: {
            facilityId: transfer.fromFacilityId,
            medicineId: transfer.medicineId,
            batchId: batch.id,
            type: "TRANSFER_OUT",
            quantity: -used,
            balanceAfter: balance,
            reason: `Transfer to ${transfer.toFacility.shortName}`,
            reference: transfer.reference,
            performedById: access.persona.id,
            occurredAt: now,
          },
        });
      }

      const updated = await tx.transferRequest.update({
        where: { id: transfer.id },
        data: {
          status: "IN_TRANSIT",
          approvedAt: now,
          approvedById: access.persona.id,
          batchId: chosenBatchId,
        },
      });

      await tx.auditLog.create({
        data: {
          facilityId: transfer.fromFacilityId,
          userId: access.persona.id,
          entity: "TransferRequest",
          entityId: transfer.id,
          action: "TRANSFER_APPROVED",
          detail: JSON.stringify({
            reference: transfer.reference,
            quantity: transfer.quantity,
            medicine: transfer.medicine.name,
            destination: transfer.toFacility.shortName,
            batchNumber: chosenNumber,
            expiry: chosenExpiry.toISOString(),
          }),
        },
      });

      return {
        status: updated.status,
        reference: updated.reference,
        batchNumber: chosenNumber,
        expiryDate: chosenExpiry.toISOString(),
      };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT:")) {
      return jsonError("Source facility no longer has enough usable stock", 409);
    }
    console.error(error);
    return jsonError("Could not approve transfer", 500);
  }
}
