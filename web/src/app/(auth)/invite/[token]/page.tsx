import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FACILITY_TYPE_LABEL, ROLE_LABEL } from "@/lib/config";
import { getSessionPersona } from "@/lib/session";
import { hashToken } from "@/lib/tokens";
import { AuthShell } from "@/components/auth/auth-shell";
import { InviteForm } from "@/components/auth/invite-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accept invitation" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await getSessionPersona();
  if (session) redirect("/home");

  const { token } = await params;
  const invite = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { facility: true },
  });
  const valid = Boolean(
    invite && !invite.acceptedAt && !invite.revokedAt && invite.expiresAt > new Date(),
  );
  const existing = invite
    ? await prisma.user.findUnique({ where: { email: invite.email } })
    : null;

  if (!valid || existing) {
    return (
      <AuthShell
        eyebrow="Invitation"
        title={existing ? "An account already exists." : "This invitation has expired."}
        description={
          existing
            ? "This email already has a Sentry account. Sign in instead, or ask your administrator to resend the invitation."
            : "Invitations expire after seven days and can only be accepted once."
        }
        footer={
          <>
            <Link href="/sign-in" className="font-medium text-brand hover:underline">
              Go to sign in
            </Link>
          </>
        }
      >
        <div className="rounded-xl border border-line bg-canvas/50 px-4 py-5 text-[12px] leading-relaxed text-muted">
          If you believe this is a mistake, contact the network administrator who invited
          you.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Invitation"
      title={`Join ${invite?.facility?.shortName ?? "the network"}.`}
      description={
        <>
          <span className="font-medium text-ink">{invite?.name}</span>, you have been
          invited as{" "}
          <span className="font-medium text-ink">
            {ROLE_LABEL[invite?.role ?? ""] ?? invite?.role}
          </span>
          {invite?.facility ? (
            <>
              {" "}
              at {invite.facility.name} ({FACILITY_TYPE_LABEL[invite.facility.type] ?? invite.facility.type})
            </>
          ) : null}
          . Create a password to activate the account.
        </>
      }
      footer={
        <>
          Already activated?{" "}
          <Link href="/sign-in" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
          .
        </>
      }
    >
      <InviteForm
        token={token}
        defaultName={invite?.name ?? ""}
        email={invite?.email ?? ""}
      />
    </AuthShell>
  );
}
