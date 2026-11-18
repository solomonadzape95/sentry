import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { APP_PROFILE, AUTH_REQUIRED } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getNetworkData } from "@/lib/queries";
import { getScope } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [scope, personas, data] = await Promise.all([
    getScope(),
    prisma.user.findMany({
      select: { id: true, name: true, title: true, role: true },
      where: { role: { not: "SUPPLIER" } },
      orderBy: { name: "asc" },
    }),
    getNetworkData(),
  ]);

  if (scope.persona.role === "SUPPLIER") redirect("/supplier");

  return (
    <AppShell
      persona={{
        id: scope.persona.id,
        name: scope.persona.name,
        title: scope.persona.title,
        role: scope.persona.role,
      }}
      personas={personas}
      alertCount={
        data.alerts.filter(
          (a) =>
            a.severity !== "LOW" &&
            (scope.isNetworkAuthority || scope.facilities.some((f) => f.id === a.facilityId)),
        ).length
      }
      facilityCount={scope.facilities.length}
      demo={APP_PROFILE === "demo"}
      showPersonaSwitcher={!AUTH_REQUIRED}
    >
      {children}
    </AppShell>
  );
}
