import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { APP_PROFILE } from "@/lib/config";
import { getSessionPersona } from "@/lib/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

const notices: Record<string, string> = {
  reset: "Your password has been reset. Sign in with your new password.",
  changed: "Your password has been changed. Sign in again on this device.",
  invited: "Your account is ready. Sign in to continue.",
  revoked: "All sessions have been signed out.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    reset?: string;
    changed?: string;
    invited?: string;
    revoked?: string;
    error?: string;
  }>;
}) {
  const session = await getSessionPersona();
  if (session) redirect("/home");

  const params = await searchParams;
  const demo = APP_PROFILE === "demo";
  const demoAccounts = demo
    ? await prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { name: true, email: true, role: true, title: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      })
    : [];
  const demoPassword = demo
    ? (process.env.DEMO_PASSWORD ?? "sentry-demo-2026")
    : undefined;

  const errorNotice = params.error
    ? "We could not complete that sign-in. Check your details and try again."
    : null;
  const notice = errorNotice
    ? null
    : Object.entries(notices).find(([key]) => params[key as keyof typeof params])?.[1];

  return (
    <AuthShell
      eyebrow="Secure access"
      title="Sign in to Sentry."
      description="Use the account issued by your network administrator. Access is scoped to the facilities you are assigned to."
      footer={
        <>
          Trouble signing in?{" "}
          <Link href="/forgot-password" className="font-medium text-brand hover:underline">
            Reset your password
          </Link>
          .
        </>
      }
    >
      {errorNotice ? (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger-soft/60 px-3 py-2.5 text-[12px] leading-relaxed text-danger">
          {errorNotice}
        </div>
      ) : notice ? (
        <div className="mb-4 rounded-lg border border-ok/20 bg-ok-soft/60 px-3 py-2.5 text-[12px] leading-relaxed text-ok">
          {notice}
        </div>
      ) : null}
      <SignInForm
        next={params.next ?? "/home"}
        demoAccounts={demoAccounts}
        demoPassword={demoPassword}
      />
    </AuthShell>
  );
}
