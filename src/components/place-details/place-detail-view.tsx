import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";
import type { DetailListItem, PlaceDetail } from "@/data/demo-place-details";
import type { DetailReturnLink } from "@/lib/places/detail-return";
import { AccessibilityList } from "./accessibility-list";
import { AccommodationAvailability } from "./accommodation-availability";
import { DetailSection } from "./detail-section";
import { MapPreview } from "./map-preview";
import { OpeningHours } from "./opening-hours";
import { PlaceContact } from "./place-contact";
import { PlaceHero } from "./place-hero";
import { RequirementList } from "./requirement-list";
import { VerificationInfo } from "./verification-info";
import { PlaceCorrectionTrigger } from "./place-correction-trigger";
import styles from "./place-detail.module.css";

type PlaceDetailViewProps = {
  place: PlaceDetail;
  returnLink: DetailReturnLink;
};

function TagList({ items }: { items: string[] }) {
  return (
    <div className="place-detail-tags">
      {items.map((item) => (
        <span
          key={item}
          className="place-detail-tag"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Description({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="place-detail-description">
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
    <dl className="place-detail-info-list">
      {items.map((item) => (
        <div
          key={item.label}
          className="place-detail-info-row"
        >
          <dt className="place-detail-info-label">{item.label}</dt>
          <dd className="place-detail-info-value">
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
  const correction = (field: Parameters<typeof PlaceCorrectionTrigger>[0]["field"], currentValue: string, extra: { latitude?: number; longitude?: number } = {}) => <PlaceCorrectionTrigger placeId={place.id} field={field} currentValue={currentValue} {...extra} />;
  return (
    <>
      <DetailSection title="Godziny działania" action={correction("hours", place.status.todayHours)}>
        <OpeningHours days={place.openingHours} />
      </DetailSection>

      <DetailSection title="Czy mogę skorzystać z pomocy?" action={correction("requirements", place.requirements.map((item) => item.label).join("\n"))}>
        <RequirementList items={place.requirements} />
      </DetailSection>

      <DetailSection title="Dla kogo">
        <TagList items={place.audience} />
      </DetailSection>

      <DetailSection title="Na miejscu">
        <TagList items={place.services} />
      </DetailSection>

      <DetailSection title="Dostępność" action={correction("accessibility", place.accessibility.map((item) => item.label).join("\n"))}>
        <AccessibilityList items={place.accessibility} />
      </DetailSection>

      <DetailSection title="O miejscu" action={correction("description", place.description.join("\n\n"))}>
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

  const correction = (field: Parameters<typeof PlaceCorrectionTrigger>[0]["field"], currentValue: string) => <PlaceCorrectionTrigger placeId={place.id} field={field} currentValue={currentValue} />;

  const admissionItems = mergeUniqueRequirements([
    ...accommodation.admissionRequirements,
    accommodation.sobriety,
    ...accommodation.animals,
  ]);

  return (
    <>
      <DetailSection title="Dla kogo jest nocleg" action={correction("accommodation", accommodation.audience.join(", "))}>
        <TagList items={accommodation.audience} />
      </DetailSection>

      <DetailSection title="Warunki przyjęcia" action={correction("requirements", admissionItems.map((item) => item.label).join("\n"))}>
        <RequirementList items={admissionItems} />
      </DetailSection>

      <DetailSection title="Dostępność noclegu" action={correction("accessibility", accommodation.accessibility.map((item) => item.label).join("\n"))}>
        <AccessibilityList items={accommodation.accessibility} />
      </DetailSection>

      {accommodation.overnightInfo.length > 0 ? (
        <DetailSection title="Dodatkowe informacje noclegowe">
          <CompactInfoList items={accommodation.overnightInfo} />
        </DetailSection>
      ) : null}

      <DetailSection title="Godziny przyjęć" action={correction("hours", place.status.todayHours)}>
        <OpeningHours days={place.openingHours} />
      </DetailSection>

      <DetailSection title="Na miejscu">
        <TagList items={place.services} />
      </DetailSection>

      <DetailSection title="O miejscu" action={correction("description", place.description.join("\n\n"))}>
        <Description paragraphs={place.description} />
      </DetailSection>
    </>
  );
}

function SideColumn({ place }: { place: PlaceDetail }) {
  return (
    <aside className="place-detail-sidebar">
      <DetailSection title="Kontakt">
        <PlaceContact contact={place.contact} placeId={place.id} />
      </DetailSection>

      <MapPreview place={place} />

      <Link
        className="place-detail-sidebar-action"
        href={{
          pathname: "/zglos-zmiane",
          query: { place: place.id },
        }}
      >
        <Flag aria-hidden="true" size={15} />
        Zgłoś zmianę lub błąd
      </Link>
      <Link className="place-detail-organization-link" href={`/dla-organizacji/dostep?place=${place.id}`}>
        Reprezentujesz tę placówkę? <span>Poproś o dostęp</span>
      </Link>
    </aside>
  );
}

export function PlaceDetailView({ place, returnLink }: PlaceDetailViewProps) {
  const accommodation =
    place.variant === "accommodation" ? place.accommodation : undefined;
  const isAccommodation = Boolean(accommodation);

  return (
    <div className={`${styles.root} place-detail-page`}>
      <div className="place-detail-shell">
        <Link
          className="touch-target mb-5 inline-flex items-center gap-2 px-1 text-sm font-medium text-[#0f766e] transition hover:text-[#18364d] sm:mb-7"
          href={returnLink.href}
          aria-label={returnLink.ariaLabel}
        >
          <ArrowLeft aria-hidden="true" size={17} />
          {returnLink.label}
        </Link>

        <div className="place-detail-layout">
        <div className="place-detail-main">
          <PlaceHero
            place={place}
            primaryCallLabel="Zadzwoń"
            showStatus={!isAccommodation}
          />

          {accommodation ? (
            <AccommodationAvailability
              availability={accommodation.availability}
              admissionsToday={accommodation.admissionsToday}
              capacityGroups={accommodation.capacityGroups}
              importantNote={accommodation.importantNote}
              phone={place.contact.phone}
            />
          ) : null}

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
    </div>
  );
}
