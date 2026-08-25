import { Navigation } from "lucide-react";
import type { PlaceDetail } from "@/data/demo-place-details";
import { directionsHref } from "@/lib/places/actions";
import { PlaceMapPreview } from "./place-map-preview";

type MapPreviewProps = {
  place: PlaceDetail;
};

export function MapPreview({ place }: MapPreviewProps) {
  const routeHref = directionsHref(place);
  return (
    <div id="mapa-dojazd" className="place-detail-map">
      <div>
        <h2>Mapa i dojazd</h2>
        <p className="place-detail-category">{place.address}</p>
      </div>

      {Number.isFinite(place.latitude) && Number.isFinite(place.longitude) ? (
        <PlaceMapPreview position={[place.latitude!, place.longitude!]} address={place.address} />
      ) : (
        <div className="place-detail-map-unavailable" role="status">
          <p>Nie mamy jeszcze dokładnej lokalizacji tego miejsca na mapie.</p>
        </div>
      )}

      {routeHref ? <a
        className="place-detail-action place-detail-action-secondary place-detail-map-route"
        href={routeHref}
        target="_blank"
        rel="noreferrer"
      >
        <Navigation aria-hidden="true" size={18} />
        Wyznacz trasę
      </a> : null}
    </div>
  );
}
