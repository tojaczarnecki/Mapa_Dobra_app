import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import type { DemoPlace } from "@/data/demo-places";
import { PlaceStatusBadge } from "./place-status-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { publicStatusForLabel } from "@/lib/public/status-presentation";
import { getResultPrimaryAction } from "@/lib/places/result-presentation";

export function PlaceCard({ place, returnTo }: { place: DemoPlace; returnTo?: string }) {
  const Icon = place.primaryIcon;
  const detailsHref = `/lodz/${place.categorySlug}/${place.slug}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  const primaryAction = getResultPrimaryAction(place, detailsHref);
  const importantCondition = place.conditions.find((condition) => publicStatusForLabel(condition) === "condition");
  const primaryActionIsCall = primaryAction?.kind === "call";
  const primaryActionIsDetails = primaryAction?.kind === "details";
  const showHours = !place.freshnessWarning && place.status !== "unknownHours" && place.status !== "needsConfirmation";
  const showDistance = place.distance !== "Odległość nieznana";

  return (
    <article data-search-result-id={place.id} tabIndex={0} className="search-result-card">
      <div className="search-result-content">
        <div className="search-result-heading">
          <span className="search-result-category-cue" aria-hidden="true">
            <Icon size={22} strokeWidth={2.2} />
          </span>
          <div className="search-result-title-group">
            <h2>{place.name}</h2>
            <p>{place.helpTypes.join(" • ")}</p>
          </div>
          <div className="search-result-status"><PlaceStatusBadge status={place.status} compact freshnessWarning={place.freshnessWarning} /></div>
        </div>

        <div className="search-result-meta">
          {showHours || showDistance ? (
            <p>
              {showHours ? <><Clock3 aria-hidden="true" size={15} /><span>{place.todayHours}</span></> : null}
              {showHours && showDistance ? <span aria-hidden="true">·</span> : null}
              {showDistance ? <><Navigation aria-hidden="true" size={15} /><span>{place.distance}</span></> : null}
            </p>
          ) : null}
          <p className="search-result-address">
            <MapPin aria-hidden="true" size={15} />
            <span>{place.address}</span>
          </p>
        </div>

        {importantCondition ? (
            <ul className="search-result-condition">
            <li>
              <StatusIndicator status="condition">
                {importantCondition}
              </StatusIndicator>
            </li>
          </ul>
        ) : null}

        <div className="search-result-actions">
          {primaryAction ? (
            primaryAction.kind === "details" ? (
              <Link className="place-card-action place-card-action-primary" href={primaryAction.href}>
                {primaryAction.label}<ChevronRight aria-hidden="true" size={17} />
              </Link>
            ) : (
              <a className="place-card-action place-card-action-primary" href={primaryAction.href} target={primaryAction.external ? "_blank" : undefined} rel={primaryAction.external ? "noreferrer" : undefined}>
                {primaryActionIsCall ? <Phone aria-hidden="true" size={17} /> : <Navigation aria-hidden="true" size={17} />}
                {primaryAction.label}
              </a>
            )
          ) : null}
          {!primaryActionIsDetails ? <Link className={"place-card-action" + (!primaryAction ? " place-card-action-primary" : "")} href={detailsHref}>Szczegóły<ChevronRight aria-hidden="true" size={17} /></Link> : null}
        </div>
      </div>
    </article>
  );
}
