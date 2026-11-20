export const ROLES = [
  "INVENTORY_OFFICER",
  "FACILITY_MANAGER",
  "NETWORK_AUTHORITY",
  "SUPPLIER",
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export type Capability =
  | "inventory:write"
  | "transfer:request"
  | "transfer:approve"
  | "transfer:receive"
  | "facility:view"
  | "network:view"
  | "admin:manage"
  | "data:view"
  | "model:view"
  | "supplier:view"
  | "account:manage";

const CAPABILITIES: Record<Role, readonly Capability[]> = {
  INVENTORY_OFFICER: [
    "inventory:write",
    // A facility that needs stock raises the request; the donor approves the
    // dispatch. Receipt confirmation stays with the receiving facility.
    "transfer:request",
    "transfer:receive",
    "facility:view",
    "account:manage",
  ],
  FACILITY_MANAGER: [
    "inventory:write",
    "transfer:request",
    "transfer:approve",
    "transfer:receive",
    "facility:view",
    "account:manage",
  ],
  NETWORK_AUTHORITY: [
    "inventory:write",
    "transfer:request",
    "transfer:approve",
    "transfer:receive",
    "facility:view",
    "network:view",
    "admin:manage",
    "data:view",
    "model:view",
    "account:manage",
  ],
  SUPPLIER: ["supplier:view", "account:manage"],
};

export function capabilitiesFor(role: string): ReadonlySet<Capability> {
  return new Set(isRole(role) ? CAPABILITIES[role] : []);
}

export function can(role: string, capability: Capability): boolean {
  return capabilitiesFor(role).has(capability);
}

export function homeFor(scope: {
  role: string;
  facilityId?: string | null;
}): string {
  if (scope.role === "SUPPLIER") return "/supplier";
  if (scope.role === "NETWORK_AUTHORITY") return "/dashboard";
  if (scope.role === "INVENTORY_OFFICER") return "/today";
  if (scope.role === "FACILITY_MANAGER" && scope.facilityId) {
    return `/facilities/${scope.facilityId}`;
  }
  return scope.facilityId ? `/facilities/${scope.facilityId}` : "/inventory";
}

/**
 * Navigation is keyed by capability so it cannot drift from the API guards.
 */
export const NAV_CAPABILITY: Record<string, Capability> = {
  "/today": "inventory:write",
  "/dashboard": "network:view",
  "/facilities": "network:view",
  "/inventory": "inventory:write",
  "/forecasts": "facility:view",
  "/transfers": "facility:view",
  "/model": "model:view",
  "/data": "data:view",
  "/admin": "admin:manage",
  "/account": "account:manage",
};

export function canSeeNav(role: string, href: string): boolean {
  const required = NAV_CAPABILITY[href];
  return required ? can(role, required) : false;
}
