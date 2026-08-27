"use client";

import { ChevronRight, MapPin } from "lucide-react";
import type { MapPlace } from "@/data/demo-map-places";
import { MapPlaceCard } from "./map-place-card";

type MapResultsPanelProps = {
  places: MapPlace[];
  selectedPlace?: MapPlace;
  onSelect: (place: MapPlace) => void;
  onClearSelection: () => void;
};

function visiblePlaceCountLabel(count: number) {
  if (count === 1) {
    return "widoczne miejsce";
  }

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return "widoczne miejsca";
  }

  return "widocznych miejsc";
}

export function MapResultsPanel({
  places,
  selectedPlace,
  onSelect,
  onClearSelection,
}: MapResultsPanelProps) {
  return (
    <aside className="hidden h-full min-h-0 w-[22rem] shrink-0 flex-col overflow-hidden border-l border-border bg-background lg:flex" aria-label="Miejsca widoczne na mapie">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4">
        <div>
          <p className="text-sm font-extrabold text-foreground">Miejsca na mapie</p>
          <p className="text-xs font-semibold text-muted-foreground">
            {places.length} {visiblePlaceCountLabel(places.length)}
          </p>
        </div>
        {selectedPlace ? (
          <button
            type="button"
            className="touch-target rounded-md px-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft"
            onClick={onClearSelection}
          >
            Wróć do listy
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {selectedPlace ? (
          <MapPlaceCard place={selectedPlace} />
        ) : (
          <ul className="grid gap-2">
            {places.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left transition hover:border-brand hover:bg-brand-soft"
                  onClick={() => onSelect(place)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                    <MapPin aria-hidden="true" size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold leading-5 text-foreground">
                      {place.name}
                    </span>
                    <span className="block text-xs font-semibold text-muted-foreground">
                      {place.helpTypes.join(" • ")} · {place.distanceLabel}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="shrink-0 text-muted-foreground" size={19} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
