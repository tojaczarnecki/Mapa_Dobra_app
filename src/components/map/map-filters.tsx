"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapCategory } from "@/data/demo-map-places";
import styles from "./map.module.css";

export type MapCategoryFilter = "all" | MapCategory;

const categoryFilters: Array<{
  value: MapCategoryFilter;
  label: string;
}> = [
  { value: "all", label: "Wszystkie" },
  { value: "food", label: "Jedzenie" },
  { value: "accommodation", label: "Nocleg" },
  { value: "hygiene", label: "Higiena" },
  { value: "medical", label: "Zdrowie" },
  { value: "legal", label: "Prawna" },
  { value: "psychological", label: "Psycholog" },
  { value: "clothing", label: "Odzież" },
  { value: "other", label: "Inne" },
];

type MapFiltersProps = {
  category: MapCategoryFilter;
  openNow: boolean;
  today: boolean;
  free: boolean;
  noReferral: boolean;
  noDocuments: boolean;
  filtersOpen: boolean;
  onCategoryChange: (category: MapCategoryFilter) => void;
  onOpenNowChange: (value: boolean) => void;
  onTodayChange: (value: boolean) => void;
  onFreeChange: (value: boolean) => void;
  onNoReferralChange: (value: boolean) => void;
  onNoDocumentsChange: (value: boolean) => void;
  onFiltersOpenChange: (value: boolean) => void;
};

export function MapFilters({
  category,
  openNow,
  today,
  free,
  noReferral,
  noDocuments,
  filtersOpen,
  onCategoryChange,
  onOpenNowChange,
  onTodayChange,
  onFreeChange,
  onNoReferralChange,
  onNoDocumentsChange,
  onFiltersOpenChange,
}: MapFiltersProps) {
  const activeAdditionalFilters = Number(openNow) + Number(today) + Number(free) + Number(noReferral) + Number(noDocuments);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [showOverflowCue, setShowOverflowCue] = useState(false);

  const updateOverflowCue = useCallback(() => {
    const filters = filtersRef.current;
    if (!filters) return;
    const hiddenContentWidth = filters.scrollWidth - filters.clientWidth - filters.scrollLeft;
    setShowOverflowCue(hiddenContentWidth > 2);
  }, []);

  useEffect(() => {
    const filters = filtersRef.current;
    if (!filters) return;

    updateOverflowCue();
    filters.addEventListener("scroll", updateOverflowCue, { passive: true });
    const resizeObserver = new ResizeObserver(updateOverflowCue);
    resizeObserver.observe(filters);

    return () => {
      filters.removeEventListener("scroll", updateOverflowCue);
      resizeObserver.disconnect();
    };
  }, [updateOverflowCue]);

  const practicalFilters = [
    { label: "Otwarte teraz", active: openNow, toggle: () => onOpenNowChange(!openNow) },
    { label: "Dzisiaj", active: today, toggle: () => onTodayChange(!today) },
    { label: "Bezpłatne", active: free, toggle: () => onFreeChange(!free) },
    { label: "Bez skierowania", active: noReferral, toggle: () => onNoReferralChange(!noReferral) },
    { label: "Bez dokumentów", active: noDocuments, toggle: () => onNoDocumentsChange(!noDocuments) },
  ];

  return (
    <div className="relative min-w-0">
      <div className={[styles.mapFilterViewport, showOverflowCue ? styles.mapFilterViewportFaded : ""].join(" ")}>
        <div
          ref={filtersRef}
          className={`${styles.mapFilterScroll} flex min-w-0 gap-2 overflow-x-auto pb-1 pr-7`}
          aria-label="Kategorie miejsc na mapie"
        >
          {categoryFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={["filter-chip", category === filter.value ? "filter-chip-strong bg-brand-soft" : ""].join(" ")}
              aria-pressed={category === filter.value}
              onClick={() => onCategoryChange(filter.value)}
            >
              {category === filter.value ? <Check aria-hidden="true" size={16} /> : null}
              {filter.label}
            </button>
          ))}
          <button
            type="button"
            className={["filter-chip", filtersOpen || activeAdditionalFilters > 0 ? "filter-chip-strong bg-brand-soft" : ""].join(" ")}
            aria-expanded={filtersOpen}
            aria-controls="map-additional-filters"
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <SlidersHorizontal aria-hidden="true" size={17} />
            Filtry
            {activeAdditionalFilters > 0 ? <span aria-label={`${activeAdditionalFilters} aktywne`}>{activeAdditionalFilters}</span> : null}
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <section
          id="map-additional-filters"
          className="absolute right-0 top-[calc(100%+3.25rem)] z-[var(--layer-sheet)] w-[min(19rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-3 shadow-[0_14px_34px_rgb(17_24_39_/_16%)]"
          aria-label="Dodatkowe filtry mapy"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold text-foreground">Co jest ważne?</h2>
            <button
              type="button"
              className="touch-target inline-flex min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              aria-label="Zamknij filtry"
              onClick={() => onFiltersOpenChange(false)}
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {practicalFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                className={["filter-chip w-full", filter.active ? "filter-chip-strong bg-brand-soft" : ""].join(" ")}
                aria-pressed={filter.active}
                onClick={filter.toggle}
              >
                {filter.active ? <Check aria-hidden="true" size={16} /> : null}
                {filter.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
