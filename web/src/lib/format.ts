import { DEMO_TODAY } from "@/lib/config";

const DAY = 86_400_000;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfUtcDay(a).getTime() - startOfUtcDay(b).getTime()) / DAY);
}

export function daysFromDemo(date: Date): number {
  return daysBetween(date, DEMO_TODAY);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export function formatDayMonth(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatNaira(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `₦${formatNumber(value / 1_000_000, 1)}m`;
  if (Math.abs(value) >= 1_000) return `₦${formatNumber(value / 1_000, 0)}k`;
  return `₦${formatNumber(value, 0)}`;
}

export function formatPct(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return "60+ days";
  if (days <= 0) return "Out of stock";
  if (days < 1) return "< 1 day";
  if (days < 2) return "1 day";
  return `${Math.floor(days)} days`;
}

export function relativeToDemo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const n = daysFromDemo(d);
  if (n === 0) return "today";
  if (n > 0) return `in ${n} day${n === 1 ? "" : "s"}`;
  return `${Math.abs(n)} day${Math.abs(n) === 1 ? "" : "s"} ago`;
}

export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
