import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionPersona } from "@/lib/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  const session = await getSessionPersona();
  if (session) redirect("/account");

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password."
      description="Enter the email address on your account. If it exists, we will send a link that expires in one hour."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/sign-in" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
          .
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
