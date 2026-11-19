"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WingSpinner } from "@/components/ui/loader";

export function FacilitySwitcher({
  facilities,
  currentId,
  className,
}: {
  facilities: { id: string; shortName: string }[];
  currentId: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const current = facilities.find((facility) => facility.id === currentId) ?? facilities[0];

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function choose(id: string) {
    if (id === current?.id) {
      setOpen(false);
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch("/api/facility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ facilityId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not switch facility");
      toast.success("Active facility changed");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not switch facility");
    } finally {
      setBusyId(null);
    }
  }

  if (facilities.length <= 1) {
    return (
      <span
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-3 text-[10px] font-medium text-ink",
          className,
        )}
      >
        <Building2 className="h-3.5 w-3.5 text-body" strokeWidth={1.5} />
        {current?.shortName ?? "No facility"}
      </span>
    );
  }

  const filtered = query
    ? facilities.filter((facility) =>
        facility.shortName.toLowerCase().includes(query.toLowerCase()),
      )
    : facilities;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel pl-3 pr-2.5 text-[10px] font-medium text-ink"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 className="h-3.5 w-3.5 text-body" strokeWidth={1.5} />
        <span className="max-w-[150px] truncate">{current?.shortName ?? "Select facility"}</span>
        {busyId ? (
          <WingSpinner size="xs" label="Switching facility" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.5} />
        )}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] overflow-hidden rounded-[14px] border border-line bg-panel shadow-[0_20px_50px_-24px_rgba(25,15,10,0.65)]">
          <div className="border-b border-line px-3.5 pb-2.5 pt-3">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted">
              Switch facility
            </p>
            {facilities.length > 3 ? (
              <label className="mt-2 flex h-8 items-center gap-2 rounded-full border border-line bg-surface px-2.5">
                <Search className="h-3 w-3 text-muted" strokeWidth={1.5} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter facilities"
                  className="min-w-0 flex-1 bg-transparent text-[10px] text-ink outline-none placeholder:text-muted/60"
                  aria-label="Filter facilities"
                />
              </label>
            ) : null}
          </div>
          <div className="max-h-[260px] overflow-y-auto p-1.5" role="listbox" aria-label="Facilities">
            {filtered.map((facility) => {
              const active = facility.id === current?.id;
              return (
                <button
                  key={facility.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(facility.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-full px-2.5 py-2 text-left text-[10.5px] transition-colors",
                    active ? "bg-surface text-ink" : "text-muted hover:bg-surface/70 hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                      active
                        ? "border-ink/15 bg-bone text-ink"
                        : "border-line/60 bg-surface/60 text-muted",
                    )}
                  >
                    <Building2 className="h-3 w-3" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{facility.shortName}</span>
                  {busyId === facility.id ? (
                    <WingSpinner size="xs" label="Switching facility" />
                  ) : active ? (
                    <Check className="h-3.5 w-3.5 text-ink" strokeWidth={1.5} />
                  ) : null}
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="px-3 py-5 text-center text-[10px] text-muted">No matching facility.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
