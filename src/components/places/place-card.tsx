import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  Search,
} from "lucide-react";
import type { DemoPlace } from "@/data/demo-places";
import { PlaceStatusBadge } from "./place-status-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { publicStatusForLabel } from "@/lib/public/status-presentation";
import { getResultPrimaryAction } from "@/lib/places/result-presentation";
import { directionsHref } from "@/lib/places/actions";
import { CategoryIllustration } from "@/components/categories/category-illustration";
import { PublicActionLink } from "./public-action-link";
import { placeIllustrationSlug } from "@/lib/categories/category-illustrations";

export function PlaceCard({ place, returnTo }: { place: DemoPlace; returnTo?: string }) {
  const Icon = place.primaryIcon;
  const detailsHref = `/lodz/${place.categorySlug}/${place.slug}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  const primaryAction = getResultPrimaryAction(place, detailsHref);
  const importantCondition = place.conditions.find((condition) => publicStatusForLabel(condition) === "condition");
  const primaryActionIsCall = primaryAction?.kind === "call";
  const primaryActionIsDetails = primaryAction?.kind === "details";
  const primaryActionIsMobile = place.profileKind === "MOBILE_SERVICE";
  const primaryActionIsFridge = place.profileKind === "FOOD_SHARING";
  const primaryActionIsCalm = (primaryAction?.kind === "details" && !primaryActionIsMobile) || primaryAction?.label === "Zadzwoń i potwierdź";
  const showHours = !place.freshnessWarning && place.status !== "unknownHours" && place.status !== "needsConfirmation";
  const isFoodSharing = place.profileKind === "FOOD_SHARING";
  const isMobileService = place.profileKind === "MOBILE_SERVICE";
  const illustrationSlug = placeIllustrationSlug(place.profileKind, place.categorySlug);
  const routeHref = isFoodSharing ? directionsHref(place) : undefined;
  const showDistance = place.distance !== "Odległość nieznana";

  return (
    <article data-search-result-id={place.id} data-profile-kind={place.profileKind} tabIndex={0} className="search-result-card">
      <div className="search-result-content">
        <div className="search-result-heading">
          <span className="search-result-category-cue" aria-hidden="true">
            <CategoryIllustration slug={illustrationSlug} fallback={Icon} />
          </span>
          <div className="search-result-title-group">
            <h2><Link className="search-result-title-link" href={detailsHref}>{place.name}</Link></h2>
            <p>{isFoodSharing ? "Lodówka społeczna" : place.helpTypes.join(" • ")}</p>
          </div>
          <div className="search-result-status"><PlaceStatusBadge status={place.status} compact freshnessWarning={place.freshnessWarning} profileKind={place.profileKind} mobileSeasonLabel={place.mobileSeasonLabel} mobileSeasonActive={place.mobileSeasonActive} /></div>
        </div>

        <div className="search-result-meta">
          {isMobileService || showHours || showDistance ? (
            <p>
              {isMobileService ? <><Clock3 aria-hidden="true" size={15} /><span>{place.mobileTodayStops?.length ? `Dziś: ${place.mobileTodayStops[0]}` : "Postoje według rozkładu"}</span></> : showHours ? <><Clock3 aria-hidden="true" size={15} /><span>{place.todayHours}</span></> : null}
              {(isMobileService || showHours) && showDistance ? <span aria-hidden="true">·</span> : null}
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
          {routeHref ? <PublicActionLink href={routeHref} variant="secondary" icon={<Navigation aria-hidden="true" size={17} />} external>Trasa</PublicActionLink> : null}
          {primaryAction ? (
            primaryAction.kind === "details" ? (
              <PublicActionLink href={primaryAction.href} variant={primaryActionIsFridge ? "tertiary" : primaryActionIsCalm ? "secondary" : "primary"} icon={<ChevronRight aria-hidden="true" size={17} />}>{primaryAction.label}</PublicActionLink>
            ) : (
              <PublicActionLink href={primaryAction.href} variant={primaryActionIsCalm ? "secondary" : "primary"} icon={primaryActionIsCall ? <Phone aria-hidden="true" size={17} /> : primaryAction.kind === "search" ? <Search aria-hidden="true" size={17} /> : <Navigation aria-hidden="true" size={17} />} external={Boolean(primaryAction.external)}>{primaryAction.label}</PublicActionLink>
            )
          ) : null}
          {!primaryActionIsDetails ? <PublicActionLink href={detailsHref} variant="tertiary" icon={<ChevronRight aria-hidden="true" size={17} />}>Szczegóły</PublicActionLink> : null}
        </div>
      </div>
    </article>
  );
}
