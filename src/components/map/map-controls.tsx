"use client";

import Link from "next/link";
import { List, LocateFixed, Search, Sparkles } from "lucide-react";
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
      <form className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={submitSearch} role="search">
        <label className="relative min-w-0">
          <span className="sr-only">Czego potrzebujesz?</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-strong"
            size={20}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Czego potrzebujesz?"
            className="h-12 w-full min-w-0 rounded-lg border border-border bg-surface pl-11 pr-3 text-base font-semibold text-foreground shadow-sm placeholder:font-normal placeholder:text-muted-foreground hover:border-brand focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/30"
          />
        </label>
        <button
          type="button"
          className="touch-target inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-brand bg-surface px-3 text-sm font-extrabold text-brand-strong shadow-sm transition hover:bg-brand-soft disabled:cursor-wait disabled:opacity-65 sm:px-4"
          onClick={onLocate}
          disabled={locationPending}
          aria-describedby={locationMessage ? "map-location-status" : undefined}
        >
          <LocateFixed aria-hidden="true" size={20} />
          <span className="hidden min-[350px]:inline">{locationPending ? "Ustalam..." : "Lokalizacja"}</span>
          <span className="sr-only min-[350px]:hidden">{locationPending ? "Ustalam lokalizację" : "Moja lokalizacja"}</span>
        </button>
      </form>

      {intentText ? (
        <div className="smart-map-intent" role="status">
          <Sparkles aria-hidden="true" size={14} />
          <span>Dopasowanie do: „{intentText}”</span>
        </div>
      ) : null}

      {locationMessage ? (
        <p
          id="map-location-status"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold leading-5 text-muted-foreground"
          role="status"
        >
          {locationMessage}
        </p>
      ) : null}

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

      <div className="flex min-h-11 min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-bold text-muted-foreground" aria-live="polite">
          {resultCount} {placeCountLabel(resultCount)} na mapie
        </p>
        <Link
          href={listHref}
          className="touch-target inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 text-sm font-extrabold text-brand-strong transition hover:bg-brand-soft hover:text-foreground"
        >
          <List aria-hidden="true" size={18} />
          Pokaż listę
        </Link>
      </div>
    </section>
  );
}
