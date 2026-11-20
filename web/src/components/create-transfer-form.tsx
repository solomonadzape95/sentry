"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { WingSpinner } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

export function CreateTransferForm({
  fromFacilityId,
  toFacilityId,
  medicineId,
  quantity,
  unit,
  batchId,
  reason,
  canRequest,
  blockedReason,
}: {
  fromFacilityId: string;
  toFacilityId: string;
  medicineId: string;
  quantity: number;
  unit: string;
  batchId?: string | null;
  reason: string;
  canRequest: boolean;
  blockedReason?: string;
}) {
  const [qty, setQty] = useState(String(quantity));
  const [note, setNote] = useState(reason);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromFacilityId,
          toFacilityId,
          medicineId,
          batchId: batchId || null,
          quantity: Number(qty),
          reason: note,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create transfer");
      toast.success("Transfer request created");
      startTransition(() => {
        router.push("/transfers#pipeline");
        router.refresh();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create transfer";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  if (!canRequest) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-2 text-[11px] leading-relaxed text-muted">
        {blockedReason ??
          "The facility that needs the stock raises the request. You approve and dispatch once it arrives."}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <Field label={`Quantity (${unit}s)`}>
          <input
            className={inputClass}
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            required
          />
        </Field>
        <Field label="Reason / note">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-[11px] font-medium text-danger">{error}</p>
      ) : null}
      <Button type="submit" size="md" disabled={busy || !qty} className="w-full">
        {busy ? <WingSpinner size="sm" label="Requesting transfer" /> : <ArrowRight className="h-4 w-4" />}
        Request this transfer
      </Button>
      <p className="text-center text-[9px] text-muted">
        Sends the request to the releasing facility. Stock moves only after they approve and dispatch.
      </p>
    </form>
  );
}
