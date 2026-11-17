import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const PERSONA_COOKIE = "aisec_persona";
export const FACILITY_COOKIE = "aisec_facility";

const personaInclude = {
  memberships: { include: { facility: true } },
} satisfies Prisma.UserInclude;

export type Persona = Prisma.UserGetPayload<{ include: typeof personaInclude }>;

export async function getPersona(): Promise<Persona> {
  const store = await cookies();
  const id = store.get(PERSONA_COOKIE)?.value;
  if (id) {
    const user = await prisma.user.findUnique({ where: { id }, include: personaInclude });
    if (user) return user;
  }
  const fallback = await prisma.user.findFirst({
    where: { role: "NETWORK_AUTHORITY" },
    include: personaInclude,
  });
  if (!fallback) throw new Error("No demo personas seeded. Run `npm run db:seed`.");
  return fallback;
}

export type Scope = {
  persona: Persona;
  facilities: Persona["memberships"][number]["facility"][];
  activeFacility: Persona["memberships"][number]["facility"] | null;
  canManageInventory: boolean;
  canApproveTransfers: boolean;
  isNetworkAuthority: boolean;
};

export async function getScope(): Promise<Scope> {
  const persona = await getPersona();
  const all = await prisma.facility.findMany({ orderBy: { name: "asc" } });
  const isNetworkAuthority = persona.role === "NETWORK_AUTHORITY";

  const memberFacilities = persona.memberships.map((m) => m.facility);
  const facilities = isNetworkAuthority
    ? all
    : memberFacilities.sort((a, b) => a.name.localeCompare(b.name));

  const store = await cookies();
  const requested = store.get(FACILITY_COOKIE)?.value;
  const primary =
    persona.memberships.find((m) => m.isPrimary)?.facility ??
    facilities.find((f) => f.id === "fac_phc") ??
    facilities[0] ??
    null;
  const activeFacility =
    facilities.find((f) => f.id === requested) ?? primary ?? null;

  return {
    persona,
    facilities,
    activeFacility,
    canManageInventory:
      isNetworkAuthority ||
      persona.role === "INVENTORY_OFFICER" ||
      persona.role === "FACILITY_MANAGER",
    canApproveTransfers:
      isNetworkAuthority || persona.role === "FACILITY_MANAGER",
    isNetworkAuthority,
  };
}

export function canAccessFacility(
  persona: Persona,
  facilityId: string,
): boolean {
  if (persona.role === "NETWORK_AUTHORITY") return true;
  return persona.memberships.some((m) => m.facilityId === facilityId);
}
