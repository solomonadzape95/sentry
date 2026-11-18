"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/auth/form-parts";
import { resetPasswordAction, type FormState } from "@/app/(auth)/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    resetPasswordAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <input type="hidden" name="token" value={token} />

      <Field label="New password" hint="At least 10 characters, with a letter and a number.">
        <input
          className={inputClass}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          required
        />
      </Field>
      <Field label="Confirm new password">
        <input
          className={inputClass}
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          required
        />
      </Field>

      <SubmitButton pendingLabel="Updating…">Set new password</SubmitButton>
    </form>
  );
}
