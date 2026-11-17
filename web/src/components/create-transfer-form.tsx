"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
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
  canApprove,
}: {
  fromFacilityId: string;
  toFacilityId: string;
  medicineId: string;
  quantity: number;
  unit: string;
  batchId?: string | null;
  reason: string;
  canApprove: boolean;
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
      startTransition(() => {
        router.push("/transfers#pipeline");
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create transfer");
    } finally {
      setBusy(false);
    }
  }

  if (!canApprove) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-2 text-[11px] text-muted">
        Your persona can view this recommendation but not create transfers. Switch to the network
        authority or a facility manager.
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
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Create transfer request
      </Button>
      <p className="text-center text-[9px] text-muted">
        Creates a pending request. Stock moves only after approval and receipt.
      </p>
    </form>
  );
}
