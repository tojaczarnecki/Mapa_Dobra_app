"use client";

import dynamic from "next/dynamic";
import { AlertTriangle, List, LoaderCircle, MapPinned, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapPlace } from "@/data/demo-map-places";
import { lodzMapCenter } from "@/data/demo-map-places";
import type { MapFocusTarget } from "./help-map";
import { MapControls } from "./map-controls";
import { MapEmptyState } from "./map-empty-state";
import { MapErrorBoundary } from "./map-error-boundary";
import type { MapCategoryFilter } from "./map-filters";
import { MapPlaceCard } from "./map-place-card";
import { MapResultsPanel } from "./map-results-panel";
import styles from "./map.module.css";

const HelpMap = dynamic(
  () => import("./help-map").then((module) => module.HelpMap),
  {
    ssr: false,
    loading: () => <MapLoadingState />,
  },
);

type LocationState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; position: readonly [number, number] }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "error" };

type MapExperienceProps = {
  places: MapPlace[];
  initialQuery: string;
  initialCategory: MapCategoryFilter;
  initialOpenNow: boolean;
  initialFree: boolean;
  initialLocate: boolean;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .trim();
}

function MapLoadingState() {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-surface-muted" role="status">
      <div className="text-center text-foreground">
        <LoaderCircle aria-hidden="true" className="mx-auto mb-2 text-brand-strong" size={28} />
        <p className="text-sm font-extrabold">Ładowanie mapy...</p>
      </div>
    </div>
  );
}

function MapUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-surface-muted p-4">
      <section className="max-w-sm rounded-lg border border-border bg-surface p-5 text-center shadow-sm" role="alert">
        <AlertTriangle aria-hidden="true" className="mx-auto mb-2 text-urgent" size={28} />
        <h2 className="text-lg font-extrabold text-foreground">Nie udało się uruchomić mapy</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
          Nadal możesz skorzystać z tekstowej listy miejsc.
        </p>
        <button
          type="button"
          className="touch-target mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-foreground hover:bg-brand-strong hover:text-white"
          onClick={onRetry}
        >
          Spróbuj ponownie
        </button>
      </section>
    </div>
  );
}

function locationMessage(location: LocationState) {
  switch (location.status) {
    case "success":
      return "Mapa została wycentrowana na Twojej lokalizacji. Nie zapisujemy jej.";
    case "denied":
      return "Nie uzyskaliśmy dostępu do lokalizacji. Nadal pokazujemy miejsca w Łodzi.";
    case "unavailable":
      return "Przeglądarka nie może teraz ustalić lokalizacji. Nadal pokazujemy Łódź.";
    case "error":
      return "Nie udało się ustalić lokalizacji. Spróbuj ponownie lub korzystaj z mapy Łodzi.";
    default:
      return undefined;
  }
}

function placeCountLabel(count: number) {
  if (count === 1) return "miejsce";
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return "miejsca";
  }
  return "miejsc";
}

