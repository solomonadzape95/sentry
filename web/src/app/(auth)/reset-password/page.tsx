import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionPersona } from "@/lib/session";
import { hashToken } from "@/lib/tokens";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await getSessionPersona();
  if (session) redirect("/account");

  const { token } = await searchParams;
  const record = token
    ? await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      })
    : null;
  const valid = Boolean(record && !record.usedAt && record.expiresAt > new Date());

  if (!valid) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="This link has expired."
        description="Password reset links can only be used once, and they expire after one hour."
        footer={
          <>
            <Link href="/forgot-password" className="font-medium text-brand hover:underline">
              Request a new reset link
            </Link>{" "}
            or{" "}
            <Link href="/sign-in" className="font-medium text-brand hover:underline">
              return to sign in
            </Link>
            .
          </>
        }
      >
        <div className="rounded-xl border border-line bg-canvas/50 px-4 py-5 text-[12px] leading-relaxed text-muted">
          For security, we cannot reuse an expired link. Request a fresh one and check
          the inbox for the account.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password."
      description={`Set a new password for ${record?.user.email ?? "your account"}. This will sign out every other device.`}
      footer={
        <>
          <Link href="/sign-in" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ResetPasswordForm token={token as string} />
    </AuthShell>
  );
}
