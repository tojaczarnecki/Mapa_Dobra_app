"use client";

import { ChevronDown, ChevronUp, MapPin, Navigation } from "lucide-react";
import { useEffect, useRef } from "react";
import type { MapPlace } from "@/data/demo-map-places";
import { MapPlaceCard } from "./map-place-card";

export type SheetState = "collapsed" | "medium" | "expanded";

type MobileMapSheetProps = {
  places: MapPlace[];
  selectedPlace?: MapPlace;
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  onClearSelection: () => void;
  onSelect: (place: MapPlace) => void;
  returnTo?: string;
};

function nextState(state: SheetState): SheetState {
  return state === "collapsed" ? "medium" : state === "medium" ? "expanded" : "collapsed";
}

export function MobileMapSheet({
  places,
  selectedPlace,
  state,
  onStateChange,
  onClearSelection,
  onSelect,
  returnTo,
}: MobileMapSheetProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const visiblePlaces = state === "medium" ? places.slice(0, 3) : places;
  const title = selectedPlace ? selectedPlace.name : `${places.length} ${places.length === 1 ? "miejsce" : "miejsc"} w pobliżu`;

  useEffect(() => {
    const sheet = sheetRef.current;
    const mapStage = sheet?.parentElement;
    if (!sheet || !mapStage) return;

    const updateHeight = () => {
      mapStage.style.setProperty("--mobile-sheet-height", `${sheet.getBoundingClientRect().height}px`);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHeight);
    observer?.observe(sheet);
    updateHeight();

    return () => {
      observer?.disconnect();
      mapStage.style.removeProperty("--mobile-sheet-height");
    };
  }, [selectedPlace, state, places.length]);

  return (
    <section ref={sheetRef} className={`mobile-map-sheet mobile-map-sheet-${state}`} aria-label="Wyniki na mapie">
      <button
        type="button"
        className="mobile-map-sheet-handle"
        onClick={() => onStateChange(nextState(state))}
        aria-expanded={state !== "collapsed"}
        aria-label={state === "expanded" ? "Zwiń listę miejsc" : "Rozwiń listę miejsc"}
      >
        <span aria-hidden="true" />
      </button>
      <div className="mobile-map-sheet-heading">
        <div>
          <p className="mobile-map-sheet-kicker">{selectedPlace ? "Wybrane miejsce" : "Wyniki wyszukiwania"}</p>
          <h2>{title}</h2>
          {!selectedPlace ? <p>Wybierz pinezkę albo rozwiń listę.</p> : null}
        </div>
        <button type="button" className="mobile-map-sheet-toggle" onClick={() => onStateChange(nextState(state))} aria-label="Zmień wysokość listy">
          {state === "expanded" ? <ChevronDown aria-hidden="true" size={20} /> : <ChevronUp aria-hidden="true" size={20} />}
        </button>
      </div>
      {selectedPlace ? (
        <div className="mobile-map-sheet-selected">
          <MapPlaceCard place={selectedPlace} returnTo={returnTo} />
          <button type="button" className="mobile-map-sheet-clear" onClick={onClearSelection}>Pokaż wszystkie miejsca</button>
        </div>
      ) : state !== "collapsed" ? (
        <ul className="mobile-map-sheet-list" aria-label="Miejsca na mapie">
          {visiblePlaces.map((place) => (
            <li key={place.id}>
              <button type="button" className="mobile-map-sheet-place-button" onClick={() => onSelect(place)}>
              <span className="mobile-map-sheet-place-icon" aria-hidden="true"><MapPin size={18} /></span>
              <span className="mobile-map-sheet-place-copy"><strong>{place.name}</strong><span>{place.helpTypes.join(" • ")} · {place.distanceLabel}</span></span>
              <Navigation aria-hidden="true" size={17} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
