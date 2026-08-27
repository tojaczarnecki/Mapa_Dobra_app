import { Clock3, MapPin, Navigation, Phone } from "lucide-react";
import type { PlaceDetail } from "@/data/demo-place-details";
import { FavoritePlaceButton } from "@/components/favorites/favorite-place-button";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { SharePlaceButton } from "./share-place-button";

type PlaceHeroProps = {
  place: PlaceDetail;
  primaryCallLabel?: string;
  showStatus?: boolean;
};

const statusToneClass: Record<PlaceDetail["status"]["tone"], string> = {
  open: "",
  openToday: "",
  closed: "is-closed",
  unknown: "is-warning",
};

export function PlaceHero({
  place,
  primaryCallLabel = "Zadzwoń",
  showStatus = true,
}: PlaceHeroProps) {
  const routeHref = directionsHref(place);
  const callHref = telephoneHref(place.contact.phone);

  return (
    <section className="md-place-hero">
      <div className="md-place-hero-heading">
        <div className="min-w-0">
          <h1>{place.name}</h1>
          <p className="md-place-type">{place.helpTypes.join(" • ")}</p>
        </div>
        <FavoritePlaceButton place={place} />
      </div>

      {showStatus ? (
        <span className={`md-place-status-pill ${statusToneClass[place.status.tone]}`}>
          {place.status.label}
        </span>
      ) : null}

      <div className="md-place-quick-meta">
        <span><Navigation aria-hidden="true" size={15} />{place.distanceLabel}</span>
        {showStatus ? <span><Clock3 aria-hidden="true" size={15} />{place.status.todayHours}</span> : null}
      </div>

      <p className="md-place-address">
        <MapPin aria-hidden="true" size={17} className="shrink-0" />
        <span>{place.address}</span>
      </p>

      <div className="md-place-actions">
        {routeHref ? (
          <a
            className="md-place-action-primary"
            href={routeHref}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation aria-hidden="true" size={17} />
            Jak dojechać
          </a>
        ) : null}
        {callHref ? (
          <a className="md-place-action-secondary" href={callHref}>
            <Phone aria-hidden="true" size={17} />
            {primaryCallLabel}
          </a>
        ) : null}
      </div>

      <div className="mt-2 flex justify-end">
        <SharePlaceButton title={place.name} />
      </div>
    </section>
  );
}
