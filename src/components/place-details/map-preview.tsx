import type { PlaceDetail } from "@/data/demo-place-details";
import { Navigation } from "lucide-react";
import { directionsHref } from "@/lib/places/actions";
import { PlaceDetailMap } from "./place-detail-map";

type MapPreviewProps = {
  place: PlaceDetail;
};

export function MapPreview({ place }: MapPreviewProps) {
  return (
    <div id="mapa-dojazd" className="place-detail-map-section min-w-0">
      {place.latitude !== undefined && place.longitude !== undefined ? <PlaceDetailMap latitude={place.latitude} longitude={place.longitude} label={place.name} /> : (
        <div className="grid gap-2 rounded-lg border border-border bg-surface-muted p-4 text-sm font-semibold text-muted-foreground">
          <p>Nie mamy jeszcze potwierdzonej lokalizacji na mapie.</p>
          <a className="inline-flex min-h-11 items-center gap-2 font-extrabold text-brand-strong" href={directionsHref(place)} target="_blank" rel="noreferrer">
            <Navigation aria-hidden="true" size={17} />
            Otwórz mapę
          </a>
        </div>
      )}
    </div>
  );
}
