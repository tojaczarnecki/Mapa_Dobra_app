import Link from "next/link";
import { Accessibility, ArrowLeft, ArrowRight, Clock3, Dog, Flag, Globe, HandHeart, HeartHandshake, HeartPulse, Mail, MapPin, Navigation, Phone, Shirt, ShowerHead, Toilet, Utensils, WashingMachine } from "lucide-react";
import type { DetailListItem, PlaceDetail } from "@/data/demo-place-details";
import type { PlaceStatus } from "@/data/demo-places";
import { AccommodationAvailability } from "./accommodation-availability";
import { DetailSection } from "./detail-section";
import { MapPreview } from "./map-preview";
import { OpeningHours } from "./opening-hours";
import { PlaceFitCheck } from "./place-fit-check";
import { PlaceHero } from "./place-hero";
import { PlaceContact } from "./place-contact";
import { RequirementList } from "./requirement-list";
import { VerificationInfo } from "./verification-info";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { PublicActionLink } from "@/components/places/public-action-link";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { resolvePublicPlaceStatus } from "@/lib/public/status-presentation";

type PlaceDetailViewProps = {
  place: PlaceDetail;
  backHref?: string;
  backLabel?: string;
};

function detailStatusToPlaceStatus(place: PlaceDetail): PlaceStatus {
  if (place.status.tone === "open") return "open";
  if (place.status.tone === "closed") return "closed";
  if (place.status.tone === "openToday") return "openToday";
  return place.verification.tone === "needsConfirmation" ? "needsConfirmation" : "unknownHours";
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex min-h-8 max-w-full items-center rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

const onSiteIcons = [
  { match: /prysznic/iu, icon: ShowerHead },
  { match: /toalet/iu, icon: Toilet },
  { match: /prani/iu, icon: WashingMachine },
  { match: /wózk|bez stopni|dostęp/iu, icon: Accessibility },
  { match: /pies/iu, icon: Dog },
  { match: /opiekuń|asystent/iu, icon: HeartHandshake },
  { match: /posił|jedzeni/iu, icon: Utensils },
  { match: /odzież/iu, icon: Shirt },
  { match: /zdrow/iu, icon: HeartPulse },
] as const;

function onSiteIcon(label: string) {
  return onSiteIcons.find((entry) => entry.match.test(label))?.icon ?? HandHeart;
}

function OnSiteSection({ services, accessibility }: { services: string[]; accessibility: DetailListItem[] }) {
  const confirmedAccessibility = accessibility.filter((item) => item.status === "positive").map((item) => item.label);
  const items = Array.from(new Set([...services, ...confirmedAccessibility])).filter(Boolean);
  if (!items.length) return null;

  return <DetailSection title="Na miejscu" className="place-detail-zone-support">
    <ul className="place-detail-benefit-grid grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = onSiteIcon(item);
        return <li key={item} className="place-detail-benefit flex min-w-0 items-center gap-3 rounded-lg bg-surface-muted px-3 py-3 text-sm font-semibold text-foreground"><span className="place-detail-benefit-icon grid shrink-0 place-items-center rounded-lg" aria-hidden="true"><Icon size={22} /></span><span className="min-w-0 break-words">{item}</span></li>;
      })}
    </ul>
  </DetailSection>;
}

