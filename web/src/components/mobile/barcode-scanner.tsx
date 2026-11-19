"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Camera,
  CameraOff,
  Check,
  Loader2,
  Package,
  ScanLine,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarcodeLabel } from "@/components/mobile/barcode-label";
import { enqueue } from "@/lib/offline";

type Medicine = {
  id: string;
  genericName: string;
  strength: string;
  unit: string;
  barcode: string | null;
  usable: number;
  daysToStockout: number | null;
  avgDailyDemand: number;
  risk: string;
};

export function BarcodeScanner({
  facilityId,
  facilityName,
  medicines,
  canManage,
}: {
  facilityId: string;
  facilityName: string;
  medicines: Medicine[];
  canManage: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = medicines.find((m) => m.id === selectedId) ?? null;

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const handleCode = useCallback(
    (code: string) => {
      const normalized = code.replace(/\s/g, "");
      const match = medicines.find(
        (m) => m.barcode === normalized || m.barcode?.endsWith(normalized) || normalized.endsWith(m.barcode ?? "___"),
      );
      setScannedCode(normalized);
      setMessage(null);
      if (match) {
        setSelectedId(match.id);
      } else {
        setSelectedId("");
      }
    },
    [medicines],
  );

  async function start() {
    setError(null);
    setMessage(null);
    setScanning(true);
    try {
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview is not ready");
      const reader = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 250,
      });
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } },
        video,
        (result) => {
          if (result) {
            handleCode(result.getText());
            stop();
          }
        },
      );
      controlsRef.current = controls;
    } catch (err) {
      setScanning(false);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied. Use manual entry or a demo label below."
          : "Camera unavailable on this device. Use manual entry or a demo label below.",
      );
    }
  }

  async function quickIssue() {
    if (!selected) return;
    const qty = Math.max(1, Number(quantity) || 1);
    setBusy(true);
    setMessage(null);
    const payload = {
      facilityId,
      medicineId: selected.id,
      quantity: qty,
      reason: "Scanned at dispensing point",
    };
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueue({
          type: "issue",
          payload,
          medicineName: selected.genericName,
          quantity: qty,
          unit: selected.unit,
          facilityName,
        });
        setMessage(`Saved offline: ${qty} ${selected.unit}${qty === 1 ? "" : "s"} queued for sync.`);
      } else {
        const res = await fetch("/api/stock/issue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Issue failed");
        setMessage(`Issued ${qty} ${selected.unit}${qty === 1 ? "" : "s"} using FEFO.`);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Issue failed";
      if (text.toLowerCase().includes("fetch") || text.toLowerCase().includes("network")) {
        await enqueue({
          type: "issue",
          payload,
          medicineName: selected.genericName,
          quantity: qty,
          unit: selected.unit,
          facilityName,
        });
        setMessage("Connection lost. Saved offline for sync.");
      } else {
        setError(text);
      }
    } finally {
      setBusy(false);
    }
  }

  const filtered = search.trim()
    ? medicines.filter(
        (m) =>
          m.genericName.toLowerCase().includes(search.toLowerCase()) ||
          m.barcode?.includes(search),
      )
    : medicines;

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#0a1c17]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${scanning ? "opacity-100" : "opacity-0"}`}
        />
        {!scanning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15">
              <ScanLine className="h-7 w-7 text-[#ccb7a3]" />
            </div>
            <p className="text-sm font-semibold text-white">Scan a medicine barcode</p>
            <p className="max-w-[240px] text-[10px] leading-relaxed text-white/45">
              Point the camera at an EAN-13 or GS1 DataMatrix label. Manual entry is always available.
            </p>
            <Button type="button" size="sm" onClick={start} className="bg-[#ccb7a3] text-brand-deep hover:bg-[#d8cec8]">
              <Camera className="h-3.5 w-3.5" /> Start camera
            </Button>
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-6 rounded-xl border border-[#ccb7a3]/50">
              <div className="scanline h-0.5 w-full bg-[#ccb7a3] shadow-[0_0_18px_#ccb7a3]" />
            </div>
            <button
              type="button"
              onClick={stop}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
              aria-label="Stop camera"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[10px] leading-relaxed text-warn">
          <CameraOff className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : null}

      {scannedCode ? (
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[9px] uppercase tracking-wide text-muted">Scanned code</p>
          <p className="mt-0.5 font-mono text-xs font-medium text-ink">{scannedCode}</p>
        </div>
      ) : null}

      {selected ? (
        <div className="rounded-2xl border border-brand/20 bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-brand">Medicine found</p>
              <p className="mt-1 text-sm font-semibold text-ink">{selected.genericName}</p>
              <p className="text-[11px] text-muted">{selected.strength}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
              <Check className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-canvas px-3 py-2.5">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-muted">On hand</p>
              <p className="tabular mt-0.5 text-sm font-semibold text-ink">
                {selected.usable.toLocaleString()} {selected.unit}s
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-muted">Cover</p>
              <p className={`tabular mt-0.5 text-sm font-semibold ${selected.risk === "CRITICAL" ? "text-danger" : "text-ink"}`}>
                {selected.daysToStockout === null ? "60+ days" : `${Math.floor(selected.daysToStockout)} days`}
              </p>
            </div>
          </div>
          {canManage ? (
            <div className="mt-3 flex items-end gap-2">
              <label className="flex-1">
                <span className="mb-1 block text-[10px] font-medium text-muted">Issue quantity</span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm tabular outline-none focus:border-brand/50"
                />
              </label>
              <Button type="button" onClick={quickIssue} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                Issue now
              </Button>
            </div>
          ) : null}
          {message ? (
            <p className="mt-2 rounded-lg bg-ok-soft px-3 py-2 text-[10px] font-medium text-ok">{message}</p>
          ) : null}
          <Link
            href={`/m/issue?medicine=${selected.id}`}
            className="mt-2 inline-flex text-[10px] font-medium text-brand hover:underline"
          >
            Open full issue form
          </Link>
        </div>
      ) : null}

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Manual fallback</p>
        <div className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-line bg-canvas px-3">
          <Search className="h-3.5 w-3.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine or barcode"
            className="h-full w-full bg-transparent text-xs outline-none placeholder:text-muted/60"
          />
        </div>
        <div className="mt-2 max-h-[180px] space-y-1 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setSelectedId(m.id);
                setScannedCode(null);
                setMessage(null);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left ${
                selectedId === m.id ? "bg-brand-soft" : "hover:bg-canvas"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-medium text-ink">{m.genericName}</span>
                <span className="block font-mono text-[9px] text-muted">{m.barcode}</span>
              </span>
              <span className="shrink-0 text-[10px] tabular text-muted">{m.usable}</span>
            </button>
          ))}
        </div>
      </div>

      <details className="rounded-2xl border border-dashed border-line bg-surface p-3">
        <summary className="cursor-pointer text-[10px] font-medium text-muted">
          Demo barcode labels (scan from another device)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {medicines
            .filter((m) => m.barcode)
            .slice(0, 3)
            .map((m) => (
              <div key={m.id}>
                <BarcodeLabel value={m.barcode!} label={m.genericName} />
              </div>
            ))}
        </div>
      </details>
    </div>
  );
}
