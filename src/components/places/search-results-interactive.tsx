"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { MapPlace } from "@/data/demo-map-places";
import { SearchResultsMap } from "./search-results-map";

export function SearchResultsInteractive({ places, children }: { places: MapPlace[]; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();

  const scrollCardIntoView = useCallback((placeId: string) => {
    const root = rootRef.current;
    const list = root?.querySelector<HTMLElement>("[data-search-result-list]");
    const card = root?.querySelector<HTMLElement>(`[data-search-result-id="${CSS.escape(placeId)}"]`);
    if (!list || !card) return;

    const listRect = list.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (cardRect.top < listRect.top) list.scrollBy({ top: cardRect.top - listRect.top - 12, behavior: "smooth" });
    if (cardRect.bottom > listRect.bottom) list.scrollBy({ top: cardRect.bottom - listRect.bottom + 12, behavior: "smooth" });
  }, []);

  const selectPlace = useCallback((placeId: string, shouldScroll: boolean) => {
    setSelectedPlaceId(placeId);
    if (shouldScroll) window.requestAnimationFrame(() => scrollCardIntoView(placeId));
  }, [scrollCardIntoView]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-search-result-id]").forEach((card) => {
      const selected = card.dataset.searchResultId === selectedPlaceId;
      card.dataset.selected = selected ? "true" : "false";
    });
  }, [selectedPlaceId]);

  return (
    <div
      ref={rootRef}
      className="search-results-workspace grid min-w-0 gap-4 lg:grid-cols-[minmax(0,680px)_minmax(320px,1fr)] lg:items-start lg:gap-8"
      onClick={(event) => {
        const card = (event.target as HTMLElement).closest<HTMLElement>("[data-search-result-id]");
        if (card && !(event.target as HTMLElement).closest("a,button,input,select,summary")) selectPlace(card.dataset.searchResultId ?? "", false);
      }}
      onFocusCapture={(event) => {
        const card = (event.target as HTMLElement).closest<HTMLElement>("[data-search-result-id]");
        if (card?.dataset.searchResultId) selectPlace(card.dataset.searchResultId, false);
      }}
    >
      {children}
      <aside className="search-results-map-workspace hidden lg:sticky lg:top-24 lg:block" aria-label="Mapa wyników wyszukiwania">
        <div className="search-results-map-frame h-[min(68dvh,720px)] min-h-[34rem] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
          <SearchResultsMap
            places={places}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={(place) => selectPlace(place.id, true)}
            onPlaceDeselect={(placeId) => setSelectedPlaceId((current) => current === placeId ? undefined : current)}
          />
        </div>
        <span className="sr-only">Mapa z wynikami wyszukiwania. Liczba miejsc: {places.length}.</span>
      </aside>
    </div>
  );
}
