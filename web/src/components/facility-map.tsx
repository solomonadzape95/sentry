import type { RiskLevel } from "@/lib/intelligence";

type MapFacility = {
  id: string;
  shortName: string;
  risk: RiskLevel | "NONE";
  critical: number;
  watch: number;
};

const positions: Record<string, { x: number; y: number; anchor: "start" | "middle" | "end"; dy: number }> = {
  fac_phc: { x: 96, y: 246, anchor: "start", dy: 0 },
  fac_gh: { x: 416, y: 156, anchor: "start", dy: 0 },
  fac_sunrise: { x: 312, y: 82, anchor: "middle", dy: -16 },
  fac_carepoint: { x: 474, y: 224, anchor: "start", dy: 0 },
};

const colors: Record<string, { dot: string; ring: string; text: string }> = {
  CRITICAL: { dot: "#d92d20", ring: "#fee4e2", text: "#b42318" },
  HIGH: { dot: "#dc6803", ring: "#fef0c7", text: "#b54708" },
  MEDIUM: { dot: "#eaaa08", ring: "#fef7c3", text: "#a15c07" },
  LOW: { dot: "#12b76a", ring: "#dcfae6", text: "#067647" },
  NONE: { dot: "#12b76a", ring: "#dcfae6", text: "#067647" },
};

export function FacilityMap({
  facilities,
  opportunity,
}: {
  facilities: MapFacility[];
  opportunity?: {
    fromFacilityId: string;
    toFacilityId: string;
    quantity: number;
    medicineName: string;
  } | null;
}) {
  const from = opportunity ? positions[opportunity.fromFacilityId] : null;
  const to = opportunity ? positions[opportunity.toFacilityId] : null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#f7faf8] ring-1 ring-inset ring-line">
      <svg viewBox="0 0 600 320" className="h-auto w-full" role="img" aria-label="FCT demonstration facility network">
        <defs>
          <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e3ece7" strokeWidth="1" />
          </pattern>
          <linearGradient id="fct-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dff0ea" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#eef7f3" stopOpacity="0.2" />
          </linearGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f3b2c" />
          </marker>
        </defs>

        <rect width="600" height="320" fill="url(#map-grid)" />
        <path
          d="M154 22 L352 30 L474 76 L524 154 L492 238 L396 286 L248 300 L130 258 L94 186 L84 104 Z"
          fill="url(#fct-fill)"
          stroke="#cfe3db"
          strokeWidth="1.4"
        />
        <text x="34" y="304" fill="#93a69e" fontSize="9" letterSpacing="1.4">
          FCT · ILLUSTRATIVE POSITIONS
        </text>

        {from && to && opportunity ? (
          <>
            <path
              d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 70} ${to.x} ${to.y}`}
              fill="none"
              stroke="#0f3b2c"
              strokeWidth="1.6"
              strokeDasharray="5 4"
              markerEnd="url(#arrow)"
              opacity="0.7"
            />
            <g transform={`translate(${(from.x + to.x) / 2 - 38} ${(from.y + to.y) / 2 + 14})`}>
              <rect x="-6" y="-12" width="154" height="23" rx="6" fill="#ffffff" stroke="#cfe3db" />
              <text x="4" y="4" fill="#0a332c" fontSize="9.5" fontWeight="600">
                {opportunity.quantity.toLocaleString()} units · transfer
              </text>
            </g>
          </>
        ) : null}

        {facilities.map((facility) => {
          const pos = positions[facility.id];
          if (!pos) return null;
          const c = colors[facility.risk] ?? colors.NONE;
          return (
            <a key={facility.id} href={`/facilities/${facility.id}`}>
              <g className="cursor-pointer">
                <circle cx={pos.x} cy={pos.y} r="18" fill={c.ring} opacity="0.8" />
                <circle cx={pos.x} cy={pos.y} r="7" fill={c.dot} stroke="#ffffff" strokeWidth="2.5" />
                {facility.risk === "CRITICAL" ? (
                  <circle cx={pos.x} cy={pos.y} r="12" fill="none" stroke={c.dot} strokeWidth="1" opacity="0.35" />
                ) : null}
                <text
                  x={pos.x}
                  y={pos.y + 22 + pos.dy}
                  textAnchor={pos.anchor}
                  fill="#10241e"
                  fontSize="10.5"
                  fontWeight="600"
                >
                  {facility.shortName}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 34 + pos.dy}
                  textAnchor={pos.anchor}
                  fill={c.text}
                  fontSize="9"
                  fontWeight="500"
                >
                  {facility.critical > 0
                    ? `${facility.critical} critical`
                    : facility.watch > 0
                      ? `${facility.watch} on watch`
                      : "Stable cover"}
                </text>
              </g>
            </a>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-3 rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 text-[9px] font-medium text-muted backdrop-blur">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-danger" /> Critical</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-warn" /> Watch</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> Stable</span>
      </div>
    </div>
  );
}
