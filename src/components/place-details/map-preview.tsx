import { Map, Navigation } from "lucide-react";
import type { PlaceDetail } from "@/data/demo-place-details";

type MapPreviewProps = {
  place: PlaceDetail;
};

export function MapPreview({ place }: MapPreviewProps) {
  return (
    <div
      id="mapa-dojazd"
      className="rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5"
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
          {place.coordinatesLabel ? (
            <p className="text-sm font-semibold leading-6 text-muted-foreground">
              {place.coordinatesLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex min-h-44 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted p-4 text-center">
        <p className="max-w-sm text-sm font-semibold leading-6 text-muted-foreground">
          Tu będzie podgląd mapy po podpięciu właściwego widoku mapowego.
        </p>
      </div>

      <a
        className="touch-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand bg-surface px-4 py-2 text-sm font-extrabold text-foreground transition hover:bg-brand-soft"
        href="#main-content"
      >
        <Navigation aria-hidden="true" size={17} />
        Wyznacz trasę
      </a>
    </div>
  );
}
