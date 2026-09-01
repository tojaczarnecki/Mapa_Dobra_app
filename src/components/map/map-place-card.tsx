"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  MapPin,
  Navigation,
  Phone,
  XCircle,
} from "lucide-react";
import type { MapPlace } from "@/data/demo-map-places";
import { PlaceStatusBadge } from "@/components/places/place-status-badge";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import styles from "./map.module.css";
import { mapDetailsHref } from "./map-place-links";

const accommodationStatus = {
  available: { icon: CheckCircle2, className: "border-brand bg-brand-soft" },
  few: { icon: AlertTriangle, className: "border-urgent-border bg-urgent-soft" },
  full: { icon: XCircle, className: "border-border bg-surface-muted" },
  unknown: { icon: HelpCircle, className: "border-border bg-surface-muted" },
  stale: { icon: AlertTriangle, className: "border-urgent-border bg-urgent-soft" },
  suspended: { icon: AlertTriangle, className: "border-urgent-border bg-urgent-soft" },
};

function hasDistanceLabel(label: string) {
  return Boolean(label.trim()) && label !== "Odległość nieznana";
}

function compactAccommodationNote(state: MapPlace["status"]) {
  if (state.kind !== "accommodation") {
    return undefined;
  }

  if (state.freshness === "AGING") {
    return "Dane warto potwierdzić telefonicznie.";
  }

  switch (state.availabilityState) {
    case "few":
      return "Miejsce może szybko przestać być dostępne. Zadzwoń przed przyjazdem.";
    case "stale":
      return "Dane mogą być nieaktualne. Zadzwoń przed przyjazdem.";
    case "unknown":
      return "Brak aktualnego potwierdzenia. Zadzwoń przed przyjazdem.";
    case "suspended":
      return "W pilnej sytuacji skontaktuj się z placówką.";
    default:
      return state.availabilityNote;
  }
}

function compactAccommodationLabel(state: MapPlace["status"]) {
  if (state.kind !== "accommodation") {
    return undefined;
  }

  switch (state.availabilityState) {
    case "available":
      return "Dostępne";
    case "few":
      return "Mało miejsc";
    case "full":
      return "Brak miejsc";
    default:
      return "Do potwierdzenia";
  }
}

