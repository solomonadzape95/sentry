export function GrainOverlay({ id, className }: { id: string; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-30 opacity-[0.05] mix-blend-overlay ${className ?? ""}`} aria-hidden="true">
      <svg width="100%" height="100%">
        <filter id={`${id}-noise`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id}-noise)`} />
      </svg>
    </div>
  );
}
