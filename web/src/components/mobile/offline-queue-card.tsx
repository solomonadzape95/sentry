"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudOff, ChevronRight } from "lucide-react";
import { readQueue } from "@/lib/offline";

export function OfflineQueueCard() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    readQueue().then((ops) => {
      if (mounted) setCount(ops.length);
    });
    const refresh = () => readQueue().then((ops) => mounted && setCount(ops.length));
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  if (count === null) return null;

  return (
    <Link
      href="/m/queue"
      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
    >
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${count > 0 ? "bg-warn-soft text-warn" : "bg-canvas text-muted"}`}>
        <CloudOff className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink">
          {count > 0 ? `${count} operation${count === 1 ? "" : "s"} waiting to sync` : "Offline queue empty"}
        </p>
        <p className="text-[10px] text-muted">
          {count > 0 ? "Saved on this device. Tap to review." : "Inventory entries survive connectivity loss."}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted" />
    </Link>
  );
}
