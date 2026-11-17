"use client";

import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetworkStatus({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium",
        online ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn",
      )}
    >
      {online ? <Wifi className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
      {compact ? (online ? "Online" : "Offline") : online ? "Online · synced" : "Offline · queued locally"}
    </span>
  );
}
