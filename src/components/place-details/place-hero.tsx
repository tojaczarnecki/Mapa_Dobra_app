import { Clock3, MapPin, Navigation, Phone, Search } from "lucide-react";
import type { PlaceDetail } from "@/data/demo-place-details";
import { FavoritePlaceButton } from "@/components/favorites/favorite-place-button";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { SharePlaceButton } from "./share-place-button";
import { ShowHelpCardButton } from "./show-help-card-button";
import { getAccommodationPrimaryAction } from "@/lib/accommodations/presentation";
import { PublicActionLink } from "@/components/places/public-action-link";
import { PlaceStatusBadge } from "@/components/places/place-status-badge";

type PlaceHeroProps = {
  place: PlaceDetail;
  primaryCallLabel?: string;
  showStatus?: boolean;
};

export function PlaceHero({
  place,
  primaryCallLabel = "Zadzwoń",
  showStatus = true,
}: PlaceHeroProps) {
  const isMobileService = place.profileKind === "MOBILE_SERVICE";
  const routeHref = isMobileService ? undefined : directionsHref(place);
  const callHref = telephoneHref(place.contact.phone);
  const needsConfirmation = place.status.tone === "unknown" || place.verification.tone !== "verified" || /brak potwierdzonych|wymagają potwierdzenia/iu.test(place.status.todayHours);
  const closedNow = place.status.tone === "closed";
  const accommodationPrimaryAction = place.accommodation
    ? getAccommodationPrimaryAction({ phoneHref: callHref, routeHref, closedNow, needsConfirmation })
    : undefined;
  const accommodationCallPrimary = Boolean(place.accommodation && callHref);
  const primaryIsCall = !isMobileService && (accommodationCallPrimary || Boolean(callHref && needsConfirmation && !closedNow));
  const primaryIsOpenSearch = !isMobileService && (closedNow || (needsConfirmation && !callHref));
  const primaryHref = isMobileService ? "#mobilna-trasa" : accommodationPrimaryAction?.href ?? (primaryIsOpenSearch ? "/szukaj?otwarte=1" : primaryIsCall ? callHref : routeHref ?? callHref);
  const primaryLabel = isMobileService ? "Zobacz postoje" : accommodationPrimaryAction?.label ?? (closedNow ? "Zobacz miejsca otwarte teraz" : primaryIsOpenSearch ? "Zobacz inne miejsca" : primaryIsCall ? (accommodationCallPrimary ? "Zadzwoń i sprawdź miejsce" : primaryCallLabel) : routeHref ? "Wyznacz trasę" : "Zadzwoń");
  const primaryKind = isMobileService ? "details" : accommodationPrimaryAction?.kind;
  const hasDistance = place.distanceLabel.trim() && !/odległość nieznana|brak odległości/iu.test(place.distanceLabel);
  const hideUnconfirmedFridgeHours = place.profileKind === "FOOD_SHARING" && place.status.tone === "unknown" && /całą dobę|całodobowo/iu.test(place.status.todayHours);
  const isFoodSharing = place.profileKind === "FOOD_SHARING";
  const publicStatus = needsConfirmation && !closedNow
    ? "needsConfirmation"
    : place.status.tone === "unknown"
      ? "unknownHours"
      : place.status.tone;
  const keyAccommodationCondition = place.accommodation?.admissionRequirements.find((item) => item.status === "warning");
  return (
    <section data-profile-kind={place.profileKind} className="place-detail-hero w-full min-w-0 p-4 sm:p-5">
      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">
              {place.name}
            </h1>
            <p className="text-base font-extrabold leading-6 text-muted-foreground">
              {place.helpTypes.join(" • ")}
            </p>
            {isMobileService && place.mobile?.season ? (
              <div className="space-y-1 text-sm font-extrabold text-foreground">
                <p>Sezonowo · {place.mobile.season.start} – {place.mobile.season.end}</p>
                {place.mobile.season.isActiveNow ? <p className="text-brand-strong">Kursuje w sezonie</p> : null}
                {!place.mobile.season.isActiveNow ? <><p className="text-urgent">Poza sezonem</p><p className="font-semibold text-muted-foreground">Autobus kursuje od {place.mobile.season.start} do {place.mobile.season.end}.</p></> : null}
              </div>
            ) : null}
            {isMobileService && place.mobile?.season?.isActiveNow && place.mobile.todayStops.length ? (
              <div className="space-y-1 text-sm font-semibold text-foreground">
                <p className="font-extrabold">Dziś zatrzymuje się:</p>
                <ul className="space-y-1">
                  {place.mobile.todayStops.slice(0, 4).map((stop) => <li key={`${stop.time}-${stop.name}`}><strong className="mr-2 text-brand-strong">{stop.time}</strong>{stop.name}</li>)}
                </ul>
                <p className="text-xs font-semibold leading-5 text-muted-foreground">To planowane postoje, nie bieżące śledzenie autobusu. Godziny mogą się zmienić z powodu opóźnień.</p>
              </div>
            ) : null}
            {place.accommodation?.audience.length ? (
              <p className="text-sm font-semibold text-foreground">
                Dla: {place.accommodation.audience.join(", ")}
              </p>
            ) : null}
          </div>
          <FavoritePlaceButton place={place} />
        </div>

        {keyAccommodationCondition ? (
          <div className="text-sm font-semibold text-foreground">
            <StatusIndicator status="condition">{keyAccommodationCondition.label}</StatusIndicator>
          </div>
        ) : null}

        {showStatus ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {!isMobileService ? <PlaceStatusBadge status={publicStatus} profileKind={place.profileKind} /> : null}
            {!isMobileService && !hideUnconfirmedFridgeHours ? <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
              <span className="min-w-0">{place.status.todayHours}</span>
            </p> : null}
            {isFoodSharing ? <p className="basis-full text-sm font-semibold leading-6 text-muted-foreground">Zawartość lodówki jest zmienna i zależy od bieżących darów. Nie możemy zagwarantować, że w danym momencie znajduje się w niej jedzenie.</p> : null}
            {isMobileService ? <p className="basis-full text-sm font-semibold leading-6 text-muted-foreground">Ciepły posiłek i gorące napoje. Możliwy dowóz do noclegowni przy ul. Przybyszewskiego 253.</p> : null}
          </div>
        ) : null}

        <div className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          {hasDistance ? <p className="flex min-w-0 items-center gap-2">
            <Navigation aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{place.distanceLabel}</span>
          </p> : null}
          <p className="flex min-w-0 items-start gap-2 leading-6">
            <MapPin
              aria-hidden="true"
              size={18}
              className="mt-0.5 shrink-0 text-brand-strong"
            />
            <span className="min-w-0">{place.address}</span>
          </p>
        </div>

        <div className="place-detail-actions grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          {primaryHref ? (
            <PublicActionLink href={primaryHref} variant="primary" external={Boolean(primaryKind === "route" || (!primaryKind && !primaryIsCall && !primaryIsOpenSearch && routeHref))} icon={primaryKind === "search" || (!primaryKind && primaryIsOpenSearch) ? <Search aria-hidden="true" size={17} /> : primaryKind === "call" || (!primaryKind && primaryIsCall) ? <Phone aria-hidden="true" size={17} /> : <Navigation aria-hidden="true" size={17} />}>
              {primaryLabel}
            </PublicActionLink>
          ) : null}
          {closedNow ? <PublicActionLink href="#godziny-otwarcia" variant="secondary" icon={<Clock3 aria-hidden="true" size={17} />}>Zobacz godziny</PublicActionLink> : null}
          {routeHref && (primaryIsCall || primaryIsOpenSearch) ? (
            <PublicActionLink href={routeHref} variant="tertiary" external icon={<Navigation aria-hidden="true" size={17} />}>Wyznacz trasę</PublicActionLink>
          ) : null}
          {isMobileService && callHref ? <PublicActionLink href={callHref} variant="secondary" icon={<Phone aria-hidden="true" size={17} />}>Zadzwoń</PublicActionLink> : null}
          {callHref && !primaryIsCall && !primaryIsOpenSearch && routeHref ? (
            <PublicActionLink href={callHref} variant="secondary" icon={<Phone aria-hidden="true" size={17} />}>Zadzwoń</PublicActionLink>
          ) : null}
          <ShowHelpCardButton place={place} />
          <SharePlaceButton className="justify-center" title={place.name} />
        </div>
      </div>
    </section>
  );
}
