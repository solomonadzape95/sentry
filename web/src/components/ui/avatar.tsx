"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function Avatar({
  name,
  className,
  tone = "brand",
}: {
  name: string;
  className?: string;
  tone?: "brand" | "dark" | "light";
}) {
  const [failed, setFailed] = useState(false);
  const tones = {
    brand: "bg-brand-soft text-brand-dark ring-brand/10",
    dark: "bg-white/10 text-white ring-white/15",
    light: "bg-canvas text-muted ring-line",
  };
  const src = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    name,
  )}&backgroundColor=e3dcd7&radius=50`;

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className ?? "h-8 w-8",
      )}
      aria-label={name}
      title={name}
    >
      {!failed ? (
        // DiceBear returns a tiny generated SVG; Next's image optimiser is not useful here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}
