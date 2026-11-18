"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { ROLE_LABEL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

type PersonaOption = {
  id: string;
  name: string;
  title: string;
  role: string;
};

export function PersonaSwitcher({
  personas,
  currentId,
  variant = "dark",
}: {
  personas: PersonaOption[];
  currentId: string;
  variant?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const current = personas.find((p) => p.id === currentId) ?? personas[0];

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function choose(id: string) {
    setBusy(true);
    setOpen(false);
    await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    startTransition(() => router.refresh());
    setBusy(false);
  }

  const dark = variant === "dark";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors",
          dark ? "hover:bg-white/5" : "border border-line bg-surface hover:bg-canvas",
        )}
      >
        <Avatar name={current?.name ?? "User"} tone={dark ? "dark" : "brand"} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-xs font-semibold", dark ? "text-white" : "text-ink")}>
            {current?.name}
          </span>
          <span className={cn("block truncate text-[10px]", dark ? "text-white/45" : "text-muted")}>
            {current ? ROLE_LABEL[current.role] ?? current.role : "Demo persona"}
          </span>
        </span>
        {busy || pending ? (
          <Loader2 className={cn("h-3.5 w-3.5 animate-spin", dark ? "text-white/50" : "text-muted")} />
        ) : (
          <ChevronsUpDown className={cn("h-3.5 w-3.5", dark ? "text-white/40" : "text-muted")} />
        )}
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[260px] overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-ink/10">
          <p className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
            Switch demo persona
          </p>
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => choose(persona.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-canvas"
            >
              <Avatar name={persona.name} tone="brand" className="h-7 w-7" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-ink">{persona.name}</span>
                <span className="block truncate text-[10px] text-muted">
                  {ROLE_LABEL[persona.role] ?? persona.role} · {persona.title}
                </span>
              </span>
              {persona.id === currentId ? <Check className="h-3.5 w-3.5 text-brand" /> : null}
            </button>
          ))}
          <p className="border-t border-line px-2.5 pb-0.5 pt-2 text-[10px] leading-relaxed text-muted">
            Demo-only persona switching. Production uses Auth.js sign-in and
            invite-only accounts.
          </p>
        </div>
      ) : null}
    </div>
  );
}
