import { getPersona, canAccessFacility, type Persona } from "@/lib/session";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function requireFacilityAccess(facilityId: string): Promise<
  { ok: true; persona: Persona } | { ok: false; response: Response }
> {
  const persona = await getPersona();
  if (!canAccessFacility(persona, facilityId)) {
    return { ok: false, response: jsonError("You do not have access to this facility", 403) };
  }
  if (persona.role === "SUPPLIER") {
    return { ok: false, response: jsonError("Suppliers cannot modify facility inventory", 403) };
  }
  return { ok: true, persona };
}

export async function requireApprover(facilityId: string): Promise<
  { ok: true; persona: Persona } | { ok: false; response: Response }
> {
  const persona = await getPersona();
  if (!canAccessFacility(persona, facilityId)) {
    return { ok: false, response: jsonError("You do not have access to this facility", 403) };
  }
  if (persona.role !== "NETWORK_AUTHORITY" && persona.role !== "FACILITY_MANAGER") {
    return { ok: false, response: jsonError("Approval requires a manager or network authority", 403) };
  }
  return { ok: true, persona };
}
