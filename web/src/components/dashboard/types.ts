export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type LineForecast = {
  modelLabel: string;
  confidence: string;
  wape: number;
  points: {
    date: string;
    predicted: number;
    lower80: number;
    upper80: number;
  }[];
};

export type LineActual = {
  date: string;
  value: number;
};

export type DashboardLine = {
  key: string;
  facilityId: string;
  facilityName: string;
  facilityShortName: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  strength: string;
  category: string;
  unit: string;
  risk: RiskLevel;
  usable: number;
  avgDailyDemand: number;
  daysToStockout: number | null;
  stockoutDate: string | null;
  stockValue: number;
  inAtRisk: boolean;
  forecast: LineForecast | null;
  actuals: LineActual[];
};

export type NextMove = {
  medicineId: string;
  genericName: string;
  unit: string;
  quantity: number;
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  daysCoveredAfter: number | null;
  daysToStockout: number | null;
  expiryDate: string | null;
  batchNumber: string | null;
  batchId: string | null;
  urgency: RiskLevel;
};

export type TransferPipeline = {
  pending: number;
  inTransit: number;
  received: number;
  pendingUnits: number;
  inTransitUnits: number;
};
