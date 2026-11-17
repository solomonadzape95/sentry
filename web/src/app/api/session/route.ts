import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERSONA_COOKIE } from "@/lib/session";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid persona" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) return Response.json({ error: "Persona not found" }, { status: 404 });

  const store = await cookies();
  store.set(PERSONA_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return Response.json({ ok: true, persona: { id: user.id, name: user.name, role: user.role } });
}
