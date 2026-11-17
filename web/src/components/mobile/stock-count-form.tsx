"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

type Medicine = {
  id: string;
  genericName: string;
  strength: string;
  unit: string;
  usable: number;
};

export function StockCountForm({
  facilityId,
  medicines,
  canManage,
  initialMedicineId,
}: {
  facilityId: string;
  medicines: Medicine[];
  canManage: boolean;
  initialMedicineId?: string;
}) {
  const [medicineId, setMedicineId] = useState(initialMedicineId ?? medicines[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("Physical stock count");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(
    () =>
      search.trim()
        ? medicines.filter((m) => m.genericName.toLowerCase().includes(search.toLowerCase()))
        : medicines,
    [medicines, search],
  );
  const selected = medicines.find((m) => m.id === medicineId) ?? medicines[0];
  const variance = selected && counted !== "" ? Number(counted) - selected.usable : 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || counted === "") return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/stock/count", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          facilityId,
          medicineId: selected.id,
          countedQuantity: Number(counted),
          note,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Count failed");
      setSuccess(
        variance === 0
          ? "Count matches the system. No adjustment needed."
          : `Count recorded. System stock adjusted by ${variance} ${selected.unit}s.`,
      );
      setCounted("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Count failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-info/20 bg-info-soft px-4 py-3 text-xs text-info">
        This persona has read-only access to inventory counts.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Find medicine</p>
        <div className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-line bg-canvas px-3">
          <Search className="h-3.5 w-3.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine"
            className="h-full w-full bg-transparent text-xs outline-none placeholder:text-muted/60"
          />
        </div>
        <div className="mt-2 max-h-[200px] space-y-1 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMedicineId(m.id);
                setCounted("");
                setSuccess(null);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left ${
                medicineId === m.id ? "bg-brand-soft" : "hover:bg-canvas"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-medium text-ink">{m.genericName}</span>
                <span className="block text-[9px] text-muted">{m.strength}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[9px] uppercase tracking-wide text-muted">System</span>
                <span className="tabular text-[11px] font-semibold text-ink">
                  {m.usable.toLocaleString()}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Counting</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{selected.genericName}</p>
              <p className="text-[10px] text-muted">{selected.strength}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wide text-muted">System quantity</p>
              <p className="tabular text-lg font-semibold text-ink">
                {selected.usable.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Field label={`Counted ${selected.unit}s`}>
              <input
                className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-center text-lg font-semibold tabular text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
                type="number"
                min={0}
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                placeholder="Enter physical count"
                required
              />
            </Field>
          </div>

          {counted !== "" ? (
            <div
              className={`mt-3 rounded-xl px-3 py-2.5 text-[11px] font-medium ${
                variance === 0
                  ? "bg-ok-soft text-ok"
                  : variance < 0
                    ? "bg-danger-soft text-danger"
                    : "bg-warn-soft text-warn"
              }`}
            >
              {variance === 0
                ? "Count matches the system."
                : variance < 0
                  ? `${Math.abs(variance)} ${selected.unit}s short. This will be written off with an adjustment.`
                  : `${variance} ${selected.unit}s surplus. Receive the surplus as a batch so expiry is captured.`}
            </div>
          ) : null}

          <div className="mt-3">
            <Field label="Note">
              <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </div>
      ) : null}

      {success ? (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-[11px] font-medium text-ok">{success}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-[11px] font-medium text-danger">{error}</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={busy || counted === ""}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
        Record physical count
      </Button>
      <p className="pb-2 text-center text-[9px] leading-relaxed text-muted">
        Counts create an audited adjustment. A surplus must be received as a batch.
      </p>
    </form>
  );
}
