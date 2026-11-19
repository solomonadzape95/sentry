"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Locate, Minus, Plus } from "lucide-react";
import type * as Leaflet from "leaflet";
import { formatDays, formatNaira } from "@/lib/format";
import { RiskBadge } from "@/components/ui/badge";
import { BrandLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

export type MapFacility = {
  id: string;
  name: string;
  shortName: string;
  type: string;
  lga: string;
  latitude: number;
  longitude: number;
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  critical: number;
  watch: number;
  stockValue: number;
  earliestCover: number | null;
  topMedicine: string | null;
};

export type MapOpportunity = {
  fromFacilityId: string;
  toFacilityId: string;
  quantity: number;
  unit: string;
  genericName: string;
};

export type MapFilter = "all" | "risk" | "critical";

const LABEL_SIDE: Record<string, "left" | "right" | "top" | "bottom"> = {
  fac_phc: "bottom",
  fac_gh: "left",
  fac_sunrise: "top",
  fac_carepoint: "right",
};

const MARKER_COLOURS = {
  CRITICAL: { mark: "#8b2f1f", soft: "rgba(139,47,31,0.22)" },
  HIGH: { mark: "#7a4a17", soft: "rgba(122,74,23,0.2)" },
  MEDIUM: { mark: "#6f5a3f", soft: "rgba(111,90,63,0.18)" },
  LOW: { mark: "#3d5a3f", soft: "rgba(61,90,63,0.18)" },
  NONE: { mark: "#3d5a3f", soft: "rgba(61,90,63,0.18)" },
} as const;

const MARKER_ICONS: Record<string, string> = {
  PHC: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-4h6v4"/><path d="M12 9v4M10 11h4"/></svg>',
  GENERAL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M9 21v-4h6v4"/><path d="M12 7v6M9 10h6"/><path d="M3 21h18"/></svg>',
  PRIVATE: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg>',
  PHARMACY: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>',
};

function markerIcon(type: string): string {
  return MARKER_ICONS[type] ?? MARKER_ICONS.GENERAL;
}

export function NetworkMap({
  facilities,
  opportunity,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  showRoute = true,
  height = "clamp(380px, 48vh, 520px)",
}: {
  facilities: MapFacility[];
  opportunity: MapOpportunity | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  filter: MapFilter;
  onFilterChange: (filter: MapFilter) => void;
  showRoute?: boolean;
  height?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const initialBoundsRef = useRef<Leaflet.LatLngBounds | null>(null);
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map());
  const routeRef = useRef<Leaflet.Polyline | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const selected = facilities.find((facility) => facility.id === selectedId) ?? null;

  useEffect(() => {
    if (!ready) return;
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map) return;

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    observer.observe(container);

    const settle = window.setTimeout(() => {
      map.invalidateSize({ pan: false });
    }, 900);
    const late = window.setTimeout(() => {
      map.invalidateSize({ pan: false });
    }, 1700);

    return () => {
      observer.disconnect();
      window.clearTimeout(settle);
      window.clearTimeout(late);
    };
  }, [ready]);

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    const markerStore = markersRef.current;

    async function boot() {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: [9.03, 7.39],
        zoom: 10,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
        preferCanvas: true,
        minZoom: 8,
        maxZoom: 16,
      });
      mapRef.current = map;
      map.setMaxBounds([
        [7.9, 5.9],
        [10, 8.9],
      ]);

      const tiles = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> — Esri, DeLorme, NAVTEQ',
          maxZoom: 16,
          maxNativeZoom: 16,
          keepBuffer: 4,
          updateWhenIdle: false,
        },
      );
      tiles.on("tileerror", () => setTilesFailed(true));
      tiles.on("tileload", () => setTilesLoaded(true));
      tiles.addTo(map);

      const labels = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 16,
          maxNativeZoom: 16,
          opacity: 0.72,
          keepBuffer: 4,
          updateWhenIdle: false,
        },
      );
      labels.on("tileerror", () => setTilesFailed(true));
      labels.addTo(map);

      const bounds = L.latLngBounds(
        facilities.map((facility) => [facility.latitude, facility.longitude]),
      ).pad(0.28);
      initialBoundsRef.current = bounds;
      map.fitBounds(bounds, { maxZoom: 12.1 });
      map.on("click", () => onSelectRef.current(null));

      setReady(true);
      window.setTimeout(() => {
        if (mapRef.current !== map) return;
        map?.invalidateSize({ pan: false });
      }, 260);
    }

    void boot();

    return () => {
      cancelled = true;
      markerStore.clear();
      routeRef.current = null;
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // The facility coordinates are static for the life of the workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const targetMap = map;
    let cancelled = false;

    async function renderMarkers() {
      const L = (await import("leaflet")).default;
      if (cancelled) return;

      for (const [, marker] of markersRef.current) marker.remove();
      markersRef.current.clear();

      for (const facility of facilities) {
        const colour = MARKER_COLOURS[facility.risk] ?? MARKER_COLOURS.LOW;
        const labelSide = LABEL_SIDE[facility.id] ?? "bottom";
        const label = facility.critical > 0
          ? `${facility.critical} critical`
          : facility.watch > 0
            ? `${facility.watch} on watch`
            : "Stable cover";

        const icon = L.divIcon({
          className: "sentry-marker-icon",
          iconSize: [42, 42],
          iconAnchor: [21, 21],
          html: `
            <div class="sentry-marker sentry-marker--label-${labelSide} ${facility.id === selectedId ? "is-selected" : ""} ${facility.risk === "CRITICAL" ? "is-critical" : ""}" style="--marker:${colour.mark};--marker-soft:${colour.soft}">
              <span class="sentry-marker__halo"></span>
              <span class="sentry-marker__pin">
                <span class="sentry-marker__icon">${markerIcon(facility.type)}</span>
              </span>
              <span class="sentry-marker__label">${escapeHtml(facility.shortName)}</span>
            </div>
          `,
        });

        const marker = L.marker([facility.latitude, facility.longitude], {
          icon,
          keyboard: true,
          title: facility.name,
          alt: facility.name,
          riseOnHover: true,
        });

        marker.bindTooltip(
          `<strong>${escapeHtml(facility.shortName)}</strong><br/><span style="color:#6c4833">${escapeHtml(label)} · ${formatNaira(facility.stockValue)} stock</span>`,
          {
            direction: "top",
            offset: [0, -16],
            className: "sentry-map-tip",
            opacity: 1,
          },
        );

        marker.on("click", () => onSelectRef.current(facility.id));
        marker.addTo(targetMap);
        markersRef.current.set(facility.id, marker);
      }
    }

    void renderMarkers();
    return () => {
      cancelled = true;
    };
  }, [facilities, ready, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const [id, marker] of markersRef.current) {
      const facility = facilities.find((item) => item.id === id);
      if (!facility) continue;
      const routeEndpoint =
        showRoute &&
        opportunity !== null &&
        (id === opportunity.fromFacilityId || id === opportunity.toFacilityId);
      const visible =
        filter === "all" ||
        (filter === "risk" &&
          (facility.risk === "CRITICAL" ||
            facility.risk === "HIGH" ||
            facility.risk === "MEDIUM")) ||
        (filter === "critical" && facility.risk === "CRITICAL") ||
        id === selectedId ||
        routeEndpoint;
      const wants = visible && !map.hasLayer(marker);
      const has = !visible && map.hasLayer(marker);
      if (wants) marker.addTo(map);
      if (has) marker.remove();
    }
  }, [facilities, filter, opportunity, ready, selectedId, showRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }
    if (!showRoute || !opportunity) return;

    const from = facilities.find((facility) => facility.id === opportunity.fromFacilityId);
    const to = facilities.find((facility) => facility.id === opportunity.toFacilityId);
    if (!from || !to) return;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current) return;
      const route = L.polyline(
        [
          [from.latitude, from.longitude],
          [to.latitude, to.longitude],
        ],
        {
          color: "#492415",
          weight: 2,
          opacity: 0.72,
          dashArray: "6 7",
          lineCap: "round",
          className: "sentry-map-route",
        },
      ).addTo(mapRef.current);
      routeRef.current = route;
    })();
  }, [facilities, opportunity, ready, showRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!selected) {
      if (initialBoundsRef.current) map.fitBounds(initialBoundsRef.current, { maxZoom: 12.1 });
      return;
    }
    map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 12), {
      duration: 0.7,
    });
  }, [ready, selected]);

  return (
    <div className="relative isolate overflow-hidden rounded-[16px] border border-line bg-canvas">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/80 bg-panel/70 px-3.5 py-2.5">
        <div className="flex items-center gap-1 rounded-full border border-line bg-panel p-0.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "risk", label: "At risk" },
              { key: "critical", label: "Critical" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onFilterChange(option.key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[9.5px] font-medium transition-colors",
                filter === option.key
                  ? "bg-ink text-bone"
                  : "text-muted hover:text-ink",
              )}
              aria-pressed={filter === option.key}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[8.5px] uppercase tracking-[0.1em] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-warn" /> Watch
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Stable
          </span>
        </div>
      </div>

      <div className="relative" style={{ height }}>
        <div className="map-underlay pointer-events-none absolute inset-0" aria-hidden="true" />
        <div ref={containerRef} className="absolute inset-0" aria-label="Facility network map" />

        {!tilesLoaded ? (
          <div className="pointer-events-none absolute inset-0 z-[450] grid place-items-center bg-canvas/45 backdrop-blur-[1px]">
            <div className="flex h-9 items-center rounded-full border border-line bg-panel/95 px-4 shadow-sm">
              <BrandLoader
                size="sm"
                label={tilesFailed ? "Basemap offline · markers remain live" : "Loading live map"}
              />
            </div>
          </div>
        ) : null}

        <div className="absolute left-3 top-3 z-[500] flex flex-col gap-1">
          <div className="overflow-hidden rounded-full border border-line bg-panel/90 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="grid h-8 w-8 place-items-center text-muted hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <div className="h-px bg-line" />
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="grid h-8 w-8 place-items-center text-muted hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              if (initialBoundsRef.current) {
                mapRef.current?.fitBounds(initialBoundsRef.current, { maxZoom: 12.1 });
              }
            }}
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel/90 text-muted shadow-sm backdrop-blur hover:text-ink"
            aria-label="Reset map view"
          >
            <Locate className="h-3.5 w-3.5" />
          </button>
        </div>

        {tilesFailed ? (
          <div className="absolute right-3 top-3 z-[500] max-w-[190px] rounded-lg border border-line bg-panel/90 px-2.5 py-1.5 text-[9px] leading-snug text-muted backdrop-blur">
            Basemap unavailable. Facility positions and routes remain live.
          </div>
        ) : null}

        {selected ? (
          <div className="absolute inset-x-3 bottom-3 z-[500] rounded-[12px] border border-line bg-panel/95 p-3.5 shadow-[0_18px_45px_-30px_rgba(25,15,10,0.7)] backdrop-blur sm:inset-x-auto sm:left-3 sm:w-[280px]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {selected.lga} · {selected.type.replace("_", " ").toLowerCase()}
                </p>
                <p className="mt-1 truncate text-[13px] font-medium tracking-[-0.02em] text-ink">
                  {selected.shortName}
                </p>
              </div>
              <RiskBadge risk={selected.risk} compact />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-2.5">
              <div>
                <p className="text-[8px] uppercase tracking-[0.1em] text-muted">Stock value</p>
                <p className="tabular mt-0.5 text-[12px] font-medium text-ink">
                  {formatNaira(selected.stockValue)}
                </p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.1em] text-muted">Earliest cover</p>
                <p className="tabular mt-0.5 text-[12px] font-medium text-ink">
                  {formatDays(selected.earliestCover)}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
              <p className="truncate text-[9.5px] text-muted">
                {selected.topMedicine ?? "No at-risk medicine"}
              </p>
              <Link
                href={`/facilities/${selected.id}`}
                className="inline-flex shrink-0 items-center gap-1 text-[9.5px] font-medium text-ink hover:underline"
              >
                Open <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
