"use client";

import dynamic from "next/dynamic";
import type { MapPlace } from "@/data/demo-map-places";

const HelpMap = dynamic(() => import("@/components/map/help-map").then((module) => module.HelpMap), { ssr: false });

export function SearchResultsMap({ places, selectedPlaceId, onPlaceSelect, onPlaceDeselect }: {
  places: MapPlace[];
  selectedPlaceId?: string;
  onPlaceSelect: (place: MapPlace) => void;
  onPlaceDeselect: (placeId: string) => void;
}) {
  return (
    <div className="search-results-map h-full min-h-full min-w-0 overflow-hidden">
        <HelpMap
        places={places}
        selectedPlaceId={selectedPlaceId}
        onPlaceSelect={onPlaceSelect}
        onPlaceDeselect={onPlaceDeselect}
        onViewportChange={() => undefined}
        onTileError={() => undefined}
      />
      <span className="sr-only">Mapa z wynikami wyszukiwania. Liczba miejsc: {places.length}.</span>
    </div>
  );
}
