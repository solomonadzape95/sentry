import demoMeta from "@/data/demo-meta.json";

export const APP_NAME = "Aisec";
export const APP_TAGLINE = "Predictive medicine supply intelligence";
export const APP_DESCRIPTION =
  "Forecast medicine demand, prevent stockouts and coordinate redistribution across Nigerian health facilities.";

/**
 * The demo dataset is anchored to 17 Nov 2026. Keeping a fixed clock means the
 * pitch is stable regardless of the day it is presented. Replace with `new Date()`
 * for a live deployment.
 */
export const DEMO_TODAY = new Date("2026-11-17T00:00:00.000Z");
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
    label: "Command",
    items: [
      { href: "/dashboard", label: "Network overview", icon: "network" },
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
    label: "Intelligence",
    items: [
      { href: "/model", label: "Model performance", icon: "activity" },
      { href: "/admin", label: "Administration", icon: "settings" },
    ],
  },
] as const;
