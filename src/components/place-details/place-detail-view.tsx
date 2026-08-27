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
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex min-h-7 max-w-full items-center rounded-md bg-surface-muted px-2.5 text-xs font-bold text-foreground"
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
      {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </div>
  );
}

function CompactInfoList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="min-w-0 divide-y divide-border">
      {items.map((item) => (
        <div key={item.label} className="grid min-w-0 gap-1 py-2 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-4">
          <dt className="min-w-0 font-extrabold text-foreground">{item.label}</dt>
          <dd className="min-w-0 font-semibold leading-6 text-muted-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function mergeUniqueRequirements(items: DetailListItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.label.toLocaleLowerCase("pl-PL");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function StandardPlaceSections({ place }: { place: PlaceDetail }) {
  return (
    <>
      <DetailSection title="Dla kogo">
        <TagList items={place.audience} />
      </DetailSection>

      <DetailSection title="Co oferuje">
        <TagList items={place.services} />
      </DetailSection>

      <DetailSection title="Godziny działania">
        <OpeningHours days={place.openingHours} />
      </DetailSection>

      <DetailSection title="Czy mogę skorzystać z pomocy?">
        <RequirementList items={place.requirements} />
      </DetailSection>

      <DetailSection title="Dostępność">
        <AccessibilityList items={place.accessibility} />
      </DetailSection>

      <DetailSection title="Warto wiedzieć">
        <Description paragraphs={place.description} />
      </DetailSection>
    </>
  );
}

function AccommodationPlaceSections({ place }: { place: PlaceDetail }) {
  const accommodation = place.accommodation;
  if (!accommodation) return null;

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

      <DetailSection title="Godziny przyjęć">
        <OpeningHours days={place.openingHours} />
      </DetailSection>

      <DetailSection title="Dostępność noclegu">
        <AccessibilityList items={accommodation.accessibility} />
      </DetailSection>

      {accommodation.overnightInfo.length > 0 ? (
        <DetailSection title="Warto wiedzieć">
          <CompactInfoList items={accommodation.overnightInfo} />
        </DetailSection>
      ) : null}

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
    <aside className="md-place-side">
      <DetailSection title="Kontakt">
        <PlaceContact contact={place.contact} />
      </DetailSection>

      <div className="mt-3">
        <MapPreview place={place} />
      </div>

      <Link
        className="touch-target mt-3 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-extrabold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
        href={{ pathname: "/zglos-zmiane", query: { place: place.id } }}
      >
        <Flag aria-hidden="true" size={17} />
        Zgłoś zmianę lub błąd
      </Link>
    </aside>
  );
}

export function PlaceDetailView({ place }: PlaceDetailViewProps) {
  const accommodation = place.variant === "accommodation" ? place.accommodation : undefined;
  const isAccommodation = Boolean(accommodation);
  const backHref = isAccommodation ? "/znajdz-nocleg" : "/szukaj";

  return (
    <div className="md-place-detail-page">
      <Link className="md-place-back" href={backHref} aria-label="Wróć do wyników">
        <ArrowLeft aria-hidden="true" size={21} />
      </Link>

      <div className="md-place-detail-grid">
        <div className="md-place-main">
          {accommodation ? (
            <div className="mb-3">
              <AccommodationAvailability
                availability={accommodation.availability}
                admissionsToday={accommodation.admissionsToday}
                capacityGroups={accommodation.capacityGroups}
                importantNote={accommodation.importantNote}
              />
            </div>
          ) : null}

          <PlaceHero
            place={place}
            primaryCallLabel={isAccommodation ? "Zadzwoń i potwierdź" : "Zadzwoń"}
            showStatus={!isAccommodation}
          />

          {isAccommodation ? <AccommodationPlaceSections place={place} /> : <StandardPlaceSections place={place} />}

          <div className="mt-3">
            <VerificationInfo verification={place.verification} />
          </div>
        </div>

        <SideColumn place={place} />
      </div>
    </div>
  );
}
