"use client";

import { useActionState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/auth/form-parts";
import { acceptInviteAction, type FormState } from "@/app/(auth)/actions";

export function InviteForm({
  token,
  defaultName,
  email,
}: {
  token: string;
  defaultName: string;
  email: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    acceptInviteAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <input type="hidden" name="token" value={token} />

      <Field label="Email address">
        <input className={`${inputClass} bg-canvas/60`} value={email} readOnly />
      </Field>
      <Field label="Full name">
        <input
          className={inputClass}
          name="name"
          autoComplete="name"
          defaultValue={defaultName}
          required
        />
      </Field>
      <Field label="Create password" hint="At least 10 characters, with a letter and a number.">
        <input
          className={inputClass}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          required
        />
      </Field>
      <Field label="Confirm password">
        <input
          className={inputClass}
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          required
        />
      </Field>

      <SubmitButton pendingLabel="Joining…">Accept invitation</SubmitButton>
    </form>
  );
}
