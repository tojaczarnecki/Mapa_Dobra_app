"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Navigation } from "lucide-react";
import type { MapPlace } from "@/data/demo-map-places";
import { directionsHref } from "@/lib/places/actions";
import { resolvePublicPlaceStatus } from "@/lib/public/status-presentation";
import { mapDetailsHref } from "./map-place-links";
import styles from "./map.module.css";

export function MapPlacePopup({ place, returnTo }: { place: MapPlace; returnTo?: string }) {
  const detailsHref = mapDetailsHref(place.detailsHref, returnTo);
  const presentation = place.status.kind === "standard"
    ? resolvePublicPlaceStatus({
        status: place.status.status,
        profileKind: place.profileKind,
        mobileSeasonLabel: place.mobileSeasonLabel,
        mobileSeasonActive: place.mobileSeasonActive,
      })
    : undefined;
  const routeAllowed = place.profileKind !== "MOBILE_SERVICE" && !(place.profileKind === "FOOD_SHARING" && presentation?.publicStatus !== "confirmed");
  const routeHref = routeAllowed ? directionsHref(place) : undefined;
  const status = presentation?.label ?? (place.status.kind === "accommodation" ? place.status.availabilityLabel : undefined);
  const mobileBase = place.profileKind === "MOBILE_SERVICE";

  return (
    <article className={styles.mapPopupContent}>
      <h2><Link className="transition-colors hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href={detailsHref}>{place.name}</Link></h2>
      <p className={styles.mapPopupTypes}>{place.profileKind === "FOOD_SHARING" ? "Lodówka społeczna" : place.helpTypes.join(" • ")}</p>
      <p className={styles.mapPopupAddress}>
        <MapPin aria-hidden="true" size={15} />
        <span>{mobileBase ? "Baza / organizator: " : ""}{place.address}{mobileBase ? " · nie jest to miejsce postoju" : ""}</span>
      </p>
      {status ? <div className={styles.mapPopupMeta}><span>{status}</span></div> : null}
      <div className={styles.mapPopupActions}>
        {routeHref ? <a href={routeHref} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" size={14} />Trasa</a> : null}
        <Link href={detailsHref}>Szczegóły<ChevronRight aria-hidden="true" size={14} /></Link>
      </div>
    </article>
  );
}
