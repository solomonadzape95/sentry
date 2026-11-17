"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { DEMO_TODAY } from "@/lib/config";

type MedicineOption = {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  unit: string;
  barcode: string | null;
};

type SupplierOption = { id: string; name: string };

export function StockActions({
  facilityId,
  medicines,
  suppliers,
  canManage,
}: {
  facilityId: string;
  medicines: MedicineOption[];
  suppliers: SupplierOption[];
  canManage: boolean;
}) {
  const [mode, setMode] = useState<"issue" | "receive" | null>(null);
  const [medicineId, setMedicineId] = useState(medicines[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Issued to clinical units");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [unitCost, setUnitCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  function open(next: "issue" | "receive") {
    setMode(next);
    setError(null);
    setSuccess(null);
    setQuantity("");
    setBatchNumber(next === "receive" ? `BATCH-${Date.now().toString().slice(-6)}` : "");
    setExpiryDate("");
    setUnitCost("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!mode) return;
    setBusy(true);
    setError(null);
    try {
      const payload =
        mode === "issue"
          ? {
              facilityId,
              medicineId,
              quantity: Number(quantity),
              reason,
            }
          : {
              facilityId,
              medicineId,
              quantity: Number(quantity),
              batchNumber,
              expiryDate,
              supplierId: supplierId || null,
              unitCostNgn: Number(unitCost || 0),
            };
      const res = await fetch(`/api/stock/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      const med = medicines.find((m) => m.id === medicineId);
      setSuccess(
        mode === "issue"
          ? `${quantity} ${med?.unit ?? "unit"}s issued. Stock projection updated.`
          : `${quantity} ${med?.unit ?? "unit"}s received into ${batchNumber}.`,
      );
      setMode(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return (
      <span className="inline-flex h-8 items-center rounded-lg border border-line bg-surface px-3 text-[11px] text-muted">
        Read-only access
      </span>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => open("issue")}>
          <ArrowUpRight className="h-3.5 w-3.5" /> Issue stock
        </Button>
        <Button size="sm" onClick={() => open("receive")}>
          <ArrowDownLeft className="h-3.5 w-3.5" /> Receive stock
        </Button>
      </div>

      {success ? (
        <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-brand-dark px-4 py-3 text-xs font-medium text-white shadow-xl lg:bottom-8">
          {success}
        </div>
      ) : null}

      {mode ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={mode === "issue" ? "Issue stock" : "Receive stock"}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMode(null);
          }}
        >
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  {mode === "issue" ? "Issue stock" : "Receive stock"}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {mode === "issue"
                    ? "Deduct using FEFO and record consumption."
                    : "Add a batch and create an audit-trail movement."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3">
              <Field label="Medicine">
                <select
                  className={inputClass}
                  value={medicineId}
                  onChange={(e) => setMedicineId(e.target.value)}
                  required
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.genericName} {m.strength}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity" hint={`In ${medicines.find((m) => m.id === medicineId)?.unit ?? "units"}`}>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </Field>
                {mode === "receive" ? (
                  <Field label="Expiry date">
                    <input
                      className={inputClass}
                      type="date"
                      min={DEMO_TODAY.toISOString().slice(0, 10)}
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required
                    />
                  </Field>
                ) : (
                  <Field label="Reason">
                    <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                      <option>Issued to clinical units</option>
                      <option>Dispensed to patient</option>
                      <option>Emergency ward use</option>
                      <option>Stock adjustment</option>
                    </select>
                  </Field>
                )}
              </div>

              {mode === "receive" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Batch number">
                      <input
                        className={inputClass}
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Unit cost (₦)">
                      <input
                        className={inputClass}
                        type="number"
                        min={0}
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        placeholder="0"
                      />
                    </Field>
                  </div>
                  <Field label="Supplier">
                    <select
                      className={inputClass}
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                    >
                      <option value="">Unspecified</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : null}

              {error ? (
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-[11px] font-medium text-danger">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={busy || !quantity}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {mode === "issue" ? "Confirm issue" : "Confirm receipt"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
