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
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { PlaceStatusBadge } from "./place-status-badge";

export function PlaceCard({ place, accent }: { place: DemoPlace; accent?: string }) {
  const Icon = place.primaryIcon;
  const callHref = telephoneHref(place.phone);
  const routeHref = directionsHref(place);
  const priorityConditions = ["Bezpłatnie", "Bez skierowania", "Dokument niewymagany"];
  const visibleConditions = [...place.conditions]
    .sort((left, right) => (priorityConditions.indexOf(left) === -1 ? priorityConditions.length : priorityConditions.indexOf(left)) - (priorityConditions.indexOf(right) === -1 ? priorityConditions.length : priorityConditions.indexOf(right)))
    .slice(0, 3);

  return (
    <article className="place-card" style={{ "--category-accent": accent } as CSSProperties}>
      <div className="place-card-heading">
        <span className="place-card-icon" aria-hidden="true"><Icon size={23} strokeWidth={2} /></span>
        <div className="place-card-title">
          <h2>{place.name}</h2>
          <p>{place.helpTypes.join(" • ")}</p>
        </div>
        <PlaceStatusBadge status={place.status} />
      </div>

      <div className="place-card-meta">
        <p><Clock3 aria-hidden="true" size={17} /><span>{place.todayHours}</span></p>
        <p><Navigation aria-hidden="true" size={17} /><span>{place.distance}</span></p>
        <p><MapPin aria-hidden="true" size={17} /><span>{place.address}</span></p>
      </div>

      <ul className="place-card-conditions">
        {visibleConditions.map((condition) => <li key={condition}><Check aria-hidden="true" size={15} />{condition}</li>)}
      </ul>

      <div className="place-card-actions">
        {callHref ? <a className="place-card-action place-card-action-secondary" href={callHref}><Phone aria-hidden="true" size={16} />Zadzwoń</a> : null}
        {routeHref ? <a className="place-card-action place-card-action-secondary" href={routeHref} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" size={16} />Trasa</a> : null}
        <Link className="place-card-action place-card-action-primary" href={`/lodz/${place.categorySlug}/${place.slug}`}>
          Szczegóły
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </article>
  );
}
