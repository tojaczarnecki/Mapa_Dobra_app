import Link from "next/link";
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

export function PlaceCard({ place }: { place: DemoPlace }) {
  const Icon = place.primaryIcon;
  const callHref = telephoneHref(place.phone);
  const routeHref = directionsHref(place);

  return (
    <article className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
            aria-hidden="true"
          >
            <Icon size={25} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold leading-tight text-foreground">
                {place.name}
              </h2>
              <p className="text-sm font-bold text-muted-foreground">
                {place.helpTypes.join(" • ")}
              </p>
            </div>
            <PlaceStatusBadge status={place.status} />
          </div>
        </div>

        <div className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          <p className="flex min-w-0 items-center gap-2">
            <Clock3 aria-hidden="true" size={18} className="text-brand-strong" />
            <span className="min-w-0">{place.todayHours}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <Navigation aria-hidden="true" size={18} className="text-brand-strong" />
            <span className="min-w-0">{place.distance}</span>
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

        <ul className="grid min-w-0 gap-2 text-sm font-semibold text-foreground sm:grid-cols-2">
          {place.conditions.map((condition) => (
            <li key={condition} className="flex min-w-0 items-center gap-2">
              <Check aria-hidden="true" size={17} className="text-brand-strong" />
              <span className="min-w-0">{condition}</span>
            </li>
          ))}
        </ul>

        <p
          className={[
            "rounded-lg border px-3 py-2 text-sm font-semibold",
            place.freshnessWarning
              ? "border-urgent-border bg-urgent-soft text-foreground"
              : "border-border bg-surface-muted text-muted-foreground",
          ].join(" ")}
        >
          {place.freshness}
        </p>

        <div className="grid min-w-0 grid-cols-3 gap-2">
          {callHref ? (
            <a className="place-card-action" href={callHref}>
              <Phone aria-hidden="true" size={17} />
              Zadzwoń
            </a>
          ) : (
            <span className="place-card-action cursor-not-allowed opacity-55" aria-disabled="true">
              <Phone aria-hidden="true" size={17} />
              Brak telefonu
            </span>
          )}
          {routeHref ? (
            <a className="place-card-action" href={routeHref} target="_blank" rel="noreferrer">
              <Navigation aria-hidden="true" size={17} />
              Trasa
            </a>
          ) : (
            <span className="place-card-action cursor-not-allowed opacity-55" aria-disabled="true">
              <Navigation aria-hidden="true" size={17} />
              Brak trasy
            </span>
          )}
          <Link
            className="place-card-action place-card-action-primary"
            href={`/lodz/${place.categorySlug}/${place.slug}`}
          >
            Szczegóły
            <ChevronRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
