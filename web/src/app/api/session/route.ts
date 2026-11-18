import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_REQUIRED } from "@/lib/config";
import { prisma } from "@/lib/db";
import { PERSONA_COOKIE } from "@/lib/session";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(request: NextRequest) {
  if (AUTH_REQUIRED) {
    return Response.json(
      { error: "Persona switching is disabled when authentication is required." },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid persona" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) return Response.json({ error: "Persona not found" }, { status: 404 });

  const store = await cookies();
  // A real Auth.js session takes precedence over the demo persona. Clear it so
  // the demo switcher behaves as expected after someone has signed in.
  store.delete("authjs.session-token");
  store.delete("__Secure-authjs.session-token");
  store.set(PERSONA_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return Response.json({ ok: true, persona: { id: user.id, name: user.name, role: user.role } });
}
