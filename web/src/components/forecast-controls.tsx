"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function ForecastControls({
  facilities,
  medicines,
  facilityId,
  medicineId,
}: {
  facilities: { id: string; shortName: string }[];
  medicines: { id: string; name: string }[];
  facilityId: string;
  medicineId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(nextFacility: string, nextMedicine: string) {
    startTransition(() => {
      router.push(`/forecasts?facility=${nextFacility}&medicine=${nextMedicine}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" /> : null}
      <label className={cn("inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-3 text-[10px] shadow-none")}>
        <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-muted">Facility</span>
        <select
          value={facilityId}
          onChange={(e) => update(e.target.value, medicineId)}
          className="max-w-[180px] cursor-pointer appearance-none bg-transparent text-[10px] font-medium text-ink outline-none"
        >
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.shortName}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-3 text-[10px] shadow-none">
        <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-muted">Medicine</span>
        <select
          value={medicineId}
          onChange={(e) => update(facilityId, e.target.value)}
          className="max-w-[220px] cursor-pointer appearance-none bg-transparent text-[10px] font-medium text-ink outline-none"
        >
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
