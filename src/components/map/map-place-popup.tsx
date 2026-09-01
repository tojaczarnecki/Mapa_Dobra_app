"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Navigation } from "lucide-react";
import type { MapPlace } from "@/data/demo-map-places";
import { directionsHref } from "@/lib/places/actions";
import { mapDetailsHref } from "./map-place-links";
import styles from "./map.module.css";

function hasDistanceLabel(label: string) {
  return Boolean(label.trim()) && label !== "Odległość nieznana";
}

export function MapPlacePopup({ place, returnTo }: { place: MapPlace; returnTo?: string }) {
  const detailsHref = mapDetailsHref(place.detailsHref, returnTo);
  const routeHref = directionsHref(place);
  const status = place.status.kind === "standard" ? place.status.todayHours : place.status.availabilityLabel;

  return (
    <article className={styles.mapPopupContent}>
      <h2>{place.name}</h2>
      <p className={styles.mapPopupTypes}>{place.helpTypes.join(" • ")}</p>
      <p className={styles.mapPopupAddress}>
        <MapPin aria-hidden="true" size={15} />
        <span>{place.address}</span>
      </p>
      <div className={styles.mapPopupMeta}>
        {hasDistanceLabel(place.distanceLabel) ? <span>{place.distanceLabel}</span> : null}
        {status ? <span>{status}</span> : null}
      </div>
      <div className={styles.mapPopupActions}>
        {routeHref ? <a href={routeHref} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" size={14} />Trasa</a> : null}
        <Link href={detailsHref}>Szczegóły<ChevronRight aria-hidden="true" size={14} /></Link>
      </div>
    </article>
  );
}
