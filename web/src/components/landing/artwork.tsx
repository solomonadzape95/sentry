import { cn } from "@/lib/utils";

/**
 * Procedural artwork plates.
 *
 * These are intentional placeholders for the editorial photography in the
 * reference direction: risograph grain, halftone clouds and flat colour fields.
 * Swap any plate for a real image later by replacing the <svg> in the matching
 * variant with <Image src="/art/…" fill className="object-cover" />.
 */
type Variant = "meadow" | "sky" | "shore" | "forest";

export function Artwork({
  variant = "meadow",
  id,
  className,
  settle = false,
}: {
  variant?: Variant;
  id: string;
  className?: string;
  settle?: boolean;
}) {
  const p = `cheta-${variant}-${id}`;
  return (
    <div
      className={cn("relative isolate overflow-hidden bg-sky-soft", className)}
      data-artwork={variant}
      aria-hidden="true"
    >
      <div className={cn("art-tone absolute inset-0", settle && "art-settle")}>
        {variant === "meadow" ? <Meadow p={p} /> : null}
        {variant === "sky" ? <Sky p={p} /> : null}
        {variant === "shore" ? <Shore p={p} /> : null}
        {variant === "forest" ? <Forest p={p} /> : null}
      </div>
      <div className="print-grain" />
      <div className="riso-speckle opacity-[0.22]" />
      <div className="dotfield pointer-events-none absolute inset-0 text-ink opacity-[0.05]" />
    </div>
  );
}

