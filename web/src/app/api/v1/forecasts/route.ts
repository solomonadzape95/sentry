import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiOk, jsonError, parseLimit } from "@/lib/api";
import { getApiScope } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const scope = await getApiScope();
  if (!scope) return jsonError("Sign in to continue", 401);

  const params = request.nextUrl.searchParams;
  const facilityId = params.get("facilityId");
  const medicineId = params.get("medicineId");
  const limit = parseLimit(params.get("limit"), 100, 500);
  const allowedFacilityIds = scope.isNetworkAuthority
    ? null
    : scope.facilities.map((facility) => facility.id);

  if (facilityId && allowedFacilityIds && !allowedFacilityIds.includes(facilityId)) {
    return jsonError("You do not have access to this facility", 403);
  }

  const rows = await prisma.forecast.findMany({
    where: {
      ...(facilityId
        ? { facilityId }
        : allowedFacilityIds
          ? { facilityId: { in: allowedFacilityIds } }
          : {}),
      ...(medicineId ? { medicineId } : {}),
    },
    include: {
      facility: { select: { id: true, name: true, shortName: true } },
      medicine: { select: { id: true, name: true, unit: true, packSize: true } },
      points: { orderBy: { date: "asc" } },
    },
    orderBy: [{ trainedAt: "desc" }, { facilityId: "asc" }, { medicineId: "asc" }],
    take: limit,
  });

  return apiOk(rows, {
    count: rows.length,
    filters: { facilityId: facilityId ?? null, medicineId: medicineId ?? null, limit },
  });
}
