import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { APP_PROFILE } from "@/lib/config";
import { getNetworkData } from "@/lib/queries";
import { getScope } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [scope, data, store] = await Promise.all([
    getScope(),
    getNetworkData(),
    cookies(),
  ]);

  if (scope.persona.role === "SUPPLIER") redirect("/supplier");

  const scopedAlerts = data.alerts.filter(
    (alert) =>
      alert.severity !== "LOW" &&
      (scope.isNetworkAuthority ||
        scope.facilities.some((facility) => facility.id === alert.facilityId)),
  );

  const notifications = scopedAlerts.slice(0, 8).map((alert) => ({
    id: alert.id,
    severity: alert.severity,
    title: alert.message,
    detail: alert.detail,
    facilityName: alert.facilityName,
    medicineName: alert.medicineName,
    date: alert.date,
    href:
      alert.type === "STOCKOUT_RISK"
        ? `/forecasts?facility=${alert.facilityId}&medicine=${alert.medicineId}`
        : alert.type === "EXPIRY"
          ? `/inventory?facility=${alert.facilityId}&tab=expiry`
          : "/transfers",
  }));

  const notificationViewAllHref = scope.isNetworkAuthority
    ? "/dashboard#risk"
    : scope.activeFacility
      ? `/facilities/${scope.activeFacility.id}#risk`
      : "/today#risk";

  return (
    <AppShell
      persona={{
        id: scope.persona.id,
        name: scope.persona.name,
        title: scope.persona.title,
        role: scope.persona.role,
      }}
      alertCount={scopedAlerts.length}
      facilityCount={scope.facilities.length}
      demo={APP_PROFILE === "demo"}
      initialCollapsed={store.get("sentry_sidebar")?.value === "1"}
      activeFacility={
        scope.activeFacility
          ? { id: scope.activeFacility.id, shortName: scope.activeFacility.shortName }
          : null
      }
      notifications={notifications}
      notificationViewAllHref={notificationViewAllHref}
    >
      {children}
    </AppShell>
  );
}
