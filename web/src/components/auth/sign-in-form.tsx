"use client";

import { useActionState, useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import { ROLE_LABEL } from "@/lib/config";
import { Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { FormFeedback, SubmitButton } from "@/components/auth/form-parts";
import { signInAction, type FormState } from "@/app/(auth)/actions";

type DemoAccount = {
  name: string;
  email: string;
  role: string;
  title: string;
};

export function SignInForm({
  next,
  demoAccounts,
  demoPassword,
}: {
  next: string;
  demoAccounts: DemoAccount[];
  demoPassword?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(signInAction, undefined);
  const [email, setEmail] = useState(demoAccounts[0]?.email ?? "");
  const [password, setPassword] = useState(demoPassword ?? "");

  return (
    <div>
      <form action={action} className="space-y-4">
        <FormFeedback state={state} />
        <input type="hidden" name="next" value={next} />

        <Field label="Email address">
          <input
            className={inputClass}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@facility.health"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>

        <Field label="Password">
          <input
            className={inputClass}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>

      {demoAccounts.length > 0 && demoPassword ? (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-canvas/50 p-3.5">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-warn" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              Demo accounts
            </p>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
            Password for every demo account:{" "}
            <span className="font-mono font-medium text-ink">{demoPassword}</span>
          </p>
          <div className="mt-3 grid gap-1">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(demoPassword);
                }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-full px-2.5 py-1.5 text-left transition-colors hover:bg-panel",
                  email === account.email && "bg-panel",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-ink">
                    {account.name}
                  </span>
                  <span className="block truncate text-[10px] text-muted">
                    {ROLE_LABEL[account.role] ?? account.role} · {account.title}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
