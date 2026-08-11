import { Clock3, MapPin, Navigation, Phone } from "lucide-react";
import type { PlaceDetail } from "@/data/demo-place-details";
import { SharePlaceButton } from "./share-place-button";

type PlaceHeroProps = {
  place: PlaceDetail;
  primaryCallLabel?: string;
  showStatus?: boolean;
};

const statusClass: Record<PlaceDetail["status"]["tone"], string> = {
  open: "border-brand bg-brand-soft text-foreground",
  openToday: "border-brand bg-brand-soft text-foreground",
  closed: "border-border bg-surface-muted text-foreground",
  unknown: "border-urgent-border bg-urgent-soft text-foreground",
};

export function PlaceHero({
  place,
  primaryCallLabel = "Zadzwoń",
  showStatus = true,
}: PlaceHeroProps) {
  return (
    <section className="w-full min-w-0 rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
      <div className="min-w-0 space-y-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {place.name}
          </h1>
          <p className="text-base font-extrabold leading-6 text-muted-foreground">
            {place.helpTypes.join(" • ")}
          </p>
        </div>

        {showStatus ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex min-h-8 max-w-full items-center self-start rounded-full border px-3 text-xs font-extrabold tracking-wide",
                statusClass[place.status.tone],
              ].join(" ")}
            >
              {place.status.label}
            </span>
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
              <span className="min-w-0">{place.status.todayHours}</span>
            </p>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          <p className="flex min-w-0 items-center gap-2">
            <Navigation aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{place.distanceLabel}</span>
          </p>
          <p className="flex min-w-0 items-start gap-2 leading-6">
            <MapPin
              aria-hidden="true"
              size={18}
              className="mt-0.5 shrink-0 text-brand-strong"
            />
            <span className="min-w-0">{place.address}</span>
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
          {place.contact.phone ? (
            <a
              className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-foreground shadow-sm transition hover:bg-brand-strong hover:text-white"
              href={`tel:${place.contact.phone}`}
            >
              <Phone aria-hidden="true" size={17} />
              {primaryCallLabel}
            </a>
          ) : null}
          <a
            className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-brand bg-surface px-4 py-2 text-sm font-extrabold text-foreground transition hover:bg-brand-soft"
            href="#mapa-dojazd"
          >
            <Navigation aria-hidden="true" size={17} />
            Wyznacz trasę
          </a>
          <SharePlaceButton
            className="col-span-2 justify-self-start sm:col-span-1 sm:justify-self-end"
            title={place.name}
          />
        </div>
      </div>
    </section>
  );
}
