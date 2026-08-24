"use client";

import { MapPinOff, RotateCcw } from "lucide-react";
import styles from "./map.module.css";

type MapEmptyStateProps = {
  areaIsEmpty: boolean;
  onShowAllLodz: () => void;
  onClearFilters: () => void;
};

export function MapEmptyState({
  areaIsEmpty,
  onShowAllLodz,
  onClearFilters,
}: MapEmptyStateProps) {
  return (
    <section
      className={styles.mapEmptyState}
      aria-live="polite"
    >
      <MapPinOff aria-hidden="true" className={styles.mapEmptyIcon} size={26} />
      <h2>
        W tym obszarze nie znaleźliśmy miejsc spełniających wybrane warunki.
      </h2>
      <div className={styles.mapEmptyActions}>
        {areaIsEmpty ? (
          <button
            type="button"
            className={styles.mapEmptyPrimary}
            onClick={onShowAllLodz}
          >
            Pokaż wszystkie w Łodzi
          </button>
        ) : null}
        <button
          type="button"
          className={styles.mapEmptySecondary}
          onClick={onClearFilters}
        >
          <RotateCcw aria-hidden="true" size={17} />
          Wyczyść filtry
        </button>
      </div>
    </section>
  );
}
