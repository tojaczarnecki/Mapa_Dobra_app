"use client";

import Link from "next/link";
import { List, LocateFixed, Map as MapIcon, Search } from "lucide-react";
import type { MapCategoryFilter } from "./map-filters";
import { MapFilters } from "./map-filters";
import styles from "./map.module.css";

type MapControlsProps = {
  query: string;
  category: MapCategoryFilter;
  openNow: boolean;
  free: boolean;
  filtersOpen: boolean;
  resultCount: number;
  listHref: string;
  locationPending: boolean;
  locationMessage?: string;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: MapCategoryFilter) => void;
  onOpenNowChange: (value: boolean) => void;
  onFreeChange: (value: boolean) => void;
  onFiltersOpenChange: (value: boolean) => void;
  onLocate: () => void;
};

function placeCountLabel(count: number) {
  if (count === 1) return "miejsce";
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return "miejsca";
  return "miejsc";
}

export function MapControls({
  query,
  category,
  openNow,
  free,
  filtersOpen,
  resultCount,
  listHref,
  locationPending,
  locationMessage,
  onQueryChange,
  onCategoryChange,
  onOpenNowChange,
  onFreeChange,
  onFiltersOpenChange,
  onLocate,
}: MapControlsProps) {
  return (
    <section className={styles.mapControls} aria-label="Sterowanie mapą">
      <div className={styles.mapSearchRow}>
        <label className={styles.mapSearchField}>
          <span className="sr-only">Czego potrzebujesz?</span>
          <Search aria-hidden="true" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Czego potrzebujesz?"
          />
        </label>
        <button
          type="button"
          className={styles.locateButton}
          onClick={onLocate}
          disabled={locationPending}
          aria-describedby={locationMessage ? "map-location-status" : undefined}
        >
          <LocateFixed aria-hidden="true" size={19} />
          <span className="hidden min-[390px]:inline">{locationPending ? "Ustalam…" : "Lokalizacja"}</span>
          <span className="sr-only min-[390px]:hidden">{locationPending ? "Ustalam lokalizację" : "Użyj mojej lokalizacji"}</span>
        </button>
      </div>

      {locationMessage ? (
        <p id="map-location-status" className={styles.locationStatus} role="status">
          {locationMessage}
        </p>
      ) : null}

      <div className={styles.mapViewToggle} aria-label="Widok wyników">
        <Link href={listHref}><List aria-hidden="true" size={17} />Lista</Link>
        <span className={styles.mapViewActive} aria-current="page"><MapIcon aria-hidden="true" size={17} />Mapa</span>
      </div>

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

      <div className={styles.mapResultMeta}>
        <span>{resultCount} {placeCountLabel(resultCount)}</span>
        <span>Przesuń mapę, aby zobaczyć inne miejsca</span>
      </div>
    </section>
  );
}
