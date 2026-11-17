import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireApprover } from "@/lib/api";
import { canAccessFacility } from "@/lib/session";

const schema = z.object({
  fromFacilityId: z.string().min(1),
  toFacilityId: z.string().min(1),
  medicineId: z.string().min(1),
  batchId: z.string().optional().nullable(),
  quantity: z.number().int().positive().max(1_000_000),
  reason: z.string().max(400).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid transfer request", 400);
  const data = parsed.data;

  if (data.fromFacilityId === data.toFacilityId) {
    return jsonError("Source and destination must be different facilities", 400);
  }

  const access = await requireApprover(data.fromFacilityId);
  if (!access.ok) return access.response;
  if (!canAccessFacility(access.persona, data.toFacilityId)) {
    return jsonError("You do not have access to the destination facility", 403);
  }

  const [medicine, from, to, batch] = await Promise.all([
    prisma.medicine.findUnique({ where: { id: data.medicineId } }),
    prisma.facility.findUnique({ where: { id: data.fromFacilityId } }),
    prisma.facility.findUnique({ where: { id: data.toFacilityId } }),
    data.batchId ? prisma.inventoryBatch.findUnique({ where: { id: data.batchId } }) : null,
  ]);
  if (!medicine || !from || !to) return jsonError("Transfer references not found", 404);
  if (batch && (batch.facilityId !== from.id || batch.medicineId !== medicine.id)) {
    return jsonError("Batch does not belong to the source facility and medicine", 400);
  }
  if (batch && batch.quantityRemaining < data.quantity) {
    return jsonError("Selected batch does not have enough stock", 409);
  }

  const reference = `TR-${Date.now().toString(36).toUpperCase()}`;
  const transfer = await prisma.transferRequest.create({
    data: {
      reference,
      fromFacilityId: from.id,
      toFacilityId: to.id,
      medicineId: medicine.id,
      batchId: batch?.id ?? null,
      quantity: data.quantity,
      status: "PENDING_APPROVAL",
      reason: data.reason ?? "Network redistribution recommendation",
      requestedById: access.persona.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      facilityId: from.id,
      userId: access.persona.id,
      entity: "TransferRequest",
      entityId: transfer.id,
      action: "TRANSFER_REQUESTED",
      detail: JSON.stringify({
        reference,
        medicine: medicine.name,
        quantity: data.quantity,
        to: to.shortName,
      }),
    },
  });

  return Response.json({ ok: true, transfer: { id: transfer.id, reference, status: transfer.status } });
}
