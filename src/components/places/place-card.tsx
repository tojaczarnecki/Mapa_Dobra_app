import Link from "next/link";
import {
  BadgeCheck,
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
    <article className="w-full min-w-0 max-w-full rounded-lg border border-border bg-surface p-3 sm:p-3.5">
      <div className="min-w-0 space-y-3">
        <div className="flex min-w-0 gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
            aria-hidden="true"
          >
            <Icon size={22} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold leading-tight text-foreground sm:text-xl">
              {place.name}
            </h2>
            <p className="mt-0.5 text-sm font-bold leading-5 text-muted-foreground">
              {place.helpTypes.join(" • ")}
            </p>
            <div className="mt-2"><PlaceStatusBadge status={place.status} /></div>
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5 text-sm font-semibold text-foreground sm:grid-cols-2">
          <p className="flex min-w-0 items-center gap-2">
            <Clock3 aria-hidden="true" size={16} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{place.todayHours}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <Navigation aria-hidden="true" size={16} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{place.distance}</span>
          </p>
          <p className="flex min-w-0 items-start gap-2 leading-5 sm:col-span-2">
            <MapPin aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-brand-strong" />
            <span className="min-w-0">{place.address}</span>
          </p>
        </div>

        {place.conditions.length > 0 ? (
          <ul className="flex min-w-0 flex-wrap gap-1.5 text-xs font-bold text-foreground">
            {place.conditions.map((condition) => (
              <li key={condition} className="inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border border-border bg-surface-muted px-2.5">
                <Check aria-hidden="true" size={13} className="shrink-0 text-brand-strong" />
                <span className="min-w-0">{condition}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {place.freshnessWarning ? (
          <p className="rounded-lg border border-urgent-border bg-urgent-soft px-3 py-2 text-xs font-semibold leading-5 text-foreground">
            {place.freshness}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BadgeCheck aria-hidden="true" size={15} className="shrink-0 text-brand-strong" />
            {place.freshness}
          </p>
        )}

        <div className="grid min-w-0 grid-cols-3 gap-2 border-t border-border pt-3">
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
