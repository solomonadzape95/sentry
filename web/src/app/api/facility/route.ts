import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { FACILITY_COOKIE, getPersona } from "@/lib/session";

const schema = z.object({ facilityId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid facility" }, { status: 400 });
  }

  const persona = await getPersona();
  const facility = await prisma.facility.findUnique({ where: { id: parsed.data.facilityId } });
  if (!facility) return Response.json({ error: "Facility not found" }, { status: 404 });

  const allowed =
    persona.role === "NETWORK_AUTHORITY" ||
    persona.memberships.some((m) => m.facilityId === facility.id);
  if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

  const store = await cookies();
  store.set(FACILITY_COOKIE, facility.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return Response.json({ ok: true, facility: { id: facility.id, name: facility.shortName } });
}
