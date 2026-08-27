"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Navigation, Phone } from "lucide-react";
import type { MapPlace } from "@/data/demo-map-places";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import styles from "./map.module.css";

function standardStatus(place: MapPlace) {
  if (place.status.kind !== "standard") return undefined;
  const status = place.status.status;
  if (status === "open" || status === "openToday") return { label: place.status.todayHours || "Otwarte teraz", tone: "bg-[var(--md-green)]" };
  if (status === "closed") return { label: place.status.todayHours || "Zamknięte teraz", tone: "bg-[var(--md-red)]" };
  return { label: place.status.todayHours || "Godziny do potwierdzenia", tone: "bg-[var(--md-yellow-strong)]" };
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
  const standard = standardStatus(place);
  const accommodationLabel = place.status.kind === "accommodation" ? place.status.availabilityLabel : undefined;
  const accommodationTone = place.status.kind === "accommodation"
    ? place.status.availabilityState === "available"
      ? "bg-[var(--md-green)]"
      : place.status.availabilityState === "full"
        ? "bg-[var(--md-red)]"
        : "bg-[var(--md-yellow-strong)]"
    : "";

  return (
    <article className={["min-w-0 overflow-hidden rounded-[10px] border border-[var(--md-line)] bg-white shadow-[0_12px_30px_rgb(8_37_91_/_14%)]", compactAccommodation ? styles.compactAccommodationCard : ""].join(" ")}>
      <div className={compactAccommodation ? styles.compactAccommodationBody : "grid gap-2.5 p-3.5 pr-11"}>
        <div className="min-w-0">
          <h2 className="truncate text-[0.96rem] font-extrabold leading-5 text-[var(--md-text)]">{place.name}</h2>
          <p className="mt-0.5 truncate text-[0.7rem] font-semibold text-[var(--md-muted)]">{place.helpTypes.slice(0, 3).join(" · ")}</p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[0.7rem] font-semibold text-[var(--md-muted)]">
          <span className={["h-2 w-2 shrink-0 rounded-full", standard?.tone ?? accommodationTone].join(" ")} />
          <strong className="font-bold text-[var(--md-text)]">{standard?.label ?? accommodationLabel}</strong>
          <span aria-hidden="true">·</span>
          <span>{place.distanceLabel}</span>
        </div>

        <p className="flex min-w-0 items-start gap-1.5 text-[0.7rem] font-semibold leading-5 text-[var(--md-muted)]">
          <MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--md-navy)]" size={15} />
          <span className="min-w-0">{place.address}</span>
        </p>

        {place.status.kind === "accommodation" ? (
          <p className="text-[0.66rem] font-semibold leading-4 text-[var(--md-muted)]">
            {place.status.confirmed}{place.status.admissionsToday ? ` · ${place.status.admissionsToday}` : ""}
          </p>
        ) : null}
      </div>

      <div className={["grid grid-cols-3 border-t border-[var(--md-line)]", compactAccommodation ? styles.compactAccommodationActions : ""].join(" ")}>
        {routeHref ? (
          <a href={routeHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-1.5 bg-[var(--md-navy)] px-2 text-[0.7rem] font-extrabold text-white">
            <Navigation aria-hidden="true" size={15} />Trasa
          </a>
        ) : <span />}
        {callHref ? (
          <a href={callHref} className="inline-flex min-h-11 items-center justify-center gap-1.5 border-r border-[var(--md-line)] px-2 text-[0.7rem] font-extrabold text-[var(--md-navy)]">
            <Phone aria-hidden="true" size={15} />Zadzwoń
          </a>
        ) : <span />}
        <Link href={place.detailsHref} className="inline-flex min-h-11 items-center justify-center gap-1 px-2 text-[0.7rem] font-extrabold text-[var(--md-navy)]">
          Szczegóły<ChevronRight aria-hidden="true" size={15} />
        </Link>
      </div>
    </article>
  );
}
