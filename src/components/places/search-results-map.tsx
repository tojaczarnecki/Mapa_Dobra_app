"use client";

import dynamic from "next/dynamic";
import type { MapPlace } from "@/data/demo-map-places";

const HelpMap = dynamic(() => import("@/components/map/help-map").then((module) => module.HelpMap), { ssr: false });

export function SearchResultsMap({ places }: { places: MapPlace[] }) {
  return (
    <div className="h-[min(68dvh,720px)] min-h-[34rem] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
      <HelpMap
        places={places}
        onPlaceSelect={() => undefined}
        onPlaceDeselect={() => undefined}
        onViewportChange={() => undefined}
        onTileError={() => undefined}
      />
      <span className="sr-only">Mapa z wynikami wyszukiwania. Liczba miejsc: {places.length}.</span>
    </div>
  );
}
