import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { APP_PROFILE, AUTH_REQUIRED } from "@/lib/config";
import { prisma } from "@/lib/db";
import { can, homeFor } from "@/lib/authz";

export const PERSONA_COOKIE = "cheta_persona";
export const FACILITY_COOKIE = "cheta_facility";

const personaInclude = {
  memberships: { include: { facility: true } },
} satisfies Prisma.UserInclude;

export type Persona = Prisma.UserGetPayload<{ include: typeof personaInclude }>;

export type Scope = {
  persona: Persona;
  facilities: Persona["memberships"][number]["facility"][];
  activeFacility: Persona["memberships"][number]["facility"] | null;
  canManageInventory: boolean;
  canApproveTransfers: boolean;
  canRequestTransfers: boolean;
  canReceiveTransfers: boolean;
  isNetworkAuthority: boolean;
  home: string;
};

function personaById(id: string): Promise<Persona | null> {
  return prisma.user.findUnique({ where: { id }, include: personaInclude });
}

/**
 * Only a valid Auth.js session is accepted here. The database is re-read on
 * every request so suspension, a role change or a password change revokes the
 * JWT immediately via the session epoch.
 */
export const getSessionPersona = cache(async (): Promise<Persona | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await personaById(session.user.id);
  if (!user || user.status !== "ACTIVE") return null;
  if (user.sessionEpoch !== session.user.sessionEpoch) return null;
  return user;
});

/**
 * Demo-only fallback. The persona cookie is never consulted outside
 * APP_PROFILE=demo.
 */
async function getDemoPersona(): Promise<Persona> {
  const store = await cookies();
  const id = store.get(PERSONA_COOKIE)?.value;
  if (id) {
    const user = await personaById(id);
    if (user) return user;
  }

  const fallback = await prisma.user.findFirst({
    where: { role: "NETWORK_AUTHORITY" },
    include: personaInclude,
  });
  if (!fallback) throw new Error("No demo personas seeded. Run `npm run db:seed`.");
  return fallback;
}

export async function getPersona(): Promise<Persona> {
  const sessionPersona = await getSessionPersona();
  if (sessionPersona) return sessionPersona;
  if (APP_PROFILE === "demo" && !AUTH_REQUIRED) return getDemoPersona();
  redirect("/sign-in");
}

/**
 * API variant: never redirects. Returns null when the caller must send 401.
 */
export async function getApiPersona(): Promise<Persona | null> {
  const sessionPersona = await getSessionPersona();
  if (sessionPersona) return sessionPersona;
  if (APP_PROFILE === "demo" && !AUTH_REQUIRED) return getDemoPersona();
  return null;
}

async function buildScope(persona: Persona): Promise<Scope> {
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
    canManageInventory: can(persona.role, "inventory:write"),
    canApproveTransfers: can(persona.role, "transfer:approve"),
    canRequestTransfers: can(persona.role, "transfer:request"),
    canReceiveTransfers: can(persona.role, "transfer:receive"),
    isNetworkAuthority,
    home: homeFor({ role: persona.role, facilityId: activeFacility?.id }),
  };
}

export async function getScope(): Promise<Scope> {
  return buildScope(await getPersona());
}

/**
 * API variant: returns null instead of redirecting when there is no session.
 */
export async function getApiScope(): Promise<Scope | null> {
  const persona = await getApiPersona();
  return persona ? buildScope(persona) : null;
}

export function canAccessFacility(
  persona: Persona,
  facilityId: string,
): boolean {
  if (persona.role === "NETWORK_AUTHORITY") return true;
  return persona.memberships.some((m) => m.facilityId === facilityId);
}
