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
  if (count === 1) return "widoczne miejsce";
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return "widoczne miejsca";
  return "widocznych miejsc";
}

export function MapResultsPanel({ places, selectedPlace, onSelect, onClearSelection }: MapResultsPanelProps) {
  return (
    <aside className="hidden h-full min-h-0 w-[21rem] shrink-0 flex-col overflow-hidden border-l border-[var(--md-line)] bg-white lg:flex" aria-label="Miejsca widoczne na mapie">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--md-line)] px-4">
        <div>
          <p className="text-sm font-extrabold text-[var(--md-text)]">Miejsca na mapie</p>
          <p className="text-[0.68rem] font-semibold text-[var(--md-muted)]">{places.length} {visiblePlaceCountLabel(places.length)}</p>
        </div>
        {selectedPlace ? (
          <button type="button" className="min-h-10 rounded-md px-2 text-xs font-extrabold text-[var(--md-navy)] hover:bg-[var(--md-navy-soft)]" onClick={onClearSelection}>
            Wróć do listy
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selectedPlace ? (
          <div className="p-3"><MapPlaceCard place={selectedPlace} /></div>
        ) : (
          <ul>
            {places.map((place) => (
              <li key={place.id} className="border-b border-[var(--md-line)] last:border-b-0">
                <button type="button" className="grid min-h-[76px] w-full grid-cols-[38px_minmax(0,1fr)_18px] items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-[var(--md-surface-soft)]" onClick={() => onSelect(place)}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--md-surface-soft)] text-[var(--md-navy)]">
                    <MapPin aria-hidden="true" size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.78rem] font-extrabold leading-5 text-[var(--md-text)]">{place.name}</span>
                    <span className="block truncate text-[0.65rem] font-semibold text-[var(--md-muted)]">{place.helpTypes.slice(0, 2).join(" · ")}</span>
                    <span className="mt-0.5 block text-[0.65rem] font-semibold text-[var(--md-muted)]">{place.distanceLabel}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="text-[var(--md-muted)]" size={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
