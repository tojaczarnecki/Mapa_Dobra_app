"use client";

import { ChevronRight, MapPin, X } from "lucide-react";
import type { MapPlace } from "@/data/demo-map-places";
import { MapPlaceCard } from "./map-place-card";
import styles from "./map.module.css";

type MapResultsPanelProps = {
  places: MapPlace[];
  selectedPlace?: MapPlace;
  onSelect: (place: MapPlace) => void;
  onClearSelection: () => void;
  returnTo?: string;
};

function visiblePlaceCountLabel(count: number) {
  if (count === 1) return "widoczne miejsce";

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return "widoczne miejsca";
  }
  return "widocznych miejsc";
}

export function MapResultsPanel({
  places,
  selectedPlace,
  onSelect,
  onClearSelection,
  returnTo,
}: MapResultsPanelProps) {
  return (
    <aside
      className={`${styles.mapResultsPanel} hidden h-full min-h-0 shrink-0 flex-col overflow-hidden lg:flex`}
      aria-label="Miejsca widoczne na mapie"
    >
      <div className={styles.mapResultsHeader}>
        <div>
          <p className={styles.mapResultsTitle}>Miejsca na mapie</p>
          <p className={styles.mapResultsCount}>
            {places.length} {visiblePlaceCountLabel(places.length)}
          </p>
        </div>
        {selectedPlace ? (
          <button
            type="button"
            className={styles.mapResultsClear}
            onClick={onClearSelection}
          >
            <X aria-hidden="true" size={16} />
            Zamknij
          </button>
        ) : null}
      </div>

      <div className={styles.mapResultsScroll}>
        {selectedPlace ? (
          <div className={styles.mapSelectedPlace}>
            <MapPlaceCard place={selectedPlace} returnTo={returnTo} />
          </div>
        ) : null}

        <ul className={styles.mapResultsList} aria-label="Lista miejsc widocznych na mapie">
          {places.map((place) => {
            const selected = selectedPlace?.id === place.id;
            return (
              <li key={place.id}>
                <button
                  type="button"
                  className={[
                    styles.mapResultItem,
                    selected
                      ? styles.mapResultItemSelected
                      : "",
                  ].join(" ")}
                  onClick={() => onSelect(place)}
                  aria-current={selected ? "true" : undefined}
                >
                  <span
                    className={`${styles.mapResultIcon} ${selected ? styles.mapResultIconSelected : ""}`}
                  >
                    <MapPin aria-hidden="true" size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={styles.mapResultName}>
                      {place.name}
                    </span>
                    <span className={styles.mapResultMeta}>
                      {place.helpTypes.join(" • ")} · {place.distanceLabel}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className={`${styles.mapResultChevron} ${selected ? styles.mapResultChevronSelected : ""}`}
                    size={19}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
