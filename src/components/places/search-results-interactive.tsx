"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { List, Maximize2, Minimize2, X } from "lucide-react";
import type { MapPlace } from "@/data/demo-map-places";
import { SearchResultsMap } from "./search-results-map";
import { MapPlacePopup } from "@/components/map/map-place-popup";

export const SearchResultsMapContext = createContext<{ expanded: boolean; toggle: () => void; locate: () => void } | null>(null);

export function SearchResultsMapToggle() {
  const map = useContext(SearchResultsMapContext);
  if (!map) return null;
  return (
    <button type="button" className="search-results-map-expand" aria-label={map.expanded ? "Wróć do widoku lista i mapa" : "Powiększ mapę"} title={map.expanded ? "Wróć do widoku lista i mapa" : "Powiększ mapę"} onClick={map.toggle}>
      {map.expanded ? <Minimize2 aria-hidden="true" size={18} /> : <Maximize2 aria-hidden="true" size={18} />}
    </button>
  );
}

export function SearchResultsInteractive({ places, children, mapView = false, listHref = "/szukaj" }: { places: MapPlace[]; children: ReactNode; mapView?: boolean; listHref?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [mapExpanded, setMapExpanded] = useState(false);
  const [pendingScrollPlaceId, setPendingScrollPlaceId] = useState<string>();
  const [userPosition, setUserPosition] = useState<readonly [number, number]>();
  const [focusTarget, setFocusTarget] = useState<{ coordinates: readonly [number, number]; zoom: number; requestId: number }>();
  const selectedPlace = places.find((place) => place.id === selectedPlaceId);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates: readonly [number, number] = [coords.latitude, coords.longitude];
        setUserPosition(coordinates);
        setFocusTarget({ coordinates, zoom: 14, requestId: Date.now() });
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const scrollCardIntoView = useCallback((placeId: string) => {
    const root = rootRef.current;
    const list = root?.querySelector<HTMLElement>("[data-search-result-list]");
    const card = root?.querySelector<HTMLElement>(`[data-search-result-id="${CSS.escape(placeId)}"]`);
    if (!list || !card) return;

    const listRect = list.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const listScrolls = list.scrollHeight > list.clientHeight + 1;

    if (listScrolls) {
      if (cardRect.top < listRect.top) list.scrollBy({ top: cardRect.top - listRect.top - 12, behavior: "smooth" });
      if (cardRect.bottom > listRect.bottom) list.scrollBy({ top: cardRect.bottom - listRect.bottom + 12, behavior: "smooth" });
      return;
    }

    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectPlace = useCallback((placeId: string, shouldScroll: boolean) => {
    setSelectedPlaceId(placeId);
    if (shouldScroll) {
      setPendingScrollPlaceId(placeId);
      setMapExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (!pendingScrollPlaceId || mapExpanded) return;

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        scrollCardIntoView(pendingScrollPlaceId);
        setPendingScrollPlaceId(undefined);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [mapExpanded, pendingScrollPlaceId, scrollCardIntoView]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-search-result-id]").forEach((card) => {
      const selected = card.dataset.searchResultId === selectedPlaceId;
      card.dataset.selected = selected ? "true" : "false";
    });
  }, [selectedPlaceId]);

  return (
    <SearchResultsMapContext.Provider value={{ expanded: mapExpanded, toggle: () => setMapExpanded((expanded) => !expanded), locate }}>
    <div
      ref={rootRef}
      className={["search-results-workspace grid min-w-0 gap-4 lg:grid-cols-[minmax(0,680px)_minmax(320px,1fr)] lg:items-start lg:gap-8", mapExpanded ? "search-results-workspace-map-expanded" : ""].join(" ")}
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
        <div className="search-results-map-frame relative h-[min(68dvh,720px)] min-h-[34rem] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
          {mapView ? <Link className="search-results-map-list-link" href={listHref} aria-label={`Wróć do listy wyników, ${places.length} ${places.length === 1 ? "miejsce" : "miejsca"}`}><List aria-hidden="true" size={16} strokeWidth={2.25} />Lista <span aria-hidden="true">({places.length})</span></Link> : null}
          {mapView ? <Link className="search-results-map-close-link" href={listHref} aria-label="Zamknij mapę" title="Zamknij mapę"><X aria-hidden="true" size={18} /></Link> : <SearchResultsMapToggle />}
          <SearchResultsMap
            places={places}
            userPosition={userPosition}
            focusTarget={focusTarget}
            resizeKey={mapExpanded ? "expanded" : "split"}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={(place) => selectPlace(place.id, true)}
            onPlaceDeselect={(placeId) => setSelectedPlaceId((current) => current === placeId ? undefined : current)}
          />
          {mapView && selectedPlace ? (
            <section className="search-results-mobile-selected-place" aria-label="Wybrane miejsce">
              <button type="button" className="search-results-mobile-selected-place-close" aria-label="Zamknij szczegóły miejsca" onClick={() => setSelectedPlaceId(undefined)}>
                <X aria-hidden="true" size={18} />
              </button>
              <MapPlacePopup place={selectedPlace} />
            </section>
          ) : null}
        </div>
        <span className="sr-only">Mapa z wynikami wyszukiwania. Liczba miejsc: {places.length}.</span>
      </aside>
    </div>
    </SearchResultsMapContext.Provider>
  );
}
