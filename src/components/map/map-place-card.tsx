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

const accommodationStatus = {
  available: { icon: CheckCircle2, className: "border-brand bg-brand-soft" },
  few: { icon: AlertTriangle, className: "border-urgent-border bg-urgent-soft" },
  full: { icon: XCircle, className: "border-border bg-surface-muted" },
  unknown: { icon: HelpCircle, className: "border-border bg-surface-muted" },
  stale: { icon: AlertTriangle, className: "border-urgent-border bg-urgent-soft" },
  suspended: { icon: AlertTriangle, className: "border-urgent-border bg-urgent-soft" },
};

function compactAccommodationNote(state: MapPlace["status"]) {
  if (state.kind !== "accommodation") {
    return undefined;
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

export function MapPlaceCard({
  place,
  compactAccommodation = false,
}: {
  place: MapPlace;
  compactAccommodation?: boolean;
}) {
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
      <p className="flex min-w-0 items-center gap-2">
        <Navigation aria-hidden="true" className="shrink-0 text-brand-strong" size={17} />
        {place.distanceLabel}
      </p>
      <p className="flex min-w-0 items-start gap-2 leading-5">
        <MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={17} />
        <span className="min-w-0">{place.address}</span>
      </p>
    </div>
  );

  const placeActions = (
    <div
      className={[
        "grid min-w-0 gap-2",
        styles.mapPlaceActions,
        useCompactAccommodation ? styles.compactAccommodationActions : "",
      ].join(" ")}
    >
      {callHref ? (
        <a
          href={callHref}
          className={[
            "place-card-action",
            styles.mapCtaPrimary,
            isAccommodation ? "place-card-action-primary" : "",
          ].join(" ")}
        >
          <Phone aria-hidden="true" size={17} />
          Zadzwoń
        </a>
      ) : (
        <span className={["place-card-action cursor-not-allowed opacity-55", styles.mapCtaPrimary].join(" ")} aria-disabled="true">
          <Phone aria-hidden="true" size={17} />
          Zadzwoń
        </span>
      )}
      {routeHref ? <a
        href={routeHref}
        target="_blank"
        rel="noreferrer"
        className={["place-card-action", styles.mapCtaSecondary].join(" ")}
      >
        <Navigation aria-hidden="true" size={17} />
        Trasa
      </a> : (
        <span className={["place-card-action cursor-not-allowed opacity-55", styles.mapCtaSecondary].join(" ")} aria-disabled="true">
          <Navigation aria-hidden="true" size={17} />
          Trasa
        </span>
      )}
      <Link
        href={place.detailsHref}
        className={[
          "place-card-action",
          styles.mapCtaTertiary,
          isAccommodation ? "" : "place-card-action-primary",
        ].join(" ")}
      >
        <ChevronRight aria-hidden="true" size={17} />
        Szczegóły
      </Link>
    </div>
  );

  return (
    <article
      className={[
        styles.mapPlaceCard,
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
