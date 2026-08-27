"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Navigation, Phone } from "lucide-react";
import type { MapPlace } from "@/data/demo-map-places";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import styles from "./map.module.css";

function standardStatus(place: MapPlace) {
  if (place.status.kind !== "standard") return undefined;
  const status = place.status.status;
  if (status === "open") return { label: place.status.todayHours || "Otwarte teraz", tone: "open" };
  if (status === "openToday") return { label: place.status.todayHours || "Otwarte dzisiaj", tone: "open" };
  if (status === "closed") return { label: place.status.todayHours || "Zamknięte teraz", tone: "closed" };
  return { label: place.status.todayHours || "Godziny do potwierdzenia", tone: "warning" };
}

export function MapPlaceCard({
  place,
  compactAccommodation = false,
}: {
  place: MapPlace;
  compactAccommodation?: boolean;
}) {
  const callHref = telephoneHref(place.phone);
  const routeHref = directionsHref(place);
  const isAccommodation = place.status.kind === "accommodation";
  const standard = standardStatus(place);
  const accommodationLabel = place.status.kind === "accommodation" ? place.status.availabilityLabel : undefined;
  const accommodationTone = place.status.kind === "accommodation"
    ? place.status.availabilityState === "available" ? "open" : place.status.availabilityState === "full" ? "closed" : "warning"
    : undefined;

  return (
    <article className={[styles.selectedPlaceCard, compactAccommodation ? styles.compactAccommodationCard : ""].join(" ")}>
      <div className={compactAccommodation ? styles.compactAccommodationBody : styles.selectedPlaceBody}>
        <div className={styles.selectedPlaceHeading}>
          <h2>{place.name}</h2>
          <p>{place.helpTypes.slice(0, 3).join(" · ")}</p>
        </div>

        <div className={styles.selectedPlaceStatus}>
          <span className={styles.statusDot} data-tone={standard?.tone ?? accommodationTone} />
          <strong>{standard?.label ?? accommodationLabel}</strong>
          <span>·</span>
          <span>{place.distanceLabel}</span>
        </div>

        <p className={styles.selectedPlaceAddress}>
          <MapPin aria-hidden="true" size={16} />
          <span>{place.address}</span>
        </p>

        {isAccommodation && place.status.kind === "accommodation" ? (
          <p className={styles.selectedPlaceNote}>
            {place.status.confirmed}{place.status.admissionsToday ? ` · ${place.status.admissionsToday}` : ""}
          </p>
        ) : null}
      </div>

      <div className={[styles.selectedPlaceActions, compactAccommodation ? styles.compactAccommodationActions : ""].join(" ")}>
        {routeHref ? (
          <a href={routeHref} target="_blank" rel="noreferrer" className={styles.selectedPrimaryAction}>
            <Navigation aria-hidden="true" size={17} />Jak dojechać
          </a>
        ) : null}
        {callHref ? (
          <a href={callHref} className={styles.selectedSecondaryAction}>
            <Phone aria-hidden="true" size={17} />Zadzwoń
          </a>
        ) : null}
        <Link href={place.detailsHref} className={styles.selectedDetailsAction}>
          Szczegóły<ChevronRight aria-hidden="true" size={17} />
        </Link>
      </div>
    </article>
  );
}