function GrainFilters({ p }: { p: string }) {
  return (
    <>
      <filter id={`${p}-cloud`} x="-30%" y="-40%" width="160%" height="180%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.018 0.028"
          numOctaves="4"
          seed="17"
          result="n"
        />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="58" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="0.7" />
      </filter>
      <filter id={`${p}-paint`} x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="4" seed="6" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="20" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id={`${p}-grain`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <filter id={`${p}-speckle`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="42" result="n" />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.05  0 0 0 0 0.04  0 0 0 0 0.02  0 0 0 3.2 -1.35"
        />
      </filter>
      <pattern id={`${p}-halftone`} width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="1.4" cy="1.4" r="0.95" fill="#132a12" opacity="0.55" />
      </pattern>
    </>
  );
}

/* ------------------------------------------------------------------ meadow */

function Meadow({ p }: { p: string }) {
  return (
    <svg viewBox="0 0 900 1100" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0.1" y2="1">
          <stop offset="0%" stopColor="#45bde5" />
          <stop offset="40%" stopColor="#87d6ef" />
          <stop offset="72%" stopColor="#c9edf7" />
          <stop offset="100%" stopColor="#eaf7fa" />
        </linearGradient>
        <linearGradient id={`${p}-meadow`} x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0%" stopColor="#b2e477" />
          <stop offset="45%" stopColor="#84d04e" />
          <stop offset="100%" stopColor="#61ad39" />
        </linearGradient>
        <GrainFilters p={p} />
      </defs>

      <rect width="900" height="1100" fill={`url(#${p}-sky)`} />

      <g filter={`url(#${p}-cloud)`} fill="#fdfdfb">
        <ellipse cx="700" cy="300" rx="280" ry="150" />
        <ellipse cx="830" cy="450" rx="240" ry="190" />
        <ellipse cx="590" cy="440" rx="250" ry="150" />
        <ellipse cx="410" cy="500" rx="210" ry="110" />
        <ellipse cx="850" cy="210" rx="190" ry="95" />
        <ellipse cx="180" cy="360" rx="150" ry="90" />
        <ellipse cx="60" cy="470" rx="120" ry="90" />
        <ellipse cx="310" cy="250" rx="160" ry="80" />
      </g>

      <g filter={`url(#${p}-paint)`}>
        <path
          d="M-40 710 C 50 668, 120 645, 205 641 C 300 636, 366 660, 426 696 C 474 724, 516 736, 558 742 L 558 840 L -40 840 Z"
          fill="#96d76b"
        />
        <path
          d="M-40 742 C 62 714, 150 704, 248 712 C 338 719, 420 738, 500 756 L 500 870 L -40 870 Z"
          fill="#78c14d"
        />
      </g>

      <g filter={`url(#${p}-paint)`}>
        <path
          d="M-40 792 C 130 772, 300 758, 470 764 C 640 770, 780 780, 940 790 L 940 930 L -40 930 Z"
          fill="#141c11"
        />
      </g>

      <g filter={`url(#${p}-paint)`}>
        <path
          d="M-40 826 C 140 806, 300 808, 460 828 C 620 848, 760 858, 940 848 L 940 1100 L -40 1100 Z"
          fill={`url(#${p}-meadow)`}
        />
      </g>

      <g filter={`url(#${p}-paint)`}>
        <path
          d="M210 1032 C 330 1008, 470 1006, 620 1022 C 710 1032, 800 1040, 900 1044 L 900 1068 C 780 1063, 670 1056, 570 1046 C 450 1034, 330 1040, 210 1058 Z"
          fill="#4dc5ee"
          opacity="0.95"
        />
      </g>

    </svg>
  );
}

/* --------------------------------------------------------------------- sky */

function Sky({ p }: { p: string }) {
  return (
    <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#3db7e1" />
          <stop offset="55%" stopColor="#8ad9f0" />
          <stop offset="100%" stopColor="#d3f0f8" />
        </linearGradient>
        <GrainFilters p={p} />
      </defs>
      <rect width="1200" height="900" fill={`url(#${p}-sky)`} />
      <g filter={`url(#${p}-cloud)`} fill="#ffffff" opacity="0.96">
        <ellipse cx="120" cy="760" rx="320" ry="210" />
        <ellipse cx="420" cy="840" rx="300" ry="180" />
        <ellipse cx="880" cy="800" rx="340" ry="190" />
        <ellipse cx="1130" cy="640" rx="260" ry="150" />
        <ellipse cx="660" cy="920" rx="340" ry="160" />
        <ellipse cx="20" cy="580" rx="200" ry="120" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------- shore */

function Shore({ p }: { p: string }) {
  return (
    <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id={`${p}-sea`} x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%" stopColor="#2f97c1" />
          <stop offset="55%" stopColor="#43aed4" />
          <stop offset="100%" stopColor="#2278a4" />
        </linearGradient>
        <filter id={`${p}-foam`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.055" numOctaves="5" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="24" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
        <GrainFilters p={p} />
      </defs>
      <rect width="1400" height="900" fill={`url(#${p}-sea)`} />

      <path
        d="M0 380 C 260 320, 520 400, 760 470 C 1000 540, 1220 520, 1400 440 L 1400 900 L 0 900 Z"
        fill="#57bcd9"
        opacity="0.55"
      />
      <path
        d="M0 700 C 260 660, 520 690, 760 735 C 1000 780, 1210 760, 1400 700 L 1400 900 L 0 900 Z"
        fill="#1f6d97"
        opacity="0.6"
      />

      <g filter={`url(#${p}-foam)`}>
        <path
          d="M-40 470 C 210 440, 460 500, 700 560 C 940 620, 1160 600, 1440 520 L 1440 610 C 1140 690, 900 705, 660 650 C 420 595, 190 570, -40 600 Z"
          fill="#bfeef7"
          opacity="0.55"
        />
        <path
          d="M-40 780 C 200 745, 430 760, 650 800 C 870 840, 1100 840, 1440 780 L 1440 860 C 1100 900, 850 900, 620 870 C 390 840, 170 840, -40 870 Z"
          fill="#f2fcfe"
          opacity="0.4"
        />
      </g>

      <g
        fill="none"
        stroke="#e8f9fd"
        strokeWidth="3"
        opacity="0.35"
        filter={`url(#${p}-foam)`}
      >
        <path d="M-40 290 C 250 240, 470 300, 720 360 C 980 422, 1200 400, 1440 330" />
        <path d="M-40 215 C 260 180, 520 230, 780 290 C 1020 345, 1230 330, 1440 270" />
        <path d="M-40 690 C 230 660, 470 690, 700 730 C 950 773, 1190 760, 1440 700" />
      </g>

      <g fill="#f7f4e9">
        <g transform="translate(980 200) rotate(16)">
          <rect width="62" height="40" />
        </g>
        <g transform="translate(1180 360) rotate(-20)">
          <rect width="52" height="34" />
        </g>
        <g transform="translate(790 150) rotate(-28)">
          <rect width="44" height="28" />
        </g>
        <g transform="translate(250 735) rotate(22)">
          <rect width="58" height="38" />
        </g>
        <g transform="translate(520 800) rotate(-14)">
          <rect width="46" height="30" />
        </g>
        <g transform="translate(1300 175) rotate(8)">
          <rect width="36" height="24" />
        </g>
      </g>
      <g fill="#dfe8df" opacity="0.75">
        <g transform="translate(1080 285) rotate(9)">
          <rect width="52" height="34" />
        </g>
        <g transform="translate(660 690) rotate(30)">
          <rect width="40" height="26" />
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------- forest */

function Forest({ p }: { p: string }) {
  const treeLine = ({
    count,
    base,
    seed,
    color,
    opacity = 1,
    height = 1,
  }: {
    count: number;
    base: number;
    seed: number;
    color: string;
    opacity?: number;
    height?: number;
  }) => {
    const paths: string[] = [];
    for (let i = 0; i < count; i++) {
      const r = (n: number) => {
        const x = Math.sin((i + seed + n) * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
      };
      const x = (i / count) * 1500 + r(1) * 22 - 11;
      const h = (22 + r(2) * 52) * height;
      const w = (9 + r(3) * 10) * height;
      paths.push(`M${x - w / 2} ${base} L${x} ${base - h} L${x + w / 2} ${base} Z`);
    }
    return <path d={paths.join(" ")} fill={color} opacity={opacity} />;
  };

  return (
    <svg viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2efe6" />
          <stop offset="100%" stopColor="#dfe8d6" />
        </linearGradient>
        <linearGradient id={`${p}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ec0df" />
          <stop offset="100%" stopColor="#246f9a" />
        </linearGradient>
        <linearGradient id={`${p}-mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
        </linearGradient>
        <GrainFilters p={p} />
      </defs>

      <rect width="1440" height="760" fill={`url(#${p}-sky)`} />

      <g filter={`url(#${p}-paint)`}>
        <path d="M-40 230 C 200 160, 420 160, 640 240 C 860 320, 1060 340, 1480 290 L 1480 630 L -40 630 Z" fill="#0b1a11" />
        <path d="M-40 390 C 180 320, 390 320, 590 400 C 770 472, 960 492, 1200 460 C 1310 445, 1380 444, 1480 450 L 1480 660 L -40 660 Z" fill="#112215" />
      </g>

      <g filter={`url(#${p}-paint)`}>
        {treeLine({ count: 180, base: 560, seed: 3, color: "#0a1c10" })}
        {treeLine({ count: 160, base: 600, seed: 11, color: "#12291a" })}
        {treeLine({ count: 120, base: 640, seed: 23, color: "#1a4526" })}
        {treeLine({ count: 60, base: 655, seed: 31, color: "#2b7a3b", opacity: 0.85, height: 0.8 })}
      </g>

      <rect y="600" width="1440" height="60" fill={`url(#${p}-mist)`} />

      <path
        d="M-40 690 C 200 672, 420 676, 620 695 C 830 715, 1050 716, 1240 700 C 1320 694, 1380 692, 1480 695 L 1480 760 L -40 760 Z"
        fill={`url(#${p}-water)`}
      />
      <path d="M-40 712 C 220 700, 460 706, 700 720 C 940 734, 1200 732, 1480 716" fill="none" stroke="#bfeef7" strokeWidth="2" opacity="0.5" />
      <rect y="742" width="1440" height="18" fill="#a8e2f2" opacity="0.28" />
    </svg>
  );
}
