"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CloudOff,
  Minus,
  Plus,
  ScanLine,
  Wifi,
} from "lucide-react";
import { WingSpinner } from "@/components/ui/loader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { enqueue } from "@/lib/offline";
import { DEMO_TODAY } from "@/lib/config";

type Medicine = {
  id: string;
  genericName: string;
  strength: string;
  unit: string;
  barcode: string | null;
  usable: number;
  daysToStockout: number | null;
  avgDailyDemand: number;
  packSize: number;
  risk: string;
};

export function MobileStockForm({
  facilityId,
  facilityName,
  medicines,
  suppliers,
  initialMedicineId,
  initialMode,
  canManage,
}: {
  facilityId: string;
  facilityName: string;
  medicines: Medicine[];
  suppliers: { id: string; name: string }[];
  initialMedicineId?: string;
  initialMode: "issue" | "receive";
  canManage: boolean;
}) {
  const [mode, setMode] = useState<"issue" | "receive">(initialMode);
  const [medicineId, setMedicineId] = useState(initialMedicineId ?? medicines[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("Issued to clinical units");
  const [batchNumber, setBatchNumber] = useState("B-2611A");
  const [expiryDate, setExpiryDate] = useState("2027-12-31");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [forceOffline, setForceOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const selected = useMemo(
    () => medicines.find((m) => m.id === medicineId) ?? medicines[0],
    [medicineId, medicines],
  );
  const qty = Math.max(0, Number(quantity) || 0);

  function adjust(delta: number) {
    setQuantity(String(Math.max(1, qty + delta)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || qty <= 0) return;
    setBusy(true);
    setError(null);
    setSuccess(null);

    const payload =
      mode === "issue"
        ? { facilityId, medicineId: selected.id, quantity: qty, reason }
        : {
            facilityId,
            medicineId: selected.id,
            quantity: qty,
            batchNumber,
            expiryDate,
            supplierId: supplierId || null,
            unitCostNgn: 0,
          };

    const offline = forceOffline || (typeof navigator !== "undefined" && !navigator.onLine);
    if (offline) {
      await enqueue({
        type: mode,
        payload,
        medicineName: selected.genericName,
        quantity: qty,
        unit: selected.unit,
        facilityName,
      });
      setSuccess(
        `${qty} ${selected.unit}${qty === 1 ? "" : "s"} saved offline. Sync from the Queue tab.`,
      );
      setQuantity("1");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(`/api/stock/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setSuccess(
        mode === "issue"
          ? `${qty} ${selected.unit}${qty === 1 ? "" : "s"} issued using FEFO.`
          : `${qty} ${selected.unit}${qty === 1 ? "" : "s"} received into ${batchNumber}.`,
      );
      setQuantity("1");
      startTransition(() => router.refresh());
    } catch (err) {
      // Network failure during a live request should never lose the entry.
      const message = err instanceof Error ? err.message : "Request failed";
      if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")) {
        await enqueue({
          type: mode,
          payload,
          medicineName: selected.genericName,
          quantity: qty,
          unit: selected.unit,
          facilityName,
        });
        setSuccess("Connection lost. Entry saved offline. Sync from the Queue tab.");
        setQuantity("1");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-info/20 bg-info-soft px-4 py-3 text-xs text-info">
        This persona has read-only access to {facilityName} inventory.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 rounded-xl bg-canvas p-1">
        <button
          type="button"
          onClick={() => setMode("issue")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
            mode === "issue" ? "bg-surface text-ink shadow-sm" : "text-muted"
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5" /> Issue
        </button>
        <button
          type="button"
          onClick={() => setMode("receive")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
            mode === "receive" ? "bg-surface text-ink shadow-sm" : "text-muted"
          }`}
        >
          <ArrowDownLeft className="h-3.5 w-3.5" /> Receive
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <Field label="Medicine">
          <select
            className={inputClass}
            value={medicineId}
            onChange={(e) => setMedicineId(e.target.value)}
          >
            {medicines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.genericName} {m.strength}
              </option>
            ))}
          </select>
        </Field>

        {selected ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">On hand</p>
              <p className="tabular mt-0.5 text-sm font-semibold text-ink">
                {selected.usable.toLocaleString()} {selected.unit}s
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted">Cover</p>
              <p
                className={`tabular mt-0.5 text-sm font-semibold ${
                  selected.risk === "CRITICAL"
                    ? "text-danger"
                    : selected.risk === "HIGH"
                      ? "text-warn"
                      : "text-ink"
                }`}
              >
                {selected.daysToStockout === null
                  ? "60+ days"
                  : selected.daysToStockout < 1
                    ? "< 1 day"
                    : `${Math.floor(selected.daysToStockout)} days`}
              </p>
            </div>
            <Link
              href={`/m/scan`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-brand"
              aria-label="Scan instead"
            >
              <ScanLine className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        <div className="mt-4">
          <p className="mb-1 text-[11px] font-medium text-muted">Quantity ({selected?.unit}s)</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjust(-1)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-muted"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              className="h-11 flex-1 rounded-xl border border-line bg-surface text-center text-lg font-semibold tabular text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <button
              type="button"
              onClick={() => adjust(1)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-muted"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[1, selected?.packSize ?? 1, 10, 50].map((n, i) => (
              <button
                key={`${n}-${i}`}
                type="button"
                onClick={() => setQuantity(String(n))}
                className="rounded-full bg-canvas px-2.5 py-1 text-[10px] font-medium text-muted ring-1 ring-line"
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {mode === "issue" ? (
          <div className="mt-3">
            <Field label="Reason">
              <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option>Issued to clinical units</option>
                <option>Dispensed to patient</option>
                <option>Emergency ward use</option>
                <option>Stock adjustment</option>
              </select>
            </Field>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Batch number">
                <input className={inputClass} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </Field>
              <Field label="Expiry">
                <input
                  className={inputClass}
                  type="date"
                  min={DEMO_TODAY.toISOString().slice(0, 10)}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Supplier">
              <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Unspecified</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-3.5 py-2.5">
        <input
          type="checkbox"
          checked={forceOffline}
          onChange={(e) => setForceOffline(e.target.checked)}
          className="h-4 w-4 accent-[#492415]"
        />
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          {forceOffline ? <CloudOff className="h-3 w-3 text-warn" /> : <Wifi className="h-3 w-3 text-ok" />}
          Demo: queue this entry offline
        </span>
      </label>

      {success ? (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-[11px] font-medium text-ok">{success}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-[11px] font-medium text-danger">{error}</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={busy || qty <= 0}>
        {busy ? <WingSpinner size="sm" label="Working" /> : null}
        {mode === "issue" ? `Issue ${qty || 0} ${selected?.unit ?? "unit"}${qty === 1 ? "" : "s"}` : `Receive ${qty || 0} ${selected?.unit ?? "unit"}${qty === 1 ? "" : "s"}`}
      </Button>
      <p className="pb-2 text-center text-[9px] leading-relaxed text-muted">
        {mode === "issue"
          ? "Stock is deducted First-Expiry-First-Out and recorded against your account."
          : "Creates a new batch with an audit-trail receipt movement."}
      </p>
    </form>
  );
}
