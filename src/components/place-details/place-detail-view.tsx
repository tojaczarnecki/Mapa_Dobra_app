import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";
import type { DetailListItem, PlaceDetail } from "@/data/demo-place-details";
import { AccessibilityList } from "./accessibility-list";
import { AccommodationAvailability } from "./accommodation-availability";
import { DetailSection } from "./detail-section";
import { MapPreview } from "./map-preview";
import { OpeningHours } from "./opening-hours";
import { PlaceContact } from "./place-contact";
import { PlaceHero } from "./place-hero";
import { RequirementList } from "./requirement-list";
import { VerificationInfo } from "./verification-info";

type PlaceDetailViewProps = {
  place: PlaceDetail;
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
  return (
    <>
      <DetailSection title="Godziny działania">
        <OpeningHours days={place.openingHours} />
      </DetailSection>

      <DetailSection title="Czy mogę skorzystać z pomocy?">
        <RequirementList items={place.requirements} />
      </DetailSection>

      <DetailSection title="Dla kogo">
        <TagList items={place.audience} />
      </DetailSection>

      <DetailSection title="Na miejscu">
        <TagList items={place.services} />
      </DetailSection>

      <DetailSection title="Dostępność">
        <AccessibilityList items={place.accessibility} />
      </DetailSection>

      <DetailSection title="O miejscu">
        <Description paragraphs={place.description} />
      </DetailSection>
    </>
  );
}

function AccommodationPlaceSections({ place }: { place: PlaceDetail }) {
  const accommodation = place.accommodation;

  if (!accommodation) {
    return null;
  }

  const admissionItems = mergeUniqueRequirements([
    ...accommodation.admissionRequirements,
    accommodation.sobriety,
    ...accommodation.animals,
  ]);

  return (
    <>
      <DetailSection title="Dla kogo jest nocleg">
        <TagList items={accommodation.audience} />
      </DetailSection>

      <DetailSection title="Warunki przyjęcia">
        <RequirementList items={admissionItems} />
      </DetailSection>

      <DetailSection title="Dostępność noclegu">
        <AccessibilityList items={accommodation.accessibility} />
      </DetailSection>

      {accommodation.overnightInfo.length > 0 ? (
        <DetailSection title="Dodatkowe informacje noclegowe">
          <CompactInfoList items={accommodation.overnightInfo} />
        </DetailSection>
      ) : null}

      <DetailSection title="Godziny przyjęć">
        <OpeningHours days={place.openingHours} />
      </DetailSection>

      <DetailSection title="Na miejscu">
        <TagList items={place.services} />
      </DetailSection>

      <DetailSection title="O miejscu">
        <Description paragraphs={place.description} />
      </DetailSection>
    </>
  );
}

function SideColumn({ place }: { place: PlaceDetail }) {
  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
      <DetailSection title="Kontakt">
        <PlaceContact contact={place.contact} />
      </DetailSection>

      <MapPreview place={place} />

      <Link
        className="touch-target inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-extrabold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
        href={{
          pathname: "/zglos-zmiane",
          query: { place: place.id },
        }}
      >
        <Flag aria-hidden="true" size={17} />
        Zgłoś zmianę lub błąd
      </Link>
    </aside>
  );
}

export function PlaceDetailView({ place }: PlaceDetailViewProps) {
  const accommodation =
    place.variant === "accommodation" ? place.accommodation : undefined;
  const isAccommodation = Boolean(accommodation);
  const backHref = isAccommodation ? "/znajdz-nocleg" : "/szukaj";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8">
      <Link
        className="touch-target mb-3 inline-flex items-center gap-2 rounded-lg px-2 text-sm font-extrabold text-brand-strong transition hover:bg-brand-soft hover:text-foreground"
        href={backHref}
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Wróć do wyników
      </Link>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,760px)_minmax(280px,1fr)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-4">
          {accommodation ? (
            <AccommodationAvailability
              availability={accommodation.availability}
              admissionsToday={accommodation.admissionsToday}
              capacityGroups={accommodation.capacityGroups}
              importantNote={accommodation.importantNote}
            />
          ) : null}

          <PlaceHero
            place={place}
            primaryCallLabel={isAccommodation ? "Zadzwoń i potwierdź" : "Zadzwoń"}
            showStatus={!isAccommodation}
          />

          <VerificationInfo verification={place.verification} />

          {isAccommodation ? (
            <AccommodationPlaceSections place={place} />
          ) : (
            <StandardPlaceSections place={place} />
          )}
        </div>

        <SideColumn place={place} />
      </div>
    </div>
  );
}