function HowToReach({ place }: { place: PlaceDetail }) {
  const isMobileService = place.profileKind === "MOBILE_SERVICE";
  const routeHref = isMobileService ? undefined : directionsHref(place);
  return <DetailSection title={isMobileService ? "Baza organizatora" : "Jak dotrzeć"} className="place-detail-reach-section place-detail-zone-navigation">
    <div className={isMobileService ? "min-w-0" : "grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:items-center"}>
      <div className="min-w-0">
        <p className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-6 text-foreground"><MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={18} /><span className="min-w-0 break-words">{isMobileService ? "Baza / organizator: " : `${place.name}\n`}{place.address}</span></p>
        {isMobileService ? <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">To adres organizacyjny, nie miejsce postoju. Aktualne lokalizacje znajdziesz w rozkładzie postojów powyżej.</p> : null}
        {routeHref ? <PublicActionLink href={routeHref} variant="secondary" journey="search" system external icon={<Navigation aria-hidden="true" size={17} />} className="mt-4">Wyznacz trasę</PublicActionLink> : null}
      </div>
      {!isMobileService ? <MapPreview place={place} /> : null}
    </div>
  </DetailSection>;
}

function Description({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="grid min-w-0 gap-3 text-sm font-semibold leading-6 text-muted-foreground">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function HowToUse({ place }: { place: PlaceDetail }) {
  if (place.profileKind === "ACCOMMODATION" || place.profileKind === "MOBILE_SERVICE") return null;
  if (place.profileKind === "FOOD_SHARING" && /całodobowo/iu.test(place.status.todayHours)) return null;

  const unknownHours = place.status.tone === "unknown" || place.verification.tone !== "verified" || /brak potwierdzonych/iu.test(place.status.todayHours);
  if (!unknownHours || !place.contact.phone) return null;
  const steps = [{ text: "Zadzwoń przed wyjściem, aby potwierdzić godziny i warunki.", status: "unknown" as const }];

  if (!steps.length) return null;

  return (
    <DetailSection title="Jak skorzystać">
      <ul className="grid gap-2 text-sm font-semibold leading-6 text-foreground">
        {steps.map((step) => {
          return <li key={step.text}><StatusIndicator status="unknown">{step.text}</StatusIndicator></li>;
        })}
      </ul>
    </DetailSection>
  );
}

function AccommodationHowToUse({ place }: { place: PlaceDetail }) {
  const accommodation = place.accommodation;
  if (!accommodation) return null;

  const steps: Array<{ text: string; status: "positive" | "condition" | "unknown" }> = [];
  if (place.contact.phone) {
    steps.push({ text: "Zadzwoń i sprawdź, czy jest wolne miejsce.", status: "condition" });
  }
  if (accommodation.admissionsToday && !/brak (?:potwierdzonych|przyjęć)/iu.test(accommodation.admissionsToday)) {
    steps.push({ text: `Zgłoś się: ${accommodation.admissionsToday}.`, status: "positive" });
  }
  const keyCondition = accommodation.admissionRequirements.find((item) => item.status === "warning");
  if (keyCondition) {
    steps.push({ text: `Pamiętaj: ${keyCondition.label}.`, status: "condition" });
  }
  if (!steps.length) return null;

  return (
    <DetailSection title="Jak skorzystać z noclegu">
      <ol className="grid gap-2 text-sm font-semibold leading-6 text-foreground">
        {steps.map((step, index) => (
          <li key={step.text} className="flex min-w-0 items-start gap-2">
            <span className="shrink-0 font-extrabold text-brand-strong">{index + 1}.</span>
            <StatusIndicator status={step.status === "positive" ? "confirmed" : step.status === "condition" ? "condition" : "unknown"}>{step.text}</StatusIndicator>
          </li>
        ))}
      </ol>
    </DetailSection>
  );
}

function CompactInfoList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface-muted">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid min-w-0 gap-1 border-t border-border px-3 py-2 text-sm first:border-t-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="min-w-0 font-extrabold text-foreground">{item.label}</dt>
          <dd className="min-w-0 font-semibold leading-6 text-muted-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function mergeUniqueRequirements(items: DetailListItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.label.toLocaleLowerCase("pl-PL");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function StandardPlaceSections({ place }: { place: PlaceDetail }) {
  const isFoodSharing = place.profileKind === "FOOD_SHARING";
  if (isFoodSharing) {
    return <>
      {place.description.length ? <DetailSection title="Informacje o dostępie"><Description paragraphs={place.description} /></DetailSection> : null}
    </>;
  }
  return (
    <>
      {place.requirements.length ? <DetailSection title="Czy mogę skorzystać z pomocy?" className="place-detail-zone-availability">
        <RequirementList items={place.requirements} maxVisible={3} />
        <PlaceFitCheck requirements={place.requirements} phone={place.contact.phone} />
      </DetailSection> : null}

      <DetailSection id="godziny-otwarcia" title="Godziny otwarcia" className="place-detail-zone-availability">
        <OpeningHours days={place.openingHours} status={place.status} />
      </DetailSection>

      {place.audience.length ? <DetailSection title="Dla kogo"><p className="text-sm font-semibold text-muted-foreground">Pomoc jest przeznaczona dla:</p><div className="mt-2"><TagList items={place.audience} /></div></DetailSection> : null}
      <OnSiteSection services={place.services.filter((service) => !place.helpTypes.some((type) => type.toLocaleLowerCase("pl-PL") === service.toLocaleLowerCase("pl-PL")))} accessibility={place.accessibility} />

      {place.description.length ? <DetailSection title="O miejscu">
        <Description paragraphs={place.description} />
      </DetailSection> : null}
    </>
  );
}

function MobilePlaceSections({ place }: { place: PlaceDetail }) {
  if (!place.mobile) return null;
  const schedules = place.mobile.stops.flatMap((stop) => stop.schedules.map((schedule, index) => ({ stop, schedule, index })));

  return <DetailSection title="Rozkład postojów">
    <p className="mb-3 text-sm font-semibold leading-6 text-muted-foreground">Rozkład pokazuje planowane dni i godziny. To nie jest śledzenie pojazdu na żywo.</p>
    {schedules.length ? (
      <ul id="mobilna-trasa" className="divide-y divide-border">
        {schedules.map(({ stop, schedule, index }) => (
          <li key={`${stop.name}-${stop.address}-${schedule}-${index}`} className="py-3 first:pt-0 last:pb-0">
            <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-4">
              <strong className="min-w-0 text-sm font-extrabold text-brand-strong">{schedule}</strong>
              <span className="min-w-0 text-sm font-semibold text-foreground">{stop.name}</span>
            </div>
            {stop.address && stop.address !== stop.name ? <p className="mt-1 text-xs font-semibold text-muted-foreground sm:pl-[13rem]">{stop.address}</p> : null}
            {stop.note ? <p className="mt-1 text-xs text-muted-foreground sm:pl-[13rem]">{stop.note}</p> : null}
          </li>
        ))}
      </ul>
    ) : (
      <StatusIndicator status="unknown">Brak opublikowanego rozkładu postojów. Potwierdź trasę u organizatora przed wyjściem.</StatusIndicator>
    )}
  </DetailSection>;
}

function AccommodationPlaceSections({ place }: { place: PlaceDetail }) {
  const accommodation = place.accommodation;

  if (!accommodation) {
    return (
      <>
        <DetailSection title="Informacje o noclegu">
          <p className="text-sm leading-6 text-muted-foreground">Szczegółowe warunki przyjęcia wymagają potwierdzenia.</p>
        </DetailSection>
        <StandardPlaceSections place={place} />
      </>
    );
  }

  const admissionItems = mergeUniqueRequirements([
    ...accommodation.admissionRequirements,
    accommodation.sobriety,
    ...accommodation.animals,
  ]);
  const hasConfirmedAccessibility = accommodation.accessibility.some((item) => item.status !== "unknown");
  const hasUsefulHours = place.openingHours.some((day) => day.status !== "unknown" && Boolean(day.periods?.length));
  const practicalServices = place.services.filter((service) => !place.helpTypes.some((type) => type.toLocaleLowerCase("pl-PL") === service.toLocaleLowerCase("pl-PL")));

  return (
    <>
      <DetailSection title="Czy to miejsce jest dla mnie?">
        <p className="text-sm font-semibold text-muted-foreground">Pomoc jest przeznaczona dla:</p>
        <div className="mt-2"><TagList items={accommodation.audience} /></div>
        <div className="mt-4">
          <RequirementList items={admissionItems} maxVisible={3} />
        </div>
        <PlaceFitCheck requirements={admissionItems} phone={place.contact.phone} />
      </DetailSection>

      {hasUsefulHours ? (
        <DetailSection title="Godziny otwarcia" className="place-detail-zone-availability">
          <OpeningHours days={place.openingHours} status={place.status} />
        </DetailSection>
      ) : null}

      {practicalServices.length || hasConfirmedAccessibility ? <OnSiteSection services={practicalServices} accessibility={accommodation.accessibility} /> : null}

      {accommodation.overnightInfo.length > 0 ? (
        <DetailSection title="Dodatkowe informacje noclegowe">
          <CompactInfoList items={accommodation.overnightInfo} />
        </DetailSection>
      ) : null}

      {place.description.length ? <DetailSection title="O miejscu">
        <Description paragraphs={place.description} />
      </DetailSection> : null}
    </>
  );
}

function ActionRail({ place, className = "" }: { place: PlaceDetail; className?: string }) {
  const callHref = telephoneHref(place.contact.phone);
  const isMobileService = place.profileKind === "MOBILE_SERVICE";
  const routeHref = isMobileService ? undefined : directionsHref(place);
  const needsConfirmation = place.status.tone === "unknown" || place.verification.tone !== "verified" || /brak potwierdzonych|wymagają potwierdzenia/iu.test(place.status.todayHours);
  const closed = place.status.tone === "closed";
  const mobileSeasonLabel = place.mobile?.season ? `${place.mobile.season.start} – ${place.mobile.season.end}` : undefined;
  const mobileStatus = isMobileService
    ? resolvePublicPlaceStatus({
        status: detailStatusToPlaceStatus(place),
        freshnessWarning: place.verification.tone !== "verified",
        profileKind: place.profileKind,
        mobileSeasonLabel,
        mobileSeasonActive: place.mobile?.season?.isActiveNow,
      })
    : undefined;
  const mobileUnavailable = isMobileService && mobileStatus?.publicStatus === "absent";
  const mobileUnknown = isMobileService && mobileStatus?.publicStatus === "unknown";
  const mobileCanUseSchedule = isMobileService && mobileStatus?.publicStatus === "confirmed";
  const primary = isMobileService
    ? closed || mobileUnavailable
      ? { href: "/szukaj?otwarte=1", label: "Zobacz inne miejsca", icon: <ArrowRight aria-hidden="true" size={17} /> }
      : mobileUnknown && callHref
        ? { href: callHref, label: "Zadzwoń i potwierdź", icon: <Phone aria-hidden="true" size={17} /> }
        : mobileUnknown
          ? { href: "/szukaj", label: "Zobacz inne miejsca", icon: <ArrowRight aria-hidden="true" size={17} /> }
          : mobileCanUseSchedule
            ? { href: "#mobilna-trasa", label: "Zobacz rozkład postojów", icon: <Navigation aria-hidden="true" size={17} /> }
            : null
    : closed
      ? { href: "/szukaj?otwarte=1", label: "Zobacz miejsca otwarte teraz", icon: <ArrowRight aria-hidden="true" size={17} /> }
      : needsConfirmation && callHref
        ? { href: callHref, label: "Zadzwoń i potwierdź", icon: <Phone aria-hidden="true" size={17} /> }
        : routeHref
          ? { href: routeHref, label: "Wyznacz trasę", icon: <Navigation aria-hidden="true" size={17} /> }
          : callHref
            ? { href: callHref, label: "Zadzwoń", icon: <Phone aria-hidden="true" size={17} /> }
            : null;
  const heading = isMobileService
    ? closed
      ? "Teraz niedostępne"
      : mobileUnavailable
        ? "Poza sezonem"
        : mobileUnknown
          ? "Potwierdź przed wyjściem"
          : "Sprawdź planowane postoje"
    : closed
      ? "Teraz zamknięte"
      : needsConfirmation
        ? "Potwierdź przed przyjazdem"
        : "Otwarte teraz";
  const statusLine = isMobileService ? mobileStatus?.label : place.status.todayHours;

  return <aside className={["place-detail-utility-rail min-w-0 lg:sticky lg:top-24", className].filter(Boolean).join(" ")}>
    <section className="place-detail-utility-group place-detail-action-rail px-5">
      <h2 className="text-xl font-extrabold text-foreground">{heading}</h2>
      {statusLine ? <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground"><Clock3 aria-hidden="true" className="mr-1 inline text-brand-strong" size={16} />{statusLine}</p> : null}
      <div className="mt-3 grid min-w-0 gap-1.5">
        {primary ? <PublicActionLink className="place-detail-rail-primary" href={primary.href} variant="primary" journey="search" system external={primary.href.startsWith("http") || primary.href.startsWith("tel:")} icon={primary.icon}>{primary.label}</PublicActionLink> : null}
        {callHref && primary?.href !== callHref ? <PublicActionLink href={callHref} variant="secondary" icon={<Phone aria-hidden="true" size={17} />}>Zadzwoń</PublicActionLink> : null}
        {closed && routeHref ? <PublicActionLink href={routeHref} variant="secondary" external icon={<Navigation aria-hidden="true" size={17} />}>Wyznacz trasę</PublicActionLink> : null}
        {!isMobileService ? <PublicActionLink href="#godziny-otwarcia" variant="tertiary" icon={<Clock3 aria-hidden="true" size={17} />} className="place-detail-rail-tertiary">Zobacz godziny</PublicActionLink> : null}
      </div>
    </section>
    {place.contact.email || place.contact.website || place.contact.social ? <section className="place-detail-utility-group place-detail-rail-contact px-5"><h2>Kontakt</h2><div className="mt-2 grid gap-1">{place.contact.email ? <a className="touch-target inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-brand-strong" href={`mailto:${place.contact.email}`}><Mail aria-hidden="true" size={16} /><span className="min-w-0 break-words">{place.contact.email}</span></a> : null}{place.contact.website ? <a className="touch-target inline-flex items-center gap-2 text-sm font-semibold text-brand-strong" href={place.contact.website}><Globe aria-hidden="true" size={16} />Strona internetowa</a> : null}{place.contact.social ? <a className="touch-target inline-flex items-center gap-2 text-sm font-semibold text-brand-strong" href={place.contact.social}><Globe aria-hidden="true" size={16} />Social media</a> : null}</div></section> : null}
    <section className="place-detail-utility-group place-detail-rail-report px-5"><Link className="place-detail-tertiary-action touch-target inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground" href={{ pathname: "/zglos-zmiane", query: { place: place.id } }}><Flag aria-hidden="true" size={17} />Zgłoś zmianę lub błąd</Link></section>
  </aside>;
}

export function PlaceDetailView({
  place,
  backHref: requestedBackHref,
  backLabel: requestedBackLabel,
}: PlaceDetailViewProps) {
  const accommodation = place.profileKind === "ACCOMMODATION" ? place.accommodation : undefined;
  const isAccommodation = place.profileKind === "ACCOMMODATION";
  const backHref = requestedBackHref ?? (isAccommodation ? "/znajdz-nocleg" : "/szukaj");
  const backLabel = requestedBackLabel ?? "Wróć do wyników";
  const reportHref = `/zglos-zmiane?place=${encodeURIComponent(place.id)}`;

  return (
    <div className="place-detail-page journey-search mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8">
      <Link
        className="touch-target mb-3 inline-flex items-center gap-2 rounded-lg px-2 text-sm font-extrabold text-brand-strong transition hover:bg-brand-soft hover:text-foreground"
        href={backHref}
      >
        <ArrowLeft aria-hidden="true" size={17} />
        {backLabel}
      </Link>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,760px)_minmax(280px,1fr)] lg:items-start lg:gap-8">
        <div className="place-detail-main min-w-0">
          <PlaceHero
            place={place}
            primaryCallLabel={isAccommodation ? "Zadzwoń i potwierdź" : "Zadzwoń"}
            showStatus={!isAccommodation}
          />

          {accommodation ? (
            <AccommodationAvailability
              availability={accommodation.availability}
              admissionsToday={accommodation.admissionsToday}
              capacityGroups={accommodation.capacityGroups}
              importantNote={accommodation.importantNote}
            />
          ) : null}

          {isAccommodation ? <AccommodationHowToUse place={place} /> : <HowToUse place={place} />}

          {place.profileKind === "MOBILE_SERVICE" ? <MobilePlaceSections place={place} /> : isAccommodation ? (
            <AccommodationPlaceSections place={place} />
          ) : (
            <StandardPlaceSections place={place} />
          )}
          {place.contact.phone || place.contact.email || place.contact.website || place.contact.social ? (
            <section className="place-detail-mobile-contact lg:hidden" aria-labelledby="place-detail-mobile-contact-title">
              <h2 id="place-detail-mobile-contact-title">Kontakt</h2>
              <PlaceContact contact={place.contact} className="place-detail-mobile-contact-list" />
            </section>
          ) : null}
          <HowToReach place={place} />

          <VerificationInfo
            verification={place.verification}
            reportHref={reportHref}
            phone={place.contact.phone}
          />
        </div>

        <ActionRail place={place} className="hidden lg:grid" />
      </div>
    </div>
  );
}
