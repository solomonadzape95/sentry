"use client";

import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { WingSpinner } from "@/components/ui/loader";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/app/(auth)/actions";

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass({ size: "lg", className: `w-full ${className ?? ""}` })}
    >
      {pending ? <WingSpinner size="sm" label="Working" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormFeedback({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <>
      {state.error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft/60 px-3 py-2.5 text-[12px] leading-relaxed text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}
      {state.message ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-ok/20 bg-ok-soft/60 px-3 py-2.5 text-[12px] leading-relaxed text-ok">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.message}</span>
        </div>
      ) : null}
      {state.devLink ? (
        <div className="mb-4 rounded-lg border border-dashed border-line bg-canvas/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          <p className="font-medium text-ink">Demo link</p>
          <a href={state.devLink} className="mt-1 block break-all font-mono text-[10px] text-brand hover:underline">
            {state.devLink}
          </a>
        </div>
      ) : null}
    </>
  );
}
