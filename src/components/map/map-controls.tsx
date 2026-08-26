"use client";

import { LocateFixed, Search, X } from "lucide-react";
import { useRef } from "react";
import type { MapCategoryFilter } from "./map-filters";
import { MapFilters } from "./map-filters";
import styles from "./map.module.css";

type MapControlsProps = {
  query: string;
  category: MapCategoryFilter;
  openNow: boolean;
  free: boolean;
  filtersOpen: boolean;
  locationPending: boolean;
  locationMessage?: string;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: MapCategoryFilter) => void;
  onOpenNowChange: (value: boolean) => void;
  onFreeChange: (value: boolean) => void;
  onFiltersOpenChange: (value: boolean) => void;
  onLocate: () => void;
};

export function MapControls({
  query,
  category,
  openNow,
  free,
  filtersOpen,
  locationPending,
  locationMessage,
  onQueryChange,
  onCategoryChange,
  onOpenNowChange,
  onFreeChange,
  onFiltersOpenChange,
  onLocate,
}: MapControlsProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className={styles.mapControls} aria-label="Sterowanie mapą">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
        <label className="relative min-w-0">
          <span className="sr-only">Czego potrzebujesz?</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-strong"
            size={20}
          />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Czego potrzebujesz?"
            className={`${styles.mapSearchInput} h-12 w-full min-w-0 rounded-lg border border-border bg-surface pl-11 pr-11 text-base font-normal text-foreground shadow-sm placeholder:font-normal placeholder:text-muted-foreground hover:border-brand focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/30`}
          />
          {query ? <button
            type="button"
            className={styles.mapSearchClear}
            aria-label="Wyczyść wyszukiwanie"
            onClick={() => {
              onQueryChange("");
              searchInputRef.current?.focus();
            }}
          >
            <X aria-hidden="true" size={17} />
          </button> : null}
        </label>
        <button
          type="button"
          className={`${styles.mapLocateButton} touch-target inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-brand bg-surface px-3 text-sm font-semibold text-brand-strong shadow-sm transition hover:bg-brand-soft disabled:cursor-wait disabled:opacity-65 sm:px-4`}
          onClick={onLocate}
          disabled={locationPending}
          aria-describedby={locationMessage ? "map-location-status" : undefined}
        >
          <LocateFixed aria-hidden="true" size={20} />
          <span className="hidden min-[350px]:inline">
            {locationPending ? "Ustalam..." : "Moja lokalizacja"}
          </span>
          <span className="sr-only min-[350px]:hidden">
            {locationPending ? "Ustalam lokalizację" : "Moja lokalizacja"}
          </span>
        </button>
      </div>

      {locationMessage ? (
        <p
          id="map-location-status"
          className={`${styles.mapLocationStatus} rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal leading-5 text-muted-foreground`}
          role="status"
        >
          {locationMessage}
        </p>
      ) : null}

      <MapFilters
        category={category}
        openNow={openNow}
        free={free}
        filtersOpen={filtersOpen}
        onCategoryChange={onCategoryChange}
        onOpenNowChange={onOpenNowChange}
        onFreeChange={onFreeChange}
        onFiltersOpenChange={onFiltersOpenChange}
      />

    </section>
  );
}
