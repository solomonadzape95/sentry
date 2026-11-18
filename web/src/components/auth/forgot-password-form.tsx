"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/auth/form-parts";
import {
  requestPasswordResetAction,
  type FormState,
} from "@/app/(auth)/actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(
    requestPasswordResetAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <Field label="Email address" hint="We will send a reset link if the account exists.">
        <input
          className={inputClass}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@facility.health"
          required
        />
      </Field>
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
