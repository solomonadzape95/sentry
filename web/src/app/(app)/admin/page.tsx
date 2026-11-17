import {
  Building2,
  ClipboardList,
  Database,
  Lock,
  Package,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { DEMO_TODAY, FACILITY_TYPE_LABEL, ROLE_LABEL } from "@/lib/config";
import { formatDate, formatNumber } from "@/lib/format";
import { getAdminData } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Avatar } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const scope = await getScope();
  if (!scope.isNetworkAuthority) redirect("/");
  const [data, movementCount] = await Promise.all([
    getAdminData(),
    prisma.stockMovement.count(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <ShieldCheck className="h-3.5 w-3.5" /> Administration · {formatDate(DEMO_TODAY)}
          </>
        }
        title="Governance & administration"
        description="Facilities, staff roles, catalogue and the access rules that keep facility inventory isolated."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Facilities" value={data.facilities.length} sub="FCT demonstration network" icon={<Building2 className="h-4 w-4" />} />
        <Stat label="Staff accounts" value={data.users.length} sub={`${data.users.filter((u) => u.role === "NETWORK_AUTHORITY").length} network authority`} icon={<Users className="h-4 w-4" />} />
        <Stat label="Catalogue lines" value={data.medicines.length} sub="Essential medicines" icon={<Package className="h-4 w-4" />} />
        <Stat label="Ledger events" value={formatNumber(movementCount)} sub="Stock movements and transfer actions" icon={<ClipboardList className="h-4 w-4" />} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Facilities" subtitle="Registered sites and their operating model" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-2.5 font-medium">Facility</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">LGA</th>
                  <th className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.facilities.map((f) => (
                  <tr key={f.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-ink">{f.shortName}</p>
                      <p className="text-[10px] text-muted">{f.contactName}</p>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{FACILITY_TYPE_LABEL[f.type] ?? f.type}</td>
                    <td className="px-3 py-2.5 text-muted">{f.lga}</td>
                    <td className="px-5 py-2.5 text-right">
                      <Badge tone="success">{f.status.toLowerCase()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Staff & roles" subtitle="Personas available in the demo switcher" />
          <div className="divide-y divide-line">
            {data.users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={u.name} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-ink">{u.name}</p>
                  <p className="truncate text-[10px] text-muted">
                    {u.title} · {u.memberships.map((m) => m.facility.shortName).join(", ") || "Network / supplier"}
                  </p>
                </div>
                <Badge tone={u.role === "NETWORK_AUTHORITY" ? "brand" : u.role === "SUPPLIER" ? "info" : "neutral"}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <Card>
          <CardHeader title="Medicine catalogue" subtitle="Essential medicines tracked across the network" action={<Badge tone="brand">{data.medicines.length} lines</Badge>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-2.5 font-medium">Medicine</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Pack</th>
                  <th className="px-3 py-2.5 font-medium">Lead time</th>
                  <th className="px-5 py-2.5 text-right font-medium">Barcode</th>
                </tr>
              </thead>
              <tbody>
                {data.medicines.map((m) => (
                  <tr key={m.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-ink">{m.genericName}</p>
                      <p className="text-[10px] text-muted">{m.strength}</p>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{m.category.replaceAll("_", " ").toLowerCase()}</td>
                    <td className="tabular px-3 py-2.5 text-muted">{m.packSize} {m.unit}s</td>
                    <td className="tabular px-3 py-2.5 text-muted">{m.leadTimeDays}d</td>
                    <td className="px-5 py-2.5 text-right font-mono text-[10px] text-muted">{m.barcode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Permission model" icon={<Lock className="h-4 w-4" />} />
            <CardBody className="space-y-2.5 text-[11px] text-muted">
              <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> Users only access facilities they are authorised to manage.</p>
              <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> Facility inventory stays private unless explicitly shared.</p>
              <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> Health authorities see aggregated network information.</p>
              <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> Transfers require manager or network-authority approval.</p>
              <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> Suppliers see only relevant orders and shared availability.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Data governance" icon={<Database className="h-4 w-4" />} />
            <CardBody className="space-y-2.5 text-[11px] leading-relaxed text-muted">
              <p><span className="font-medium text-ink">No patient-identifiable data</span> is collected in this MVP.</p>
              <p><span className="font-medium text-ink">Audit trail</span> records every stock movement, transfer and approval.</p>
              <p><span className="font-medium text-ink">RLS-ready schema.</span> The hackathon uses SQLite for portability; production moves to Supabase Postgres with row-level security.</p>
              <p><span className="font-medium text-ink">Secrets.</span> External credentials stay server-side; no API keys are exposed to the client.</p>
              <p className="rounded-lg bg-warn-soft/70 px-3 py-2 text-[10px] text-warn">
                Demo personas are not authentication. Replace with Supabase Auth, MFA for approvers and per-facility RLS before a pilot.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Suppliers" icon={<Truck className="h-4 w-4" />} />
            <div className="divide-y divide-line">
              {data.suppliers.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div>
                    <p className="text-[11px] font-medium text-ink">{s.name}</p>
                    <p className="text-[10px] text-muted">{s.type.replaceAll("_", " ").toLowerCase()} · {s.leadTimeDays}-day lead time</p>
                  </div>
                  <Badge tone="neutral">{s.phone}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
