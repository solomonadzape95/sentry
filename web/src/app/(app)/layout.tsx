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

  const alertCount = data.alerts.filter(
    (a) =>
      a.severity !== "LOW" &&
      (scope.isNetworkAuthority || scope.facilities.some((f) => f.id === a.facilityId)),
  ).length;

  const alertHref = scope.isNetworkAuthority
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
      alertCount={alertCount}
      facilityCount={scope.facilities.length}
      demo={APP_PROFILE === "demo"}
      initialCollapsed={store.get("sentry_sidebar")?.value === "1"}
      activeFacility={
        scope.activeFacility
          ? { id: scope.activeFacility.id, shortName: scope.activeFacility.shortName }
          : null
      }
      alertHref={alertHref}
    >
      {children}
    </AppShell>
  );
}
