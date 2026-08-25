import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import type { DemoPlace } from "@/data/demo-places";
import { CategoryIcon } from "@/lib/home/category-visuals";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { detailHrefWithSource } from "@/lib/places/detail-return";
import { PlaceStatusBadge } from "./place-status-badge";
import { SavedPlaceButton } from "@/components/saved/saved-place-button";

export function PlaceCard({ place, accent }: { place: DemoPlace; accent?: string }) {
  const callHref = telephoneHref(place.phone);
  const routeHref = directionsHref(place);
  const priorityConditions = ["Bezpłatnie", "Bez skierowania", "Dokument niewymagany"];
  const visibleConditions = [...place.conditions]
    .sort((left, right) => (priorityConditions.indexOf(left) === -1 ? priorityConditions.length : priorityConditions.indexOf(left)) - (priorityConditions.indexOf(right) === -1 ? priorityConditions.length : priorityConditions.indexOf(right)))
    .slice(0, 3);
  const detailHref = detailHrefWithSource(`/lodz/${place.categorySlug}/${place.slug}`, "szukaj");
  const savedPlace = {
    id: place.id,
    name: place.name,
    category: place.helpTypes[0] ?? place.categorySlug,
    detailHref,
    address: place.address,
    status: place.status,
    hours: place.todayHours,
    phone: place.phone,
    latitude: place.latitude,
    longitude: place.longitude,
  };

  return (
    <article className="place-card" style={{ "--category-accent": accent } as CSSProperties}>
      <div className="place-card-heading">
        <span className="place-card-icon" aria-hidden="true"><CategoryIcon slug={place.categorySlug} size={23} strokeWidth={2} /></span>
        <div className="place-card-title">
          <Link
            className="place-card-title-link"
            href={detailHref}
          >
            <h2>{place.name}</h2>
          </Link>
          <p>{place.helpTypes.join(" • ")}</p>
        </div>
        <PlaceStatusBadge status={place.status} />
        <SavedPlaceButton place={savedPlace} compact />
      </div>

      <div className="place-card-meta">
        <p><Clock3 aria-hidden="true" size={17} /><span>{place.todayHours}</span></p>
        <p><Navigation aria-hidden="true" size={17} /><span>{place.distance}</span></p>
        <p><MapPin aria-hidden="true" size={17} /><span>{place.address}</span></p>
      </div>

      <ul className="place-card-conditions">
        {visibleConditions.map((condition) => <li key={condition}><Check aria-hidden="true" size={15} />{condition}</li>)}
      </ul>

      <div className={`place-card-actions${callHref ? " place-card-actions-has-phone" : ""}`}>
        {callHref ? <a className="place-card-action place-card-action-primary place-card-call" href={callHref}><Phone aria-hidden="true" size={16} />Zadzwoń</a> : null}
        {routeHref ? <a className="place-card-action place-card-action-secondary" href={routeHref} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" size={16} />Trasa</a> : null}
        <Link
          className="place-card-action place-card-action-secondary"
          href={detailHref}
        >
          Szczegóły
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </article>
  );
}
