"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRANSFER_STATUS_LABEL } from "@/lib/config";

export function TransferActions({
  id,
  status,
  canApprove,
}: {
  id: string;
  status: string;
  canApprove: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "receive" | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function act(kind: "approve" | "receive") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/transfers/${id}/${kind}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Action failed");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (!canApprove) {
    return (
      <p className="text-[10px] text-muted">Awaiting an authorised manager or network authority.</p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {status === "PENDING_APPROVAL" || status === "RECOMMENDED" ? (
          <Button size="sm" onClick={() => act("approve")} disabled={busy !== null}>
            {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve & dispatch
          </Button>
        ) : null}
        {status === "IN_TRANSIT" ? (
          <Button size="sm" onClick={() => act("receive")} disabled={busy !== null}>
            {busy === "receive" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
            Confirm receipt
          </Button>
        ) : null}
        {status === "COMPLETED" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-medium text-ok">
            <Check className="h-3 w-3" /> {TRANSFER_STATUS_LABEL[status]}
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-[10px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
