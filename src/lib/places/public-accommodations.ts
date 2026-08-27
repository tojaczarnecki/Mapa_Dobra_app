import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { Accommodation, AccommodationAvailabilityState, AccommodationProfile } from "@/data/demo-accommodations";
import {
  normalizeInformationState,
  normalizePetPolicy,
  normalizeSobrietyPolicy,
} from "@/lib/accommodations/types";
import { resolveAvailabilityState, staleAvailabilityNote } from "@/lib/accommodations/freshness";
import { evaluateCurrentOpening } from "@/lib/places/current-opening";
import { publicRecordKindsForEnvironment } from "@/lib/places/public-visibility";
import { prisma } from "@/lib/prisma";

const accommodationSelect = {
  id: true,
  legacyId: true,
  slug: true,
  name: true,
  typeLabel: true,
  phone: true,
  latitude: true,
  longitude: true,
  distanceLabel: true,
  openingHours: {
    select: { kind: true, weekday: true, status: true, opensAt: true, closesAt: true, note: true },
    orderBy: [{ kind: "asc" as const }, { weekday: "asc" as const }, { sortOrder: "asc" as const }],
  },
  accommodation: {
    select: {
      audienceLabel: true,
      targetGroups: true,
      acceptedProfiles: true,
      acceptsToday: true,
      lodzRegistrationRequired: true,
      referralRequired: true,
      documentRequired: true,
      sobrietyPolicy: true,
      petPolicy: true,
      petNote: true,
      wheelchairAccessibility: true,
      careServices: true,
      partialDependencySupport: true,
      availabilityState: true,
      availabilityConfirmedAt: true,
      availabilityLabel: true,
      availabilityNote: true,
      capacityGroups: {
        where: { active: true },
        select: { availableBeds: true, totalBeds: true, label: true },
        orderBy: { sortOrder: "asc" as const },
      },
    },
  },
} satisfies Prisma.PlaceSelect;

type AccommodationRow = Prisma.PlaceGetPayload<{ select: typeof accommodationSelect }>;

function relativeAge(value: Date | null) {
  if (!value) return "Brak aktualnych danych";
  const minutes = Math.max(0, Math.round((Date.now() - value.getTime()) / 60_000));
  if (minutes < 60) return `Potwierdzone ${Math.max(1, minutes)} min temu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Dane sprzed ${hours} godz. temu`;
  const days = Math.round(hours / 24);
  return `Dane sprzed ${days} ${days === 1 ? "dzień" : "dni"} temu`;
}

function distanceNumber(label: string | null) {
  if (!label) return 99;
  const number = Number(label.replace(/[^0-9,.]/gu, "").replace(",", "."));
  if (!Number.isFinite(number)) return 99;
  return label.includes(" m") && !label.includes("km") ? number / 1000 : number;
}

function accommodationState(
  value: "AVAILABLE" | "FEW" | "FULL" | "UNKNOWN" | "STALE" | "SUSPENDED",
): AccommodationAvailabilityState {
  return ({
    AVAILABLE: "fresh",
    FEW: "few",
    FULL: "none",
    UNKNOWN: "unknown",
    STALE: "stale",
    SUSPENDED: "suspended",
  } as const)[value];
}

function toAccommodation(place: AccommodationRow): Accommodation | null {
  const accommodation = place.accommodation;
  if (!accommodation) return null;

  const profiles = accommodation.acceptedProfiles.filter(
    (item): item is AccommodationProfile =>
      ["woman", "man", "womanWithChildren", "family", "disability", "other"].includes(item),
  );
  const available = accommodation.capacityGroups.reduce(
    (sum, group) => sum + (group.availableBeds ?? 0),
    0,
  );
  const reportedFreePlaces = accommodation.capacityGroups.some((group) => group.availableBeds !== null)
    ? available
    : undefined;
  const effectiveAvailability = resolveAvailabilityState(
    accommodation.availabilityState,
    accommodation.availabilityConfirmedAt,
  );
  const publicState = accommodationState(effectiveAvailability);
  const availabilityLabel = publicState === "stale"
    ? "Dane o wolnych miejscach są nieaktualne"
    : accommodation.availabilityLabel ?? ({
        fresh: "Są wolne miejsca",
        few: "Niewiele miejsc",
        none: "Brak miejsc",
        unknown: "Brak aktualnych danych",
        stale: "Dane o wolnych miejscach są nieaktualne",
        suspended: "Przyjęcia czasowo wstrzymane",
      } as const)[publicState];
  const availabilityNote = publicState === "stale"
    ? staleAvailabilityNote(accommodation.availabilityState, reportedFreePlaces)
    : accommodation.availabilityNote ?? undefined;

  return {
    id: place.legacyId ?? place.id,
    categorySlug: "nocleg",
    slug: place.slug,
    name: place.name,
    typeLabel: place.typeLabel ?? "Miejsce noclegowe",
    audienceLabel: accommodation.audienceLabel ?? accommodation.targetGroups.join(", "),
    acceptedProfiles: profiles.length ? profiles : ["other"],
    availability: {
      state: publicState,
      freePlaces: effectiveAvailability === "STALE" ? undefined : reportedFreePlaces,
      label: availabilityLabel,
      confirmed: relativeAge(accommodation.availabilityConfirmedAt),
      note: availabilityNote,
    },
    acceptsToday: normalizeInformationState(accommodation.acceptsToday),
    admissionsToday: evaluateCurrentOpening(place.openingHours, "ADMISSION").label,
    lodzRegistrationRequired: normalizeInformationState(accommodation.lodzRegistrationRequired),
    referralRequired: normalizeInformationState(accommodation.referralRequired),
    documentRequired: normalizeInformationState(accommodation.documentRequired),
    sobrietyPolicy: normalizeSobrietyPolicy(accommodation.sobrietyPolicy),
    sobrietyRule: ({
      SOBRIETY_REQUIRED: "Wymagana trzeźwość",
      ZERO_TOLERANCE: "Wymagane 0,0",
      INDIVIDUAL_ASSESSMENT: "Przyjęcie po indywidualnej ocenie",
      SEPARATE_PROCEDURE: "Osobna procedura dla osób po spożyciu",
      UNKNOWN: "Brak potwierdzonych zasad",
    } as const)[accommodation.sobrietyPolicy],
    petPolicy: normalizePetPolicy(accommodation.petPolicy),
    petPolicyNote: accommodation.petNote ?? undefined,
    accessibility: normalizeInformationState(accommodation.wheelchairAccessibility),
    careServices: normalizeInformationState(accommodation.careServices),
    partialDependencySupport: normalizeInformationState(accommodation.partialDependencySupport),
    distanceKm: distanceNumber(place.distanceLabel),
    distanceLabel: place.distanceLabel ?? "Odległość nieznana",
    phone: place.phone ?? undefined,
    latitude: place.latitude === null ? undefined : Number(place.latitude),
    longitude: place.longitude === null ? undefined : Number(place.longitude),
  };
}

export async function getPublicAccommodations() {
  const places = await prisma.place.findMany({
    where: {
      citySlug: "lodz",
      recordKind: { in: [...publicRecordKindsForEnvironment()] },
      publicationStatus: { in: ["PUBLISHED", "TEMPORARILY_CLOSED", "PERMANENTLY_CLOSED"] },
      accommodation: { isNot: null },
    },
    select: accommodationSelect,
    orderBy: [{ recordKind: "asc" }, { name: "asc" }],
  });

  return places.map(toAccommodation).filter((item): item is Accommodation => Boolean(item));
}
