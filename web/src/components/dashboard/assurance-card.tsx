import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AssuranceCard({
  model,
  wape,
  seriesCount,
  latestNcdc,
}: {
  model: string;
  wape: number;
  seriesCount: number;
  latestNcdc: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            Assurance
          </p>
          <p className="mt-1 text-[13px] font-medium tracking-[-0.02em] text-ink">
            Forecast health
          </p>
        </div>
        <ShieldCheck className="h-4 w-4 text-ok" strokeWidth={1.5} />
      </div>

      <div className="mt-3 space-y-2 border-t border-line pt-3 text-[9.5px]">
        <Row label="Model" value={model === "XGBOOST" ? "XGBoost" : model.toLowerCase().replace("_", " ")} />
        <Row label="Held-out WAPE" value={`${(wape * 100).toFixed(1)}%`} />
        <Row label="Forecast lines" value={String(seriesCount)} />
        <Row label="Latest NCDC" value={latestNcdc} />
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-line pt-2.5 text-[9px] font-medium text-muted">
        <Link href="/model" className="inline-flex items-center gap-1 hover:text-ink">
          Model <ArrowUpRight className="h-2.5 w-2.5" />
        </Link>
        <Link href="/data" className="inline-flex items-center gap-1 hover:text-ink">
          Provenance <ArrowUpRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tabular max-w-[120px] truncate text-right font-medium text-ink">
        {value}
      </span>
    </div>
  );
}
