import {
  canAccessFacility,
  getApiPersona,
  type Persona,
} from "@/lib/session";
import { can, type Capability } from "@/lib/authz";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function apiOk<T>(data: T, meta: Record<string, unknown> = {}) {
  return Response.json({
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      ...meta,
    },
  });
}

export function parseLimit(value: string | null, fallback = 200, max = 1000) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type Authorised = { ok: true; persona: Persona } | { ok: false; response: Response };

async function requireCapability(
  facilityId: string | null,
  capability: Capability,
): Promise<Authorised> {
  const persona = await getApiPersona();
  if (!persona) {
    return { ok: false, response: jsonError("Sign in to continue", 401) };
  }
  if (facilityId && !canAccessFacility(persona, facilityId)) {
    return {
      ok: false,
      response: jsonError("You do not have access to this facility", 403),
    };
  }
  if (!can(persona.role, capability)) {
    return {
      ok: false,
      response: jsonError("Your role cannot perform this action", 403),
    };
  }
  return { ok: true, persona };
}

export function requireFacilityAccess(facilityId: string): Promise<Authorised> {
  return requireCapability(facilityId, "inventory:write");
}

export function requireApprover(facilityId: string): Promise<Authorised> {
  return requireCapability(facilityId, "transfer:approve");
}

export function requireReceiver(facilityId: string): Promise<Authorised> {
  return requireCapability(facilityId, "transfer:receive");
}

export async function requireNetworkAuthority(): Promise<Authorised> {
  return requireCapability(null, "network:view");
}
