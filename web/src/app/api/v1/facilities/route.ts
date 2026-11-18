import { prisma } from "@/lib/db";
import { apiOk, jsonError } from "@/lib/api";
import { getApiScope } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getApiScope();
  if (!scope) return jsonError("Sign in to continue", 401);

  const facilities = scope.isNetworkAuthority
    ? await prisma.facility.findMany({ orderBy: { name: "asc" } })
    : scope.facilities;

  return apiOk(facilities, {
    count: facilities.length,
    scope: scope.isNetworkAuthority ? "network" : "member",
    persona: scope.persona.name,
  });
}
