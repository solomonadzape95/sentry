import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiOk, parseDate, parseLimit, requireNetworkAuthority } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await requireNetworkAuthority();
  if (!access.ok) return access.response;

  const params = request.nextUrl.searchParams;
  const disease = params.get("disease")?.toUpperCase() ?? null;
  const from = parseDate(params.get("from"));
  const to = parseDate(params.get("to"));
  const limit = parseLimit(params.get("limit"), 500, 2000);

  const where: {
    disease?: string;
    periodStart?: { gte?: Date; lte?: Date };
  } = {};
  if (disease) where.disease = disease;
  if (from || to) {
    where.periodStart = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const rows = await prisma.diseaseObservation.findMany({
    where,
    orderBy: { periodStart: "asc" },
    take: limit,
  });

  return apiOk(rows, {
    count: rows.length,
    filters: {
      disease,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      limit,
    },
  });
}
