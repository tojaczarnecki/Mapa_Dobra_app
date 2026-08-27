"use client";

import dynamic from "next/dynamic";
import { AlertTriangle, LoaderCircle, MapPinned, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapPlace } from "@/data/demo-map-places";
import { lodzMapCenter } from "@/data/demo-map-places";
import { interpretSearchQuery } from "@/lib/places/search-intent";
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

const publicCategoryByMapCategory: Partial<Record<MapCategoryFilter, string>> = {
  food: "jedzenie",
  accommodation: "nocleg",
  hygiene: "higiena",
  medical: "pomoc-medyczna",
  legal: "pomoc-prawna",
};

const mapCategoryByPublicCategory: Record<string, MapCategoryFilter> = {
  jedzenie: "food",
  nocleg: "accommodation",
  higiena: "hygiene",
  prysznic: "hygiene",
  "pomoc-medyczna": "medical",
  "pomoc-prawna": "legal",
};

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
  initialIntentText: string;
  initialCategory: MapCategoryFilter;
  initialOpenNow: boolean;
  initialToday: boolean;
  initialFree: boolean;
  initialNoReferral: boolean;
  initialNoDocuments: boolean;
  initialLocate: boolean;
  todayEligibleIds: string[];
  noReferralEligibleIds: string[];
  noDocumentsEligibleIds: string[];
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

export function MapExperience({
  places,
  initialQuery,
  initialIntentText,
  initialCategory,
  initialOpenNow,
  initialToday,
  initialFree,
  initialNoReferral,
  initialNoDocuments,
  initialLocate,
  todayEligibleIds,
  noReferralEligibleIds,
  noDocumentsEligibleIds,
}: MapExperienceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [intentText, setIntentText] = useState(initialIntentText);
  const [category, setCategory] = useState<MapCategoryFilter>(initialCategory);
  const [openNow, setOpenNow] = useState(initialOpenNow);
  const [today, setToday] = useState(initialToday);
  const [free, setFree] = useState(initialFree);
  const [noReferral, setNoReferral] = useState(initialNoReferral);
  const [noDocuments, setNoDocuments] = useState(initialNoDocuments);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [visiblePlaceIds, setVisiblePlaceIds] = useState(() => places.map((place) => place.id));
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget>();
  const [tileError, setTileError] = useState(false);
  const [mapResetKey, setMapResetKey] = useState(0);
  const initialLocateRequested = useRef(false);

  const todayEligible = useMemo(() => new Set(todayEligibleIds), [todayEligibleIds]);
  const noReferralEligible = useMemo(() => new Set(noReferralEligibleIds), [noReferralEligibleIds]);
  const noDocumentsEligible = useMemo(() => new Set(noDocumentsEligibleIds), [noDocumentsEligibleIds]);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return places.filter((place) => {
      const matchesQuery =
        !normalizedQuery ||
        normalizeSearch(place.searchTerms.join(" ")).includes(normalizedQuery);
      const matchesCategory = category === "all" || place.categories.includes(category);
      const matchesToday = !today || todayEligible.has(place.id);
      const matchesReferral = !noReferral || noReferralEligible.has(place.id);
      const matchesDocuments = !noDocuments || noDocumentsEligible.has(place.id);

      return matchesQuery && matchesCategory && matchesToday && matchesReferral && matchesDocuments && (!openNow || place.openNow) && (!free || place.free);
    });
  }, [category, free, noDocuments, noDocumentsEligible, noReferral, noReferralEligible, openNow, places, query, today, todayEligible]);

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
    if (intentText.trim()) params.set("zapytanie", intentText.trim());
    else if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("kategoria", publicCategoryByMapCategory[category] ?? category);
    if (openNow) params.set("otwarte", "1");
    if (today) params.set("dzisiaj", "1");
    if (free) params.set("bezplatne", "1");
    if (noReferral) params.set("bez_skierowania", "1");
    if (noDocuments) params.set("bez_dokumentow", "1");
    const queryString = params.toString();
    return queryString ? `/szukaj?${queryString}` : "/szukaj";
  }, [category, free, intentText, noDocuments, noReferral, openNow, query, today]);

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

  const handleQueryChange = useCallback((value: string) => {
    if (intentText) {
      setIntentText("");
      setCategory("all");
      setOpenNow(false);
      setToday(false);
      setFree(false);
      setNoReferral(false);
      setNoDocuments(false);
    }
    setQuery(value);
  }, [intentText]);

  const handleQuerySubmit = useCallback(() => {
    const source = (intentText || query).trim();
    if (!source) return;
    const intent = interpretSearchQuery(source);
    if (!intent.recognized) return;

    setIntentText(source);
    setQuery("");
    setCategory(intent.filters.category ? mapCategoryByPublicCategory[intent.filters.category] ?? "all" : "all");
    setOpenNow(intent.filters.openNow === true);
    setToday(intent.filters.today === true);
    setFree(intent.filters.free === true);
    setNoReferral(intent.filters.noReferral === true);
    setNoDocuments(intent.filters.noDocuments === true);
    setSelectedPlaceId(undefined);
    if (intent.filters.sort === "distance") handleLocate();
  }, [handleLocate, intentText, query]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setIntentText("");
    setCategory("all");
    setOpenNow(false);
    setToday(false);
    setFree(false);
    setNoReferral(false);
    setNoDocuments(false);
    setSelectedPlaceId(undefined);
  }, []);

  const retryMap = useCallback(() => {
    setTileError(false);
    setMapResetKey((value) => value + 1);
  }, []);

  return (
    <div className={styles.mapPage}>
      <h1 className="sr-only">Mapa miejsc pomocy w Łodzi</h1>
      <MapControls
        query={intentText || query}
        intentText={intentText}
        category={category}
        openNow={openNow}
        today={today}
        free={free}
        noReferral={noReferral}
        noDocuments={noDocuments}
        filtersOpen={filtersOpen}
        resultCount={filteredPlaces.length}
        listHref={listHref}
        locationPending={location.status === "pending"}
        locationMessage={locationMessage(location)}
        onQueryChange={handleQueryChange}
        onQuerySubmit={handleQuerySubmit}
        onCategoryChange={setCategory}
        onOpenNowChange={setOpenNow}
        onTodayChange={setToday}
        onFreeChange={setFree}
        onNoReferralChange={setNoReferral}
        onNoDocumentsChange={setNoDocuments}
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
            <div className={styles.tileError} role="alert">
              <AlertTriangle aria-hidden="true" size={18} />
              <span>Kafelki mapy nie wczytały się. Lista miejsc nadal działa.</span>
              <button type="button" onClick={retryMap}>
                Ponów
              </button>
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
                onClick={() => setSelectedPlaceId(undefined)}
              >
                <X aria-hidden="true" size={21} />
              </button>
              <MapPlaceCard
                place={selectedPlace}
                compactAccommodation={compactAccommodationSheet}
              />
            </div>
          ) : null}

          <div className={styles.mapPurpose}>
            <MapPinned aria-hidden="true" size={16} />
            Łódź
          </div>
        </div>

        <MapResultsPanel
          places={visiblePlaces}
          selectedPlace={selectedPlace}
          onSelect={handlePlaceSelect}
          onClearSelection={() => setSelectedPlaceId(undefined)}
        />
      </div>
    </div>
  );
}
