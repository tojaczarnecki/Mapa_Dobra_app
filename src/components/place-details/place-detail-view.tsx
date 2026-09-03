import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";
import type { DetailListItem, PlaceDetail } from "@/data/demo-place-details";
import { AccessibilityList } from "./accessibility-list";
import { AccommodationAvailability } from "./accommodation-availability";
import { DetailSection } from "./detail-section";
import { MapPreview } from "./map-preview";
import { OpeningHours } from "./opening-hours";
import { PlaceContact } from "./place-contact";
import { PlaceFitCheck } from "./place-fit-check";
import { PlaceHero } from "./place-hero";
import { RequirementList } from "./requirement-list";
import { VerificationInfo } from "./verification-info";
import { StatusIndicator } from "@/components/ui/status-indicator";

type PlaceDetailViewProps = {
  place: PlaceDetail;
  backHref?: string;
  backLabel?: string;
};

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
  if (place.profileKind === "ACCOMMODATION") return null;
  if (place.profileKind === "FOOD_SHARING" && /całodobowo/iu.test(place.status.todayHours)) return null;

  const unknownHours = place.status.tone === "unknown" || place.verification.tone !== "verified" || /brak potwierdzonych/iu.test(place.status.todayHours);
  const closedNow = place.status.tone === "closed";
  const today = place.openingHours.find((day) => day.isToday);
  const todayIndex = today ? place.openingHours.indexOf(today) : -1;
  const nextOpening = closedNow && todayIndex >= 0
    ? Array.from({ length: place.openingHours.length - 1 }, (_, offset) => place.openingHours[(todayIndex + offset + 1) % place.openingHours.length])
      .find((day) => day.status === "open" && day.periods?.length)
    : undefined;
  const steps = [] as Array<{ text: string; status: "positive" | "absent" | "unknown" }>;

  if (place.status.todayHours) {
    steps.push({
      text: unknownHours
        ? place.contact.phone ? "Zadzwoń przed wyjściem, aby potwierdzić godziny i warunki." : "Godziny wymagają potwierdzenia przed wyjściem."
        : closedNow ? "Dzisiaj miejsce jest zamknięte." : `Przyjdź: ${place.status.todayHours}.`,
      status: unknownHours ? "unknown" : closedNow ? "absent" : "positive",
    });
  }
  if (nextOpening) {
    steps.push({
      text: `Najbliższa możliwość: ${nextOpening.day.toLocaleLowerCase("pl-PL")} ${nextOpening.periods!.join(", ")}.`,
      status: "positive",
    });
  }

  if (!steps.length) return null;

  return (
    <DetailSection title="Jak skorzystać">
      <ul className="grid gap-2 text-sm font-semibold leading-6 text-foreground">
        {steps.map((step) => {
          return <li key={step.text}><StatusIndicator status={step.status === "positive" ? "confirmed" : step.status === "absent" ? "absent" : "unknown"}>{step.text}</StatusIndicator></li>;
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
      <DetailSection title="Godziny dostępu"><OpeningHours days={place.openingHours} /></DetailSection>
      {place.description.length ? <DetailSection title="Informacje o dostępie"><Description paragraphs={place.description} /></DetailSection> : null}
    </>;
  }
  return (
    <>
      {place.requirements.length ? <DetailSection title="Czy mogę skorzystać z pomocy?">
        <RequirementList items={place.requirements} maxVisible={3} />
        <PlaceFitCheck requirements={place.requirements} phone={place.contact.phone} />
      </DetailSection> : null}

      <DetailSection title="Godziny działania">
        <OpeningHours days={place.openingHours} />
      </DetailSection>

      {place.audience.length || place.services.length || place.accessibility.length ? <DetailSection title="Informacje praktyczne">
        <div className="divide-y divide-border">
          {place.audience.length ? <div className="pb-4"><h3 className="text-sm font-extrabold text-foreground">Dla kogo</h3><p className="mt-2 text-sm font-semibold text-muted-foreground">Pomoc jest przeznaczona dla:</p><div className="mt-2"><TagList items={place.audience} /></div></div> : null}
          {place.services.length ? <div className="py-4"><h3 className="text-sm font-extrabold text-foreground">Na miejscu</h3><div className="mt-2"><TagList items={place.services.filter((service) => !place.helpTypes.some((type) => type.toLocaleLowerCase("pl-PL") === service.toLocaleLowerCase("pl-PL")))} /></div></div> : null}
          {place.accessibility.length ? <div className="pt-4"><h3 className="text-sm font-extrabold text-foreground">Dostępność</h3><div className="mt-2"><AccessibilityList items={place.accessibility} /></div></div> : null}
        </div>
      </DetailSection> : null}

      {place.description.length ? <DetailSection title="O miejscu">
        <Description paragraphs={place.description} />
      </DetailSection> : null}
    </>
  );
}

function MobilePlaceSections({ place }: { place: PlaceDetail }) {
  if (!place.mobile) return null;
  return <>
    {place.mobile.season ? <DetailSection title="Sezon działania"><p className="text-sm font-semibold leading-6">{place.mobile.season.active ? `Kursuje: ${place.mobile.season.start} – ${place.mobile.season.end}${place.mobile.season.isActiveNow ? " · trwa teraz" : " · poza sezonem"}` : "Brak potwierdzonego sezonu"}</p></DetailSection> : null}
    <DetailSection title="Przystanki"><div className="space-y-3">{place.mobile.stops.map((stop) => <article key={`${stop.name}-${stop.address}`} className="rounded-lg border border-border bg-surface-muted p-3"><h3 className="font-extrabold">{stop.name}</h3><p className="mt-1 text-sm font-semibold">{stop.address}</p>{stop.schedules.length ? <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-muted-foreground">{stop.schedules.join("\n")}</p> : null}{stop.note ? <p className="mt-2 text-sm text-muted-foreground">{stop.note}</p> : null}</article>)}</div></DetailSection>
  </>;
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
        <DetailSection title="Godziny przyjęć">
          <OpeningHours days={place.openingHours} />
        </DetailSection>
      ) : null}

      {hasConfirmedAccessibility ? (
        <DetailSection title="Dostępność">
          <AccessibilityList items={accommodation.accessibility} />
        </DetailSection>
      ) : null}

      {accommodation.overnightInfo.length > 0 ? (
        <DetailSection title="Dodatkowe informacje noclegowe">
          <CompactInfoList items={accommodation.overnightInfo} />
        </DetailSection>
      ) : null}

      {practicalServices.length ? (
        <DetailSection title="Na miejscu">
          <TagList items={practicalServices} />
        </DetailSection>
      ) : null}

      {place.description.length ? <DetailSection title="O miejscu">
        <Description paragraphs={place.description} />
      </DetailSection> : null}
    </>
  );
}

function SideColumn({ place }: { place: PlaceDetail }) {
  const hasContact = Boolean(
    place.contact.phone ||
      place.contact.email ||
      place.contact.website ||
      place.contact.social,
  );

  return (
    <aside className="place-detail-utility-rail min-w-0 lg:sticky lg:top-24">
      {hasContact ? (
        <section className="place-detail-utility-group">
          <h2>Kontakt</h2>
          <PlaceContact contact={place.contact} />
        </section>
      ) : null}

      <section className="place-detail-utility-group place-detail-utility-map">
        <MapPreview place={place} />
      </section>

      <section className="place-detail-utility-group place-detail-utility-report">
        <Link
          className="touch-target inline-flex min-w-0 items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
          href={{
            pathname: "/zglos-zmiane",
            query: { place: place.id },
          }}
        >
          <Flag aria-hidden="true" size={17} />
          Zgłoś zmianę lub błąd
        </Link>
      </section>
    </aside>
  );
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

          <VerificationInfo
            verification={place.verification}
            reportHref={reportHref}
            phone={place.contact.phone}
          />
        </div>

        <SideColumn place={place} />
      </div>
    </div>
  );
}
