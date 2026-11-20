import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { can } from "@/lib/authz";
import { canAccessFacility, getApiPersona } from "@/lib/session";

const schema = z.object({
  fromFacilityId: z.string().min(1),
  toFacilityId: z.string().min(1),
  medicineId: z.string().min(1),
  batchId: z.string().optional().nullable(),
  quantity: z.number().int().positive().max(1_000_000),
  reason: z.string().max(400).optional(),
});

/**
 * Transfers are pull-based: the facility that needs stock raises the request,
 * the facility holding surplus approves and dispatches, and the requester
 * confirms receipt. A network authority can act for any facility.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid transfer request", 400);
  const data = parsed.data;

  if (data.fromFacilityId === data.toFacilityId) {
    return jsonError("Source and destination must be different facilities", 400);
  }

  const persona = await getApiPersona();
  if (!persona) return jsonError("Sign in to continue", 401);
  if (!can(persona.role, "transfer:request")) {
    return jsonError("Your role cannot raise transfer requests", 403);
  }

  const [medicine, from, to, batch] = await Promise.all([
    prisma.medicine.findUnique({ where: { id: data.medicineId } }),
    prisma.facility.findUnique({ where: { id: data.fromFacilityId } }),
    prisma.facility.findUnique({ where: { id: data.toFacilityId } }),
    data.batchId ? prisma.inventoryBatch.findUnique({ where: { id: data.batchId } }) : null,
  ]);
  if (!medicine || !from || !to) return jsonError("Transfer references not found", 404);

  // The requester must be the facility that needs the stock. The donor is a
  // counterparty, not the author of the request, so it is not required to have
  // access to the source facility here.
  if (!canAccessFacility(persona, to.id)) {
    return jsonError(
      `Only ${to.shortName} or a network authority can raise this request. ` +
        `The releasing facility approves and dispatches once the request exists.`,
      403,
    );
  }

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
      reason: data.reason ?? "Stock request from a facility in shortage",
      requestedById: persona.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      facilityId: to.id,
      userId: persona.id,
      entity: "TransferRequest",
      entityId: transfer.id,
      action: "TRANSFER_REQUESTED",
      detail: JSON.stringify({
        reference,
        medicine: medicine.name,
        quantity: data.quantity,
        from: from.shortName,
        requestedBy: to.shortName,
      }),
    },
  });

  return Response.json({ ok: true, transfer: { id: transfer.id, reference, status: transfer.status } });
}
