"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/auth/form-parts";
import { changePasswordAction, type FormState } from "@/app/(auth)/actions";

export function ChangePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <Field label="Current password">
        <input
          className={inputClass}
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" hint="At least 10 characters.">
          <input
            className={inputClass}
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm new password">
          <input
            className={inputClass}
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>
      <SubmitButton className="sm:w-auto" pendingLabel="Updating…">
        Change password
      </SubmitButton>
    </form>
  );
}
