"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapCategory } from "@/data/demo-map-places";
import styles from "./map.module.css";

export type MapCategoryFilter = "all" | MapCategory;

const categoryFilters: Array<{ value: MapCategoryFilter; label: string }> = [
  { value: "all", label: "Wszystkie" },
  { value: "food", label: "Jedzenie" },
  { value: "accommodation", label: "Nocleg" },
  { value: "hygiene", label: "Higiena" },
  { value: "medical", label: "Medyczna" },
  { value: "legal", label: "Prawna" },
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
    setShowOverflowCue(filters.scrollWidth - filters.clientWidth - filters.scrollLeft > 2);
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

  return (
    <div className={styles.filterArea}>
      <div className={[styles.mapFilterViewport, showOverflowCue ? styles.mapFilterViewportFaded : ""].join(" ")}>
        <div ref={filtersRef} className={styles.mapFilterScroll} aria-label="Kategorie miejsc na mapie">
          {categoryFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={styles.mapFilterChip}
              data-active={category === filter.value || undefined}
              aria-pressed={category === filter.value}
              onClick={() => onCategoryChange(filter.value)}
            >
              {category === filter.value ? <Check aria-hidden="true" size={14} /> : null}
              {filter.label}
            </button>
          ))}
          <button
            type="button"
            className={styles.mapFilterChip}
            data-active={filtersOpen || activeAdditionalFilters > 0 || undefined}
            aria-expanded={filtersOpen}
            aria-controls="map-additional-filters"
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <SlidersHorizontal aria-hidden="true" size={15} />
            Filtry{activeAdditionalFilters > 0 ? ` (${activeAdditionalFilters})` : ""}
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <section id="map-additional-filters" className={styles.additionalFilters} aria-label="Dodatkowe filtry mapy">
          <div className={styles.additionalFiltersHeader}>
            <h2>Filtry</h2>
            <button type="button" aria-label="Zamknij filtry" onClick={() => onFiltersOpenChange(false)}>
              <X aria-hidden="true" size={19} />
            </button>
          </div>
          <div className={styles.additionalFilterOptions}>
            <button type="button" data-active={openNow || undefined} aria-pressed={openNow} onClick={() => onOpenNowChange(!openNow)}>
              {openNow ? <Check aria-hidden="true" size={15} /> : null}Otwarte teraz
            </button>
            <button type="button" data-active={today || undefined} aria-pressed={today} onClick={() => onTodayChange(!today)}>
              {today ? <Check aria-hidden="true" size={15} /> : null}Dzisiaj
            </button>
            <button type="button" data-active={free || undefined} aria-pressed={free} onClick={() => onFreeChange(!free)}>
              {free ? <Check aria-hidden="true" size={15} /> : null}Bezpłatne
            </button>
            <button type="button" data-active={noReferral || undefined} aria-pressed={noReferral} onClick={() => onNoReferralChange(!noReferral)}>
              {noReferral ? <Check aria-hidden="true" size={15} /> : null}Bez skierowania
            </button>
            <button type="button" data-active={noDocuments || undefined} aria-pressed={noDocuments} onClick={() => onNoDocumentsChange(!noDocuments)}>
              {noDocuments ? <Check aria-hidden="true" size={15} /> : null}Bez dokumentów
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
