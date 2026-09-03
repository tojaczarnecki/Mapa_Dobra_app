import { Map } from "lucide-react";
import type { PlaceDetail } from "@/data/demo-place-details";
import { mapPreviewLocationLabel } from "@/lib/places/address-display";

type MapPreviewProps = {
  place: PlaceDetail;
};

export function MapPreview({ place }: MapPreviewProps) {
  const locationLabel = mapPreviewLocationLabel(place.address, place.coordinatesLabel);
  return (
    <div
      id="mapa-dojazd"
      className="place-detail-map-section p-4 sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
          aria-hidden="true"
        >
          <Map size={22} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold leading-tight text-foreground">
            Mapa i dojazd
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
            {place.address}
          </p>
          {locationLabel ? (
            <p className="text-sm font-semibold leading-6 text-muted-foreground">
              {locationLabel}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-muted-foreground">Dojazd do miejsca sprawdzisz po otwarciu trasy.</p>
    </div>
  );
}
