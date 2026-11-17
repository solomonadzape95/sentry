import { ArrowUpRight, Plus } from "lucide-react";
import { Sparkline } from "@/components/ui/stat";
import { RiskBadge } from "@/components/ui/badge";
import { GrainOverlay } from "@/components/landing/grain";
import { cn } from "@/lib/utils";

export function HeroVisual({
  days,
  transfer,
  facility,
  source,
  medicine,
  forecast,
  className,
}: {
  days: number;
  transfer: number;
  facility: string;
  source: string;
  medicine: string;
  forecast: number[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate h-full min-h-[540px] w-full overflow-hidden rounded-[30px] bg-forest",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_16%,rgba(228,244,77,0.26),transparent_36%),radial-gradient(circle_at_14%_84%,rgba(127,176,138,0.28),transparent_40%),linear-gradient(155deg,#081f19_0%,#0c2d24_45%,#164936_100%)]" />

      <svg
        viewBox="0 0 760 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-vine" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#7fb08a" stopOpacity="0.1" />
            <stop offset="42%" stopColor="#a9d68e" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#e4f44d" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="hero-capsule" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#e9f7a9" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#e4f44d" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="hero-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d8ee9a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7fb08a" stopOpacity="0.04" />
          </linearGradient>
          <radialGradient id="hero-glow">
            <stop offset="0%" stopColor="#e4f44d" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e4f44d" stopOpacity="0" />
          </radialGradient>
          <filter id="hero-blur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="30" />
          </filter>
          <filter id="hero-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g opacity="0.55">
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              key={i}
              cx="426"
              cy="438"
              rx={170 + i * 48}
              ry={228 + i * 58}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.06 - i * 0.008}
              strokeWidth="1"
              transform={`rotate(${-18 + i * 2} 426 438)`}
            />
          ))}
        </g>

        <g filter="url(#hero-blur)">
          <circle cx="620" cy="138" r="176" fill="url(#hero-glow)" opacity="0.34" />
          <circle cx="104" cy="768" r="218" fill="#7fb08a" opacity="0.2" />
          <circle cx="452" cy="486" r="154" fill="#8fcf9b" opacity="0.12" />
        </g>

        <path
          d="M 26 854 C 148 766 206 660 296 596 S 434 430 502 320 S 604 158 754 70"
          fill="none"
          stroke="url(#hero-vine)"
          strokeWidth="42"
          strokeLinecap="round"
          opacity="0.44"
          filter="url(#hero-soft-glow)"
        />
        <path
          d="M 26 854 C 148 766 206 660 296 596 S 434 430 502 320 S 604 158 754 70"
          fill="none"
          stroke="url(#hero-vine)"
          strokeWidth="2"
          strokeLinecap="round"
          className="draw-line"
          opacity="0.8"
        />

        {[
          ["M 176 684 C 138 650 114 618 92 578", "M 92 578 C 66 540 74 506 96 486"],
          ["M 296 596 C 338 548 366 518 390 468", "M 390 468 C 412 422 426 400 446 366"],
          ["M 502 320 C 548 324 582 338 618 364", "M 618 364 C 660 392 680 424 692 464"],
          ["M 406 474 C 388 520 382 550 386 584", "M 386 584 C 388 612 384 630 374 650"],
        ].map((paths, index) => (
          <g key={index}>
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="#b9df9c"
                strokeWidth={i === 0 ? 1.4 : 0.9}
                strokeLinecap="round"
                opacity={i === 0 ? 0.38 : 0.2}
              />
            ))}
          </g>
        ))}

        {[
          { cx: 92, cy: 578, r: 5 },
          { cx: 446, cy: 366, r: 6 },
          { cx: 692, cy: 464, r: 5 },
          { cx: 374, cy: 650, r: 4 },
          { cx: 618, cy: 364, r: 3.5 },
          { cx: 296, cy: 596, r: 3.5 },
        ].map((node, i) => (
          <g key={i}>
            <circle cx={node.cx} cy={node.cy} r={node.r + 9} fill="url(#hero-glow)" opacity="0.3" />
            <circle cx={node.cx} cy={node.cy} r={node.r + 3} fill="none" stroke="#e4f44d" strokeOpacity="0.35" strokeWidth="1" />
            <circle cx={node.cx} cy={node.cy} r={node.r} fill="#e4f44d" filter="url(#hero-soft-glow)" />
          </g>
        ))}

        <g opacity="0.85">
          <g transform="rotate(-33 248 742)">
            <rect x="222" y="724" width="64" height="28" rx="14" fill="url(#hero-capsule)" stroke="#ffffff" strokeOpacity="0.25" />
            <path d="M 254 724 L 254 752" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1" />
          </g>
          <g transform="rotate(24 540 214)">
            <rect x="508" y="198" width="72" height="32" rx="16" fill="url(#hero-capsule)" opacity="0.75" stroke="#ffffff" strokeOpacity="0.2" />
            <path d="M 544 198 L 544 230" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
          </g>
          <g transform="rotate(-16 642 576)">
            <rect x="612" y="560" width="58" height="26" rx="13" fill="url(#hero-capsule)" opacity="0.6" stroke="#ffffff" strokeOpacity="0.18" />
            <path d="M 641 560 L 641 586" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1" />
          </g>
        </g>

        <g opacity="0.9">
          {[
            [236, 694, 44, 14, -32],
            [414, 472, 36, 11, 42],
            [574, 310, 48, 15, -28],
            [666, 448, 30, 10, 22],
            [154, 768, 34, 11, 66],
            [498, 392, 26, 8, 12],
          ].map(([cx, cy, rx, ry, rotation], i) => (
            <ellipse
              key={`leaf-${i}`}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill="url(#hero-leaf)"
              stroke="#dff48a"
              strokeOpacity="0.12"
              strokeWidth="1"
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />
          ))}
        </g>

        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <circle
            key={`spore-${i}`}
            cx={[132, 214, 352, 486, 560, 664, 712, 286][i]}
            cy={[214, 414, 294, 662, 120, 724, 248, 112][i]}
            r={i % 2 ? 1.6 : 2.4}
            fill="#e4f44d"
            opacity={0.2 + (i % 3) * 0.12}
          />
        ))}
      </svg>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,18,14,0.08)_0%,transparent_32%,rgba(4,18,14,0.28)_100%)]" />

      <div className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[10px] font-medium text-white/75 backdrop-blur-md">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-lime" />
        Live projection
      </div>

      <FloatingPill
        label="Forecast"
        className="left-[7%] top-[26%] float-soft"
        delay="0s"
      />
      <FloatingPill
        label="Surplus"
        className="left-[4%] top-[56%] float-soft-slow"
        delay="0.8s"
      />
      <FloatingPill
        label="Transfer"
        className="right-[6%] top-[39%] float-soft"
        delay="1.4s"
      />

      <div className="absolute bottom-4 left-4 right-4 z-20 sm:left-auto sm:w-[302px]">
        <div className="rounded-[22px] border border-white/45 bg-white/90 p-4 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone">
              Projected stockout
            </p>
            <RiskBadge risk="CRITICAL" compact />
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="tabular text-[30px] font-semibold leading-none tracking-tight text-ink">
                {days} <span className="text-[14px] font-medium text-stone">days</span>
              </p>
              <p className="mt-1.5 truncate text-[10px] text-stone">
                {facility} · {medicine}
              </p>
            </div>
            <Sparkline
              values={forecast}
              width={116}
              height={42}
              stroke="#0a2b22"
              fill
              className="shrink-0"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-forest px-3 py-2.5">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-lime">
                Recommended transfer
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-white">
                {transfer.toLocaleString()} units from {source}
              </p>
            </div>
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lime text-forest">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>

      <GrainOverlay id="hero-grain" />
    </div>
  );
}

function FloatingPill({
  label,
  className,
  delay = "0s",
}: {
  label: string;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={cn(
        "absolute z-20 flex items-center gap-1.5 rounded-full border border-white/50 bg-white/90 py-1.5 pl-3.5 pr-1.5 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl",
        className,
      )}
      style={{ animationDelay: delay }}
    >
      <span className="text-[10px] font-semibold tracking-tight text-ink">{label}</span>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-forest">
        <Plus className="h-3 w-3" strokeWidth={2.6} />
      </span>
    </div>
  );
}
