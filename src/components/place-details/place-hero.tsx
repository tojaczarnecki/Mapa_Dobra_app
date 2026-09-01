import { Clock3, MapPin, Navigation, Phone, Search } from "lucide-react";
import type { PlaceDetail } from "@/data/demo-place-details";
import { FavoritePlaceButton } from "@/components/favorites/favorite-place-button";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { SharePlaceButton } from "./share-place-button";
import { ShowHelpCardButton } from "./show-help-card-button";
import { getAccommodationPrimaryAction } from "@/lib/accommodations/presentation";

type PlaceHeroProps = {
  place: PlaceDetail;
  primaryCallLabel?: string;
  showStatus?: boolean;
};

const statusClass: Record<PlaceDetail["status"]["tone"], string> = {
  open: "border-brand bg-brand-soft text-foreground",
  openToday: "border-brand bg-brand-soft text-foreground",
  closed: "border-border bg-surface-muted text-foreground",
  unknown: "border-border bg-surface-muted text-foreground",
};

export function PlaceHero({
  place,
  primaryCallLabel = "Zadzwoń",
  showStatus = true,
}: PlaceHeroProps) {
  const routeHref = directionsHref(place);
  const callHref = telephoneHref(place.contact.phone);
  const needsConfirmation = place.status.tone === "unknown" || place.verification.tone !== "verified" || /brak potwierdzonych|wymagają potwierdzenia/iu.test(place.status.todayHours);
  const closedNow = place.status.tone === "closed";
  const accommodationPrimaryAction = place.accommodation
    ? getAccommodationPrimaryAction({ phoneHref: callHref, routeHref, closedNow, needsConfirmation })
    : undefined;
  const accommodationCallPrimary = Boolean(place.accommodation && callHref);
  const primaryIsCall = accommodationCallPrimary || Boolean(callHref && needsConfirmation && !closedNow);
  const primaryIsOpenSearch = closedNow || (needsConfirmation && !callHref);
  const primaryHref = accommodationPrimaryAction?.href ?? (primaryIsOpenSearch ? "/szukaj?otwarte=1" : primaryIsCall ? callHref : routeHref ?? callHref);
  const primaryLabel = accommodationPrimaryAction?.label ?? (closedNow ? "Znajdź miejsce otwarte teraz" : primaryIsOpenSearch ? "Zobacz inne miejsca" : primaryIsCall ? (accommodationCallPrimary ? "Zadzwoń i sprawdź miejsce" : primaryCallLabel) : routeHref ? "Wyznacz trasę" : "Zadzwoń");
  const primaryKind = accommodationPrimaryAction?.kind;
  const hasDistance = place.distanceLabel.trim() && !/odległość nieznana|brak odległości/iu.test(place.distanceLabel);
  const hideUnconfirmedFridgeHours = place.profileKind === "FOOD_SHARING" && place.status.tone === "unknown" && /całą dobę|całodobowo/iu.test(place.status.todayHours);
  const keyAccommodationCondition = place.accommodation?.admissionRequirements.find((item) => item.status === "warning");
  return (
    <section className="w-full min-w-0 rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">
              {place.name}
            </h1>
            <p className="text-base font-extrabold leading-6 text-muted-foreground">
              {place.helpTypes.join(" • ")}
            </p>
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
            <span
              className={[
                "inline-flex min-h-8 max-w-full items-center self-start rounded-full border px-3 text-xs font-extrabold tracking-wide",
                statusClass[needsConfirmation ? "unknown" : place.status.tone],
              ].join(" ")}
            >
              <StatusIndicator status={place.status.tone === "unknown" || needsConfirmation ? "unknown" : place.status.tone === "closed" ? "absent" : "confirmed"}>
                {needsConfirmation && place.status.tone !== "closed" ? `Według ostatnich danych: ${place.status.label.toLocaleLowerCase("pl-PL")}` : place.status.label}
              </StatusIndicator>
            </span>
            {!hideUnconfirmedFridgeHours ? <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
              <span className="min-w-0">{place.status.todayHours}</span>
            </p> : null}
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

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          {primaryHref ? (
            <a
              className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-extrabold text-foreground shadow-sm transition hover:bg-brand-strong hover:text-white"
              href={primaryHref}
              target={primaryKind === "route" || (!primaryKind && !primaryIsCall && !primaryIsOpenSearch && routeHref) ? "_blank" : undefined}
              rel={primaryKind === "route" || (!primaryKind && !primaryIsCall && !primaryIsOpenSearch && routeHref) ? "noreferrer" : undefined}
            >
              {primaryKind === "search" || (!primaryKind && primaryIsOpenSearch) ? <Search aria-hidden="true" size={17} /> : primaryKind === "call" || (!primaryKind && primaryIsCall) ? <Phone aria-hidden="true" size={17} /> : <Navigation aria-hidden="true" size={17} />}
              {primaryLabel}
            </a>
          ) : null}
          {routeHref && (primaryIsCall || primaryIsOpenSearch) ? (
            <a
              className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-brand bg-surface px-3 py-2 text-sm font-extrabold text-foreground transition hover:bg-brand-soft"
              href={routeHref}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation aria-hidden="true" size={17} />
              Wyznacz trasę
            </a>
          ) : null}
          {callHref && !primaryIsCall && !primaryIsOpenSearch && routeHref ? (
            <a className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-extrabold text-foreground transition hover:bg-brand-soft" href={callHref}>
              <Phone aria-hidden="true" size={17} />
              Zadzwoń
            </a>
          ) : null}
          <ShowHelpCardButton place={place} />
          <SharePlaceButton className="justify-center" title={place.name} />
        </div>
      </div>
    </section>
  );
}
