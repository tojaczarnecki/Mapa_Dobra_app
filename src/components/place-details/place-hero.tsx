import type { CSSProperties } from "react";
import { Clock3, MapPin, Navigation, Phone } from "lucide-react";
import type { PlaceDetail } from "@/data/demo-place-details";
import { getCategoryAccentMap } from "@/lib/home/category-accent";
import { CategoryIcon } from "@/lib/home/category-visuals";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { SharePlaceButton } from "./share-place-button";
import { SavedPlaceButton } from "@/components/saved/saved-place-button";
import { PlaceCorrectionTrigger } from "./place-correction-trigger";

type PlaceHeroProps = {
  place: PlaceDetail;
  primaryCallLabel?: string;
  showStatus?: boolean;
};

export function PlaceHero({
  place,
  primaryCallLabel = "Zadzwoń",
  showStatus = true,
}: PlaceHeroProps) {
  const routeHref = directionsHref(place);
  const callHref = telephoneHref(place.contact.phone);
  const accent = getCategoryAccentMap([place.categorySlug]).get(place.categorySlug);
  const style = accent ? { "--category-accent": accent } as CSSProperties : undefined;
  const savedPlace = {
    id: place.id,
    name: place.name,
    category: place.helpTypes[0] ?? place.categorySlug,
    detailHref: `/lodz/${place.categorySlug}/${place.slug}`,
    address: place.address,
    status: place.status.label,
    hours: place.status.todayHours,
    phone: place.contact.phone,
    latitude: place.latitude,
    longitude: place.longitude,
  };
  return (
    <section className="place-detail-hero" style={style}>
      <div className="place-detail-hero-heading">
        <span className="place-detail-category-icon" aria-hidden="true">
          <CategoryIcon slug={place.categorySlug} size={28} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="place-detail-eyebrow">{place.typeLabel}</p>
          <div className="place-detail-title-row">
            <h1>{place.name}</h1>
            <PlaceCorrectionTrigger placeId={place.id} field="name" currentValue={place.name} />
          </div>
          <p className="place-detail-category">{place.helpTypes.join(" • ")}</p>
        </div>
        <SavedPlaceButton place={savedPlace} compact />
      </div>

      {showStatus ? (
        <div className="place-detail-status-row">
          <span className={`place-detail-status place-detail-status-${place.status.tone}`}>
            {place.status.label}
          </span>
          <p className="place-detail-status-hours">
            <Clock3 aria-hidden="true" size={17} />
            <span>{place.status.todayHours}</span>
          </p>
        </div>
      ) : null}

      <div className="place-detail-meta">
        <p className="place-detail-meta-item">
          <Navigation aria-hidden="true" size={17} />
          <span>{place.distanceLabel}</span>
        </p>
        <p className="place-detail-meta-item">
          <MapPin aria-hidden="true" size={17} />
          <span>{place.address}</span>
          <PlaceCorrectionTrigger placeId={place.id} field="address" currentValue={place.address} latitude={place.latitude} longitude={place.longitude} />
        </p>
      </div>

      <div className="place-detail-actions">
        {callHref ? (
          <a className="place-detail-action place-detail-action-primary" href={callHref}>
            <Phone aria-hidden="true" size={18} />
            {primaryCallLabel}
          </a>
        ) : null}
        {routeHref ? <a
            className="place-detail-action place-detail-action-secondary"
            href={routeHref}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation aria-hidden="true" size={18} />
            Trasa
          </a> : null}
          <SharePlaceButton
            className="place-detail-action place-detail-action-tertiary"
            title={place.name}
          />
      </div>
    </section>
  );
}
