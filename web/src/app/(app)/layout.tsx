import { AppShell } from "@/components/app-shell";
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

  return (
    <AppShell
      persona={{
        id: scope.persona.id,
        name: scope.persona.name,
        title: scope.persona.title,
        role: scope.persona.role,
      }}
      personas={personas}
      alertCount={data.alerts.filter((a) => a.severity !== "LOW").length}
    >
      {children}
    </AppShell>
  );
}
