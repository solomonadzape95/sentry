"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function BarcodeLabel({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: "EAN13",
        displayValue: true,
        font: "monospace",
        fontSize: 11,
        textMargin: 2,
        height: 46,
        width: 1.8,
        margin: 6,
        background: "#ffffff",
        lineColor: "#10241e",
      });
    } catch {
      // Ignore invalid demo barcodes; the numeric value is still shown.
    }
  }, [value]);

  return (
    <div className="rounded-xl border border-line bg-white p-2 text-center">
      <svg ref={ref} className="mx-auto h-auto w-full max-w-[230px]" />
      {label ? <p className="mt-0.5 text-[9px] text-muted">{label}</p> : null}
    </div>
  );
}
