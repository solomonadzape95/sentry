import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MailPlus, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/config";
import { formatDate, formatDateTime } from "@/lib/format";
import { getAdminData } from "@/lib/queries";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { CreateInviteForm } from "@/components/auth/create-invite-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users & access" };

export default async function AdminUsersPage() {
  const scope = await getScope();
  if (!scope.isNetworkAuthority) redirect(scope.home);

  const [data, invitations] = await Promise.all([
    getAdminData(),
    prisma.invitation.findMany({
      include: { facility: true, invitedBy: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const active = data.users.filter((user) => user.status === "ACTIVE").length;
  const suspended = data.users.filter((user) => user.status === "SUSPENDED").length;
  const pendingInvites = invitations.filter(
    (invite) => !invite.acceptedAt && !invite.revokedAt && invite.expiresAt > new Date(),
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            Administration · access control
          </>
        }
        title="Users & access"
        description="Invite staff, review facility scope and suspend access. Accounts are invite-only."
        actions={
          <Link href="/admin" className={buttonClass({ variant: "secondary", size: "sm" })}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Administration
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Active accounts" value={active} sub="Can sign in today" icon={<UserCheck className="h-4 w-4" />} />
        <Stat label="Pending invitations" value={pendingInvites} sub="Not yet accepted" icon={<MailPlus className="h-4 w-4" />} tone={pendingInvites > 0 ? "warning" : "default"} />
        <Stat label="Suspended" value={suspended} sub="Denied at sign-in" icon={<UserX className="h-4 w-4" />} tone={suspended > 0 ? "danger" : "default"} />
        <Stat label="Facilities" value={data.facilities.length} sub="In the demonstration network" icon={<Users className="h-4 w-4" />} />
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Invite a user"
          subtitle="The invitation is single-use and expires after seven days."
          icon={<MailPlus className="h-4 w-4" />}
        />
        <CardBody>
          <CreateInviteForm
            facilities={data.facilities.map((facility) => ({
              id: facility.id,
              name: facility.name,
            }))}
          />
        </CardBody>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <Card>
          <CardHeader title="Accounts" subtitle="Everyone who can access the network" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-2.5 font-medium">Person</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">Facility scope</th>
                  <th className="px-3 py-2.5 font-medium">Last sign-in</th>
                  <th className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.name} className="h-7 w-7" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{user.name}</p>
                          <p className="truncate text-[10px] text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={user.role === "NETWORK_AUTHORITY" ? "brand" : user.role === "SUPPLIER" ? "info" : "neutral"}>
                        {ROLE_LABEL[user.role] ?? user.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {user.memberships.map((membership) => membership.facility.shortName).join(", ") ||
                        "Network / supplier"}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge tone={user.status === "ACTIVE" ? "success" : user.status === "INVITED" ? "warning" : "danger"}>
                        {user.status.toLowerCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Invitations" subtitle="Recent invitations and their state" />
          <div className="divide-y divide-line">
            {invitations.map((invite) => {
              const revoked = Boolean(invite.revokedAt);
              const expired = !invite.acceptedAt && invite.expiresAt <= new Date();
              return (
                <div key={invite.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-ink">{invite.email}</p>
                      <p className="truncate text-[10px] text-muted">
                        {ROLE_LABEL[invite.role] ?? invite.role}
                        {invite.facility ? ` · ${invite.facility.shortName}` : ""}
                      </p>
                    </div>
                    <Badge
                      tone={
                        invite.acceptedAt
                          ? "success"
                          : revoked || expired
                            ? "danger"
                            : "warning"
                      }
                    >
                      {invite.acceptedAt
                        ? "accepted"
                        : revoked
                          ? "revoked"
                          : expired
                            ? "expired"
                            : "pending"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[9px] text-muted">
                    Invited {formatDate(invite.createdAt)}
                    {invite.invitedBy ? ` by ${invite.invitedBy.name}` : ""}
                  </p>
                </div>
              );
            })}
            {invitations.length === 0 ? (
              <div className="px-5 py-6 text-[11px] text-muted">
                No invitations yet. Invite the first facility user above.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