export function MapPlaceCard({
  place,
  compactAccommodation = false,
  compact = false,
  returnTo,
}: {
  place: MapPlace;
  compactAccommodation?: boolean;
  compact?: boolean;
  returnTo?: string;
}) {
  const detailsHref = mapDetailsHref(place.detailsHref, returnTo);
  const isAccommodation = place.status.kind === "accommodation";
  const callHref = telephoneHref(place.phone);
  const routeHref = directionsHref(place);
  const useCompactAccommodation = isAccommodation && compactAccommodation;
  const showAdmissionsToday =
    place.status.kind === "accommodation" &&
    place.status.admissionsToday !== place.status.availabilityLabel;

  const placeHeading = (
    <div className={["min-w-0 space-y-1", useCompactAccommodation ? "pr-10" : ""].join(" ")}>
      <h2 className="text-lg font-extrabold leading-tight text-foreground">
        {place.name}
      </h2>
      <p className="text-sm font-bold text-muted-foreground">
        {place.helpTypes.join(" • ")}
      </p>
    </div>
  );

  const placeStatus =
    place.status.kind === "standard" ? (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <PlaceStatusBadge status={place.status.status} />
        <span className="text-sm font-bold text-foreground">{place.status.todayHours}</span>
      </div>
    ) : useCompactAccommodation ? (
      <div
        className={[
          "space-y-1 rounded-lg border px-2.5 py-2 text-foreground",
          accommodationStatus[place.status.availabilityState].className,
        ].join(" ")}
      >
        <p className="flex items-center gap-2 text-sm font-extrabold leading-5">
          {(() => {
            const Icon = accommodationStatus[place.status.availabilityState].icon;
            return <Icon aria-hidden="true" className="shrink-0" size={18} />;
          })()}
          {place.status.availabilityLabel}
        </p>
        <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-xs font-bold leading-5">
          <p>{place.status.confirmed}</p>
          {showAdmissionsToday ? <p>{place.status.admissionsToday}</p> : null}
        </div>
        {compactAccommodationNote(place.status) ? (
          <p className="text-xs font-semibold leading-4 text-muted-foreground">
            {compactAccommodationNote(place.status)}
          </p>
        ) : null}
        <p className="text-[0.6875rem] font-semibold leading-4 text-muted-foreground">
          Wolne miejsca nie gwarantują przyjęcia.
        </p>
      </div>
    ) : (
      <div
        className={[
          "space-y-1.5 rounded-lg border px-3 py-2.5 text-foreground",
          accommodationStatus[place.status.availabilityState].className,
        ].join(" ")}
      >
        <p className="flex items-center gap-2 text-base font-extrabold leading-5">
          {(() => {
            const Icon = accommodationStatus[place.status.availabilityState].icon;
            return <Icon aria-hidden="true" className="shrink-0" size={19} />;
          })()}
          {place.status.availabilityLabel}
        </p>
        <p className="text-sm font-bold">{place.status.confirmed}</p>
        <p className="text-sm font-semibold">{place.status.admissionsToday}</p>
        {place.status.availabilityNote ? (
          <p className="text-xs font-semibold leading-5 text-muted-foreground">
            {place.status.availabilityNote}
          </p>
        ) : null}
        <p className="text-xs font-semibold leading-5 text-muted-foreground">
          Wolne miejsca nie są gwarancją przyjęcia.
        </p>
      </div>
    );

  const placeLocation = (
    <div className="grid min-w-0 gap-1.5 text-sm font-semibold text-foreground">
      {hasDistanceLabel(place.distanceLabel) ? (
        <p className="flex min-w-0 items-center gap-2">
          <Navigation aria-hidden="true" className="shrink-0 text-brand-strong" size={17} />
          {place.distanceLabel}
        </p>
      ) : null}
      <p className="flex min-w-0 items-start gap-2 leading-5">
        <MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={17} />
        <span className="min-w-0">{place.address}</span>
      </p>
    </div>
  );

  const placeActions = (
    <div
      className={[
        "grid min-w-0 grid-cols-3 gap-2",
        useCompactAccommodation ? styles.compactAccommodationActions : "",
      ].join(" ")}
    >
      {callHref ? (
        <a
          href={callHref}
          className={[
            "place-card-action",
            isAccommodation ? "place-card-action-primary" : "",
          ].join(" ")}
        >
          <Phone aria-hidden="true" size={17} />
          {useCompactAccommodation
            ? "Zadzwoń"
            : isAccommodation
              ? "Zadzwoń i potwierdź"
              : "Zadzwoń"}
        </a>
      ) : (
        null
      )}
      {routeHref ? <a
        href={routeHref}
        target="_blank"
        rel="noreferrer"
        className="place-card-action"
      >
        <Navigation aria-hidden="true" size={17} />
        Trasa
      </a> : (
        <span className="place-card-action cursor-not-allowed opacity-55" aria-disabled="true">
          <Navigation aria-hidden="true" size={17} />
          Trasa
        </span>
      )}
      <Link
        href={detailsHref}
        className={[
          "place-card-action",
          isAccommodation ? "" : "place-card-action-primary",
        ].join(" ")}
      >
        <ChevronRight aria-hidden="true" size={17} />
        Szczegóły
      </Link>
    </div>
  );

  const compactPlaceActions = (
    <div className="grid min-w-0 grid-flow-col auto-cols-fr gap-2">
      {routeHref ? (
        <a href={routeHref} target="_blank" rel="noreferrer" className="place-card-action">
          <Navigation aria-hidden="true" size={16} />
          Trasa
        </a>
      ) : null}
      <Link href={detailsHref} className="place-card-action place-card-action-primary">
        <ChevronRight aria-hidden="true" size={16} />
        Szczegóły
      </Link>
    </div>
  );

  if (compact) {
    const compactPlaceStatus = place.status.kind === "standard" ? (
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
        <PlaceStatusBadge compact status={place.status.status} />
        <span className="truncate">{place.status.todayHours}</span>
      </div>
    ) : (
      <span className="truncate text-xs font-semibold text-foreground">
        {compactAccommodationLabel(place.status)}
      </span>
    );

    return (
      <article className={styles.mobileCompactCard}>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold leading-5 text-foreground">{place.name}</h2>
          <p className="truncate text-xs font-bold text-muted-foreground">{place.helpTypes.join(" • ")}</p>
        </div>
        <div className="flex min-w-0 items-center gap-x-2 text-xs font-semibold text-foreground">
          <MapPin aria-hidden="true" className="shrink-0 text-brand-strong" size={15} />
          <span className="truncate">{place.address}</span>
          {hasDistanceLabel(place.distanceLabel) ? <span className="shrink-0 text-muted-foreground">{place.distanceLabel}</span> : null}
        </div>
        {compactPlaceStatus}
        {compactPlaceActions}
      </article>
    );
  }

  return (
    <article
      className={[
        "min-w-0 rounded-lg border border-border bg-surface shadow-[0_12px_30px_rgb(17_24_39_/_12%)]",
        useCompactAccommodation
          ? styles.compactAccommodationCard
          : "space-y-3 p-3.5 sm:p-4",
      ].join(" ")}
    >
      {useCompactAccommodation ? (
        <div className={styles.compactAccommodationBody}>
          {placeHeading}
          {placeStatus}
          {placeLocation}
        </div>
      ) : (
        <>
          {placeHeading}
          {placeStatus}
          {placeLocation}
        </>
      )}
      {placeActions}
    </article>
  );
}
