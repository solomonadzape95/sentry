import demoMeta from "@/data/demo-meta.json";

export const APP_NAME = "Sentry";
export const APP_TAGLINE = "See the shortage before it happens";
export const APP_DESCRIPTION =
  "Sentry forecasts medicine demand, prevents stockouts and coordinates redistribution across Nigerian health facilities.";

/**
 * The demo dataset is anchored to 17 Nov 2026. Keeping a fixed clock means the
 * pitch is stable regardless of the day it is presented.
 *
 * `APP_PROFILE=live` switches reads to the real clock. `APP_TODAY` can pin a
 * different demo date without editing code. Mutations should use `appNow()` so
 * the write timestamp matches the read clock.
 */
export const APP_PROFILE = process.env.APP_PROFILE ?? "demo";

const PINNED_TODAY = process.env.APP_TODAY
  ? new Date(process.env.APP_TODAY)
  : new Date("2026-11-17T00:00:00.000Z");
export const DEMO_TODAY = APP_PROFILE === "live" ? new Date() : PINNED_TODAY;

export function appNow(): Date {
  if (APP_PROFILE === "live") return new Date();
  const now = new Date();
  return new Date(
    Date.UTC(
      PINNED_TODAY.getUTCFullYear(),
      PINNED_TODAY.getUTCMonth(),
      PINNED_TODAY.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
    ),
  );
}

export const DEMO_HORIZON_DAYS = 30;
export const DEMO_META = demoMeta;

export const FACILITY_TYPE_LABEL: Record<string, string> = {
  PHC: "Primary health centre",
  GENERAL: "General hospital",
  PRIVATE: "Private hospital",
  PHARMACY: "Community pharmacy",
};

export const ROLE_LABEL: Record<string, string> = {
  INVENTORY_OFFICER: "Inventory operator",
  FACILITY_MANAGER: "Facility manager",
  NETWORK_AUTHORITY: "Network authority",
  SUPPLIER: "Supplier",
};

export const CATEGORY_LABEL: Record<string, string> = {
  ANTIMALARIAL: "Antimalarial",
  ANTIBIOTIC: "Antibiotic",
  ANALGESIC: "Analgesic",
  ORS: "ORS / rehydration",
  CHRONIC: "Chronic care",
  RESPIRATORY: "Respiratory",
  OTHER: "Essential",
};

export const DISEASE_LABEL: Record<string, string> = {
  MALARIA: "Malaria",
  CHOLERA: "Cholera",
  RESPIRATORY: "Respiratory infections",
  MENINGITIS: "Meningitis",
  LASSA_FEVER: "Lassa fever",
};

export const RISK_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export const TRANSFER_STATUS_LABEL: Record<string, string> = {
  RECOMMENDED: "Recommended",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  IN_TRANSIT: "In transit",
  COMPLETED: "Received",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const NAV_SECTIONS = [
  {
    label: "Network",
    items: [
      { href: "/today", label: "Today", icon: "today" },
      { href: "/dashboard", label: "Overview", icon: "network" },
      { href: "/facilities", label: "Facilities", icon: "building" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", icon: "package" },
      { href: "/forecasts", label: "Forecasts", icon: "trend" },
      { href: "/transfers", label: "Transfers", icon: "shuffle" },
    ],
  },
  {
    label: "Assurance",
    items: [
      { href: "/model", label: "Model performance", icon: "activity" },
      { href: "/data", label: "Data provenance", icon: "database" },
    ],
  },
  {
    label: "Admin",
    items: [{ href: "/admin", label: "Administration", icon: "settings" }],
  },
] as const;
