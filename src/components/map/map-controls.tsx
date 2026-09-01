"use client";

import { LocateFixed, Search, Sparkles } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { MapCategoryFilter } from "./map-filters";
import { MapFilters } from "./map-filters";
import styles from "./map.module.css";
import { ClearableSearchInput } from "@/components/ui/clearable-search-input";
import { searchIntentSuggestions, type SearchSuggestion } from "@/lib/places/search-intent";

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
  locationPending: boolean;
  locationMessage?: string;
  onQueryChange: (query: string) => void;
  onQuerySubmit: (queryOverride?: string) => void;
  onCategoryChange: (category: MapCategoryFilter) => void;
  onOpenNowChange: (value: boolean) => void;
  onTodayChange: (value: boolean) => void;
  onFreeChange: (value: boolean) => void;
  onNoReferralChange: (value: boolean) => void;
  onNoDocumentsChange: (value: boolean) => void;
  onFiltersOpenChange: (value: boolean) => void;
  onLocate: () => void;
  onSearchFocusChange: (value: boolean) => void;
};

const categoryLabels: Partial<Record<MapCategoryFilter, string>> = {
  food: "Jedzenie",
  accommodation: "Nocleg",
  hygiene: "Higiena",
  medical: "Zdrowie",
  legal: "Prawna",
  psychological: "Psychologiczna",
  social: "Pomoc socjalna",
  clothing: "Odzież",
  other: "Inne",
};

const suggestionCategory: Record<string, MapCategoryFilter> = {
  "category-jedzenie": "food",
  "category-nocleg": "accommodation",
  "category-higiena": "hygiene",
  "category-pomoc-medyczna": "medical",
  "category-pomoc-prawna": "legal",
  "category-pomoc-psychologiczna": "psychological",
  "category-pomoc-socjalna": "social",
  "category-odziez": "clothing",
  "category-lodowka-spoleczna": "other",
};

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
  onSearchFocusChange,
}: MapControlsProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const suggestions = searchIntentSuggestions(query).slice(0, 5);
  const activeFilterItems = [
    category !== "all" ? { label: categoryLabels[category] ?? category, clear: () => onCategoryChange("all") } : null,
    openNow ? { label: "Otwarte teraz", clear: () => onOpenNowChange(false) } : null,
    today ? { label: "Dzisiaj", clear: () => onTodayChange(false) } : null,
    free ? { label: "Bezpłatne", clear: () => onFreeChange(false) } : null,
    noReferral ? { label: "Bez skierowania", clear: () => onNoReferralChange(false) } : null,
    noDocuments ? { label: "Bez dokumentów", clear: () => onNoDocumentsChange(false) } : null,
  ].filter((item): item is { label: string; clear: () => void } => item !== null);
  const visibleFilterItems = activeFilterItems.length > 2
    ? [{ label: `${activeFilterItems.length} filtry`, clear: () => {
        onCategoryChange("all");
        onOpenNowChange(false);
        onTodayChange(false);
        onFreeChange(false);
        onNoReferralChange(false);
        onNoDocumentsChange(false);
      } }]
    : activeFilterItems;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onQuerySubmit();
  }

  return (
    <section className={[styles.mapControls, styles.mapTopChrome].join(" ")} aria-label="Sterowanie mapą">
      <form className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={submitSearch} role="search">
        <label className="relative min-w-0">
          <span className="sr-only">Czego potrzebujesz?</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-strong"
            size={20}
          />
          <ClearableSearchInput
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onClear={() => onQueryChange("")}
            onFocus={() => {
              setSearchFocused(true);
              onSearchFocusChange(true);
            }}
            onBlur={() => {
              setSearchFocused(false);
              onSearchFocusChange(false);
            }}
            role="combobox"
            aria-expanded={searchFocused && suggestions.length > 0}
            aria-controls="map-search-suggestions"
            placeholder="Czego potrzebujesz?"
            className="h-12 w-full min-w-0 rounded-2xl border border-[#d6dfdc] bg-white pl-11 pr-3 text-base font-semibold text-foreground shadow-sm placeholder:font-normal placeholder:text-muted-foreground hover:border-brand focus:border-brand-strong focus:outline-none focus:ring-2 focus:ring-brand-strong/20"
          />
        </label>
        <button
          type="button"
          className="touch-target inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#d6dfdc] bg-white px-3 text-sm font-extrabold text-brand-strong shadow-sm transition hover:bg-brand-soft disabled:cursor-wait disabled:opacity-65 sm:px-4"
          onClick={onLocate}
          disabled={locationPending}
          aria-describedby={locationMessage ? "map-location-status" : undefined}
        >
          <LocateFixed aria-hidden="true" size={20} />
          <span className="hidden min-[350px]:inline">{locationPending ? "Ustalam..." : "Lokalizacja"}</span>
          <span className="sr-only min-[350px]:hidden">{locationPending ? "Ustalam lokalizację" : "Moja lokalizacja"}</span>
        </button>
      </form>

      {searchFocused && suggestions.length > 0 ? (
        <div id="map-search-suggestions" className={styles.mapSearchSuggestions} role="listbox" aria-label="Podpowiedzi wyszukiwania">
          {suggestions.map((suggestion: SearchSuggestion) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected="false"
              className={styles.mapSearchSuggestion}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const categorySuggestion = suggestionCategory[suggestion.id];
                if (categorySuggestion) {
                  onCategoryChange(categorySuggestion);
                  onQueryChange("");
                } else {
                  onQueryChange(suggestion.query);
                  onQuerySubmit(suggestion.query);
                }
                setSearchFocused(false);
                onSearchFocusChange(false);
              }}
            >
              <Search aria-hidden="true" size={16} />
              <span>
                <strong>{suggestion.label}</strong>
                <small>{suggestion.description}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {intentText ? (
        <div className="smart-map-intent" role="status">
          <Sparkles aria-hidden="true" size={14} />
          <span>Dopasowanie do: „{intentText}”</span>
        </div>
      ) : null}

      {locationMessage ? (
        <p
          id="map-location-status"
          className={styles.locationToast}
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

      {visibleFilterItems.length > 0 ? (
        <div className={styles.mapActiveFilters} aria-label="Aktywne filtry">
          {visibleFilterItems.map((item) => (
            <button key={item.label} type="button" className="filter-chip" onClick={item.clear}>
              <span className="truncate">{item.label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

    </section>
  );
}
