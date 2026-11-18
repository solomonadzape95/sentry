import Link from "next/link";
import { KeyRound, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { ROLE_LABEL } from "@/lib/config";
import { formatDate, formatDateTime } from "@/lib/format";
import { getScope } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { revokeSessionsAction, signOutAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const scope = await getScope();
  const persona = scope.persona;

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            Account & security
          </>
        }
        title="Your account"
        description="Profile, facility scope and the controls that protect your access."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardBody className="flex flex-wrap items-center gap-4">
              <Avatar name={persona.name} className="h-14 w-14 text-base" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-medium tracking-[-0.02em] text-ink">{persona.name}</p>
                <p className="text-xs text-muted">{persona.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{ROLE_LABEL[persona.role] ?? persona.role}</Badge>
                  <Badge tone="neutral">{persona.title}</Badge>
                  {persona.status === "ACTIVE" ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="warning">{persona.status.toLowerCase()}</Badge>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Facility scope"
              subtitle="You can only see and act on these facilities."
              icon={<KeyRound className="h-4 w-4" />}
            />
            <div className="divide-y divide-line">
              {scope.facilities.length > 0 ? (
                scope.facilities.map((facility) => (
                  <div key={facility.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-ink">{facility.name}</p>
                      <p className="text-[10px] text-muted">
                        {facility.lga}, {facility.state}
                      </p>
                    </div>
                    <Link
                      href={`/facilities/${facility.id}`}
                      className="text-[11px] font-medium text-brand hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                ))
              ) : (
                <div className="px-5 py-4 text-[11px] text-muted">
                  No facility scope. Network and supplier accounts operate across the
                  network or their own orders.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Change password"
              subtitle="Changing your password signs out every other device."
              icon={<KeyRound className="h-4 w-4" />}
            />
            <CardBody>
              <ChangePasswordForm />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Session" subtitle="The account currently in use" />
            <CardBody className="space-y-3 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Signed in as</span>
                <span className="font-medium text-ink">{persona.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Last sign-in</span>
                <span className="text-ink">
                  {persona.lastLoginAt ? formatDateTime(persona.lastLoginAt) : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Account created</span>
                <span className="text-ink">{formatDate(persona.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Session length</span>
                <span className="text-ink">12 hours</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sign out" subtitle="End this session or every session" />
            <CardBody className="space-y-3">
              <form action={revokeSessionsAction}>
                <button type="submit" className={buttonClass({ variant: "secondary", className: "w-full" })}>
                  <ShieldCheck className="h-4 w-4" />
                  Sign out of all devices
                </button>
              </form>
              <form action={signOutAction}>
                <button type="submit" className={buttonClass({ variant: "danger", className: "w-full" })}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Mobile app" subtitle="Inventory operations on the ward" />
            <CardBody>
              <Link href="/m" className={buttonClass({ variant: "outline", className: "w-full" })}>
                <Smartphone className="h-4 w-4" />
                Open mobile shell
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
