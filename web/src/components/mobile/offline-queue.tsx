"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Trash2,
  Wifi,
} from "lucide-react";
import { WingSpinner } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import {
  readQueue,
  removeQueued,
  syncQueue,
  type QueuedOperation,
} from "@/lib/offline";
import { formatDateTime } from "@/lib/format";

export function OfflineQueue() {
  const [ops, setOps] = useState<QueuedOperation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  async function refresh() {
    setOps(await readQueue());
    setLoaded(true);
  }

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const next = await readQueue();
      if (mounted) {
        setOps(next);
        setLoaded(true);
      }
    };
    void load();
    const update = () => setOnline(navigator.onLine);
    update();
    const refresh = () => {
      void load();
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("focus", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  async function sync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await syncQueue();
      await refresh();
      setResult(
        res.failed > 0
          ? `${res.synced} synced, ${res.failed} failed. Review the error and retry.`
          : res.synced > 0
            ? `${res.synced} operation${res.synced === 1 ? "" : "s"} synced successfully.`
            : "Nothing to sync.",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function discard(id: string) {
    await removeQueued(id);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start gap-2.5">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${online ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
            {online ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-ink">
              {online ? "Connected" : "Working offline"}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              {ops.length === 0
                ? "No operations waiting."
                : `${ops.length} operation${ops.length === 1 ? "" : "s"} stored on this device.`}
            </p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={sync} disabled={syncing || ops.length === 0 || !online}>
          {syncing ? <WingSpinner size="xs" label="Syncing" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sync now
        </Button>
      </div>

      {result ? (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-[10px] font-medium text-brand-dark">{result}</p>
      ) : null}

      {!loaded ? (
        <div className="flex justify-center py-10 text-muted">
          <WingSpinner size="md" label="Syncing" />
        </div>
      ) : ops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-ok-soft text-ok">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-ink">Everything is synced</p>
          <p className="mt-1 text-[11px] text-muted">
            Offline entries will appear here and sync when connectivity returns.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {ops.map((op) => (
            <div key={op.id} className="flex items-start gap-2.5 px-4 py-3">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${op.type === "issue" ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
                {op.type === "issue" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-ink">
                  {op.type === "issue" ? "Issue" : "Receive"} {op.quantity} {op.unit}
                  {op.quantity === 1 ? "" : "s"}
                </p>
                <p className="truncate text-[10px] text-muted">{op.medicineName}</p>
                <p className="mt-0.5 text-[9px] text-muted">
                  {op.facilityName} · {formatDateTime(op.createdAt)}
                </p>
                {op.status === "error" ? (
                  <p className="mt-1 text-[9px] font-medium text-danger">{op.error}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`rounded-none px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] ${op.status === "error" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                  {op.status === "error" ? "Failed" : "Pending"}
                </span>
                <button
                  type="button"
                  onClick={() => discard(op.id)}
                  className="text-muted hover:text-danger"
                  aria-label="Discard operation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-line px-3.5 py-3 text-[10px] leading-relaxed text-muted">
        Each entry has a client ID. If a network response is lost after the server records it, retrying
        will not create a duplicate movement.
      </div>
    </div>
  );
}