export function MapExperience({
  places,
  initialQuery,
  initialCategory,
  initialOpenNow,
  initialFree,
  initialLocate,
}: MapExperienceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<MapCategoryFilter>(initialCategory);
  const [openNow, setOpenNow] = useState(initialOpenNow);
  const [free, setFree] = useState(initialFree);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [visiblePlaceIds, setVisiblePlaceIds] = useState(() => places.map((place) => place.id));
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget>();
  const [tileError, setTileError] = useState(false);
  const [mapResetKey, setMapResetKey] = useState(0);
  const initialLocateRequested = useRef(false);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const desktopCloseRef = useRef<HTMLButtonElement>(null);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return places.filter((place) => {
      const matchesQuery =
        !normalizedQuery ||
        normalizeSearch(place.searchTerms.join(" ")).includes(normalizedQuery);
      const matchesCategory = category === "all" || place.categories.includes(category);

      return matchesQuery && matchesCategory && (!openNow || place.openNow) && (!free || place.free);
    });
  }, [category, free, openNow, places, query]);

  const visiblePlaces = useMemo(
    () => filteredPlaces.filter((place) => visiblePlaceIds.includes(place.id)),
    [filteredPlaces, visiblePlaceIds],
  );

  const selectedPlace = filteredPlaces.find((place) => place.id === selectedPlaceId);
  const compactAccommodationSheet =
    selectedPlace?.status.kind === "accommodation" &&
    selectedPlace.status.availabilityState !== "available";
  const listHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("kategoria", category);
    if (openNow) params.set("otwarte", "1");
    if (free) params.set("bezplatne", "1");
    const queryString = params.toString();
    return queryString ? `/szukaj?${queryString}` : "/szukaj";
  }, [category, free, openNow, query]);

  const focusMap = useCallback((coordinates: readonly [number, number], zoom: number) => {
    setFocusTarget((current) => ({
      coordinates,
      zoom,
      requestId: (current?.requestId ?? 0) + 1,
    }));
  }, []);

  const handlePlaceSelect = useCallback(
    (place: MapPlace) => {
      setSelectedPlaceId(place.id);
      focusMap([place.latitude, place.longitude], 16);
    },
    [focusMap],
  );

  const handleLocate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocation({ status: "unavailable" });
      return;
    }

    setLocation({ status: "pending" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = [position.coords.latitude, position.coords.longitude] as const;
        setLocation({ status: "success", position: coordinates });
        focusMap(coordinates, 15);
      },
      (error) => {
        setLocation({ status: error.code === error.PERMISSION_DENIED ? "denied" : "error" });
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 },
    );
  }, [focusMap]);

  useEffect(() => {
    if (!initialLocate || initialLocateRequested.current) return;
    initialLocateRequested.current = true;
    handleLocate();
  }, [handleLocate, initialLocate]);

  useEffect(() => {
    if (!selectedPlaceId) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPlaceId(undefined);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPlaceId]);

  useEffect(() => {
    if (!selectedPlaceId) return;
    const frame = window.requestAnimationFrame(() => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      (isDesktop ? desktopCloseRef.current : mobileCloseRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedPlaceId]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setCategory("all");
    setOpenNow(false);
    setFree(false);
    setSelectedPlaceId(undefined);
  }, []);

  const retryMap = useCallback(() => {
    setTileError(false);
    setMapResetKey((value) => value + 1);
  }, []);

  return (
    <div className={`${styles.mapPage} map-page`}>
      <h1 className="sr-only">Mapa miejsc pomocy w Łodzi</h1>
      <MapControls
        query={query}
        category={category}
        openNow={openNow}
        free={free}
        filtersOpen={filtersOpen}
        locationPending={location.status === "pending"}
        locationMessage={locationMessage(location)}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onOpenNowChange={setOpenNow}
        onFreeChange={setFree}
        onFiltersOpenChange={setFiltersOpen}
        onLocate={handleLocate}
      />

      <div className={styles.mapLayout}>
        <div className={styles.mapStage}>
          <MapErrorBoundary
            resetKey={mapResetKey}
            fallback={<MapUnavailable onRetry={retryMap} />}
          >
            <HelpMap
              key={mapResetKey}
              places={filteredPlaces}
              selectedPlaceId={selectedPlace?.id}
              userPosition={location.status === "success" ? location.position : undefined}
              focusTarget={focusTarget}
              onPlaceSelect={handlePlaceSelect}
              onVisiblePlacesChange={setVisiblePlaceIds}
              onTileError={() => setTileError(true)}
            />
          </MapErrorBoundary>

          {tileError ? (
            <div className={styles.tileFallback} role="alert">
              <div className={styles.tileFallbackMessage}>
                <AlertTriangle aria-hidden="true" size={20} />
                <div>
                  <strong>Podgląd mapy jest chwilowo niedostępny</strong>
                  <span>Lista miejsc i zapisane miejsca nadal działają.</span>
                </div>
                <button type="button" onClick={retryMap}>Ponów</button>
              </div>
            </div>
          ) : null}

          {filteredPlaces.length === 0 || visiblePlaces.length === 0 ? (
            <MapEmptyState
              areaIsEmpty={filteredPlaces.length > 0}
              onShowAllLodz={() => focusMap(lodzMapCenter, 13)}
              onClearFilters={clearFilters}
            />
          ) : null}

          {selectedPlace ? (
            <div
              className={[
                styles.mobileSheet,
                compactAccommodationSheet ? styles.mobileSheetAccommodation : "",
              ].join(" ")}
              role="dialog"
              aria-label={`Wybrane miejsce: ${selectedPlace.name}`}
            >
              <button
                type="button"
                className={styles.closeSheetButton}
                aria-label="Zamknij kartę miejsca"
                ref={mobileCloseRef}
                onClick={() => setSelectedPlaceId(undefined)}
              >
                <X aria-hidden="true" size={21} />
              </button>
              <MapPlaceCard
                place={selectedPlace}
                compactAccommodation={compactAccommodationSheet}
                scrollBodyFocusable
              />
            </div>
          ) : null}

          {selectedPlace ? (
            <div
              className={styles.desktopDetailPanel}
              role="dialog"
              aria-modal="false"
              aria-label={`Szczegóły miejsca: ${selectedPlace.name}`}
            >
              <button
                type="button"
                className={styles.desktopDetailClose}
                aria-label="Zamknij szczegóły miejsca"
                ref={desktopCloseRef}
                onClick={() => setSelectedPlaceId(undefined)}
              >
                <X aria-hidden="true" size={20} />
              </button>
              <MapPlaceCard place={selectedPlace} />
            </div>
          ) : null}

          <div className={styles.mapPurpose}>
            <MapPinned aria-hidden="true" size={16} />
            Łódź
          </div>

          <span className={styles.mapStageCount} aria-live="polite">
            {filteredPlaces.length} {placeCountLabel(filteredPlaces.length)}
          </span>
          <Link href={listHref} className={styles.mapStageListLink}>
            <List aria-hidden="true" size={18} />
            Pokaż listę
          </Link>
        </div>

        <MapResultsPanel
          places={visiblePlaces}
          selectedPlace={selectedPlace}
          onSelect={handlePlaceSelect}
        />
      </div>
    </div>
  );
}
