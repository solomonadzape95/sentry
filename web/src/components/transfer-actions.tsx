"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Truck } from "lucide-react";
import { toast } from "sonner";
import { WingSpinner } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TRANSFER_STATUS_LABEL } from "@/lib/config";

export function TransferActions({
  id,
  status,
  canAct,
  waitingOn,
}: {
  id: string;
  status: string;
  canAct: boolean;
  waitingOn?: string;
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
      toast.success(kind === "approve" ? "Transfer approved and dispatched" : "Receipt confirmed");
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

  if (!canAct) {
    return (
      <p className="text-[10px] text-muted">
        {waitingOn ?? "Awaiting the next authorised action."}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {status === "PENDING_APPROVAL" || status === "RECOMMENDED" ? (
          <Button size="sm" onClick={() => act("approve")} disabled={busy !== null}>
            {busy === "approve" ? <WingSpinner size="xs" label="Approving" /> : <Check className="h-3.5 w-3.5" />}
            Approve & dispatch
          </Button>
        ) : null}
        {status === "IN_TRANSIT" ? (
          <Button size="sm" onClick={() => act("receive")} disabled={busy !== null}>
            {busy === "receive" ? <WingSpinner size="xs" label="Receiving" /> : <Truck className="h-3.5 w-3.5" />}
            Confirm receipt
          </Button>
        ) : null}
        {status === "COMPLETED" ? (
          <Badge tone="success" dot>
            {TRANSFER_STATUS_LABEL[status]}
          </Badge>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-[10px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
