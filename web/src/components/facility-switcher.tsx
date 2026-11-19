"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FacilitySwitcher({
  facilities,
  currentId,
  className,
}: {
  facilities: { id: string; shortName: string }[];
  currentId: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function choose(id: string) {
    setBusy(true);
    await fetch("/api/facility", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ facilityId: id }),
    });
    startTransition(() => router.refresh());
    setBusy(false);
  }

  return (
    <label
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel pl-3 pr-2.5 text-[10px] font-medium text-ink",
        className,
      )}
    >
      <Building2 className="h-3.5 w-3.5 text-body" />
      <select
        value={currentId ?? ""}
        onChange={(e) => choose(e.target.value)}
        className="max-w-[190px] cursor-pointer appearance-none bg-transparent pr-1 text-[10px] font-medium outline-none"
        aria-label="Active facility"
      >
        {facilities.map((f) => (
          <option key={f.id} value={f.id}>
            {f.shortName}
          </option>
        ))}
      </select>
      {busy || pending ? <Loader2 className="h-3 w-3 animate-spin text-muted" /> : null}
    </label>
  );
}
