"use client";

import { ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { MapPlace } from "@/data/demo-map-places";
import { getCategoryAccentMap } from "@/lib/home/category-accent";
import { CategoryIcon } from "@/lib/home/category-visuals";
import { MapPlaceCard } from "./map-place-card";
import styles from "./map.module.css";

type MapResultsPanelProps = {
  places: MapPlace[];
  selectedPlace?: MapPlace;
  onSelect: (place: MapPlace) => void;
  onClearSelection: () => void;
};

function visiblePlaceCountLabel(count: number) {
  if (count === 1) {
    return "widoczne miejsce";
  }

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return "widoczne miejsca";
  }

  return "widocznych miejsc";
}

function MapResultRow({
  place,
  active,
  onSelect,
}: {
  place: MapPlace;
  active: boolean;
  onSelect: (place: MapPlace) => void;
}) {
  const categorySlug = place.categories[0] ?? "food";
  const accent = getCategoryAccentMap([categorySlug]).get(categorySlug);

  return (
    <button
      type="button"
      className={[styles.resultRow, active ? styles.resultRowSelected : ""].join(" ")}
      style={{ "--category-accent": accent } as CSSProperties}
      onClick={() => onSelect(place)}
    >
      <span className={styles.resultIcon}>
        <CategoryIcon slug={categorySlug} aria-hidden="true" size={20} />
      </span>
      <span className={styles.resultCopy}>
        <span className={styles.resultName}>{place.name}</span>
        <span className={styles.resultMeta}>
          {place.helpTypes.join(" • ")} · {place.distanceLabel}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="shrink-0 text-muted-foreground" size={19} />
    </button>
  );
}

export function MapResultsPanel({
  places,
  selectedPlace,
  onSelect,
  onClearSelection,
}: MapResultsPanelProps) {
  const selectedPlaceId = selectedPlace?.id;

  return (
    <aside className={styles.resultsPanel} aria-label="Miejsca widoczne na mapie">
      <div className={styles.resultsHeader}>
        <div>
          <p className={styles.resultsTitle}>Miejsca na mapie</p>
          <p className={styles.resultsCount}>
            {places.length} {visiblePlaceCountLabel(places.length)}
          </p>
        </div>
        {selectedPlace ? (
          <button
            type="button"
            className={styles.backToList}
            onClick={onClearSelection}
          >
            Wróć do listy
          </button>
        ) : null}
      </div>

      <div className={styles.resultsBody}>
        {selectedPlace ? (
          <div className={styles.detailWrap}>
            <p className={styles.detailEyebrow}>Wybrane miejsce</p>
            <MapPlaceCard place={selectedPlace} />
          </div>
        ) : (
          <ul className={styles.resultsList}>
            {places.map((place) => (
              <li key={place.id}>
                <MapResultRow
                  place={place}
                  active={selectedPlaceId === place.id}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
