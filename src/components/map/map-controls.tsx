"use client";

import Link from "next/link";
import { List, LocateFixed, Map as MapIcon, Search, Sparkles } from "lucide-react";
import type { FormEvent } from "react";
import type { MapCategoryFilter } from "./map-filters";
import { MapFilters } from "./map-filters";
import styles from "./map.module.css";

type MapControlsProps = {
  query: string;
  intentText: string;
  category: MapCategoryFilter;
  openNow: boolean;
  today: boolean;
  free: boolean;
  noReferral: boolean;
  noDocuments: boolean;
  filtersOpen: boolean;
  resultCount: number;
  listHref: string;
  locationPending: boolean;
  locationMessage?: string;
  onQueryChange: (query: string) => void;
  onQuerySubmit: () => void;
  onCategoryChange: (category: MapCategoryFilter) => void;
  onOpenNowChange: (value: boolean) => void;
  onTodayChange: (value: boolean) => void;
  onFreeChange: (value: boolean) => void;
  onNoReferralChange: (value: boolean) => void;
  onNoDocumentsChange: (value: boolean) => void;
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
  intentText,
  category,
  openNow,
  today,
  free,
  noReferral,
  noDocuments,
  filtersOpen,
  resultCount,
  listHref,
  locationPending,
  locationMessage,
  onQueryChange,
  onQuerySubmit,
  onCategoryChange,
  onOpenNowChange,
  onTodayChange,
  onFreeChange,
  onNoReferralChange,
  onNoDocumentsChange,
  onFiltersOpenChange,
  onLocate,
}: MapControlsProps) {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onQuerySubmit();
  }

  return (
    <section className={styles.mapControls} aria-label="Sterowanie mapą">
      <form className={styles.mapSearchRow} onSubmit={submitSearch} role="search">
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
      </form>

      {intentText ? (
        <div className="md-map-intent" role="status">
          <Sparkles aria-hidden="true" size={14} />
          <span>Dopasowanie do: „{intentText}”</span>
        </div>
      ) : null}

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
        today={today}
        free={free}
        noReferral={noReferral}
        noDocuments={noDocuments}
        filtersOpen={filtersOpen}
        onCategoryChange={onCategoryChange}
        onOpenNowChange={onOpenNowChange}
        onTodayChange={onTodayChange}
        onFreeChange={onFreeChange}
        onNoReferralChange={onNoReferralChange}
        onNoDocumentsChange={onNoDocumentsChange}
        onFiltersOpenChange={onFiltersOpenChange}
      />

      <div className={styles.mapResultMeta}>
        <span>{resultCount} {placeCountLabel(resultCount)}</span>
        <span>Przesuń mapę, aby zobaczyć inne miejsca</span>
      </div>
    </section>
  );
}
