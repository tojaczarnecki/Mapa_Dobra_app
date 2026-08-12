import "server-only";

import {
  BedDouble,
  Droplets,
  HeartPulse,
  Scale,
  Shirt,
  ShowerHead,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import type { Accommodation, AccommodationAvailabilityState, AccommodationProfile } from "@/data/demo-accommodations";
import type { DetailListItem, OpeningDay, PlaceDetail } from "@/data/demo-place-details";
import type { MapCategory, MapPlace } from "@/data/demo-map-places";
import type { DemoPlace, PlaceStatus } from "@/data/demo-places";
import {
  normalizeInformationState,
  normalizePetPolicy,
  normalizeSobrietyPolicy,
} from "@/lib/accommodations/types";
import { PUBLIC_RECORD_KINDS } from "@/lib/places/public-visibility";
import { prisma } from "@/lib/prisma";

const publicPlaceInclude = {
  organization: true,
  primaryCategory: true,
  categories: { include: { category: true }, orderBy: { sortOrder: "asc" as const } },
  openingHours: { orderBy: [{ kind: "asc" as const }, { weekday: "asc" as const }, { sortOrder: "asc" as const }] },
  requirements: { orderBy: { sortOrder: "asc" as const } },
  accessibility: { orderBy: { sortOrder: "asc" as const } },
  accommodation: {
    include: {
      capacityGroups: { orderBy: { sortOrder: "asc" as const } },
      availabilityHistory: { orderBy: { reportedAt: "desc" as const }, take: 1 },
    },
  },
} satisfies Prisma.PlaceInclude;

type PublicPlaceRecord = Prisma.PlaceGetPayload<{ include: typeof publicPlaceInclude }>;

const categoryMap: Record<string, MapCategory | undefined> = {
  jedzenie: "food",
  nocleg: "accommodation",
  higiena: "hygiene",
  prysznic: "hygiene",
  "pomoc-medyczna": "medical",
  "pomoc-prawna": "legal",
};

const iconMap: Record<string, LucideIcon> = {
  jedzenie: Utensils,
  nocleg: BedDouble,
  higiena: Droplets,
  prysznic: ShowerHead,
  odziez: Shirt,
  "pomoc-medyczna": HeartPulse,
  "pomoc-prawna": Scale,
};

const weekdayRows = [
  ["MONDAY", "Poniedziałek"],
  ["TUESDAY", "Wtorek"],
  ["WEDNESDAY", "Środa"],
  ["THURSDAY", "Czwartek"],
  ["FRIDAY", "Piątek"],
  ["SATURDAY", "Sobota"],
  ["SUNDAY", "Niedziela"],
] as const;

const todayWeekday = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][new Date().getDay()];

function visibleWhere(): Prisma.PlaceWhereInput {
  return {
    citySlug: "lodz",
    recordKind: { in: [...PUBLIC_RECORD_KINDS] },
    publicationStatus: { in: ["PUBLISHED", "TEMPORARILY_CLOSED", "PERMANENTLY_CLOSED"] },
  };
}

async function publicPlaces() {
  return prisma.place.findMany({
    where: visibleWhere(),
    include: publicPlaceInclude,
    orderBy: [{ recordKind: "asc" }, { name: "asc" }],
  });
}

function relativeAge(value: Date | null, verified = false) {
  if (!value) return verified ? "Dane wymagają potwierdzenia" : "Brak aktualnych danych";
  const minutes = Math.max(0, Math.round((Date.now() - value.getTime()) / 60_000));
  if (minutes < 60) return `${verified ? "Zweryfikowano" : "Potwierdzone"} ${Math.max(1, minutes)} min temu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${verified ? "Zweryfikowano" : "Dane sprzed"} ${hours} godz. temu`;
  const days = Math.round(hours / 24);
  return `${verified ? "Zweryfikowano" : "Dane sprzed"} ${days} ${days === 1 ? "dzień" : "dni"} temu`;
}

function placeStatus(place: PublicPlaceRecord): PlaceStatus {
  if (place.publicationStatus === "TEMPORARILY_CLOSED" || place.publicationStatus === "PERMANENTLY_CLOSED" || place.operationalStatus === "CLOSED") return "closed";
  if (place.verificationStatus === "NEEDS_CONFIRMATION") return "needsConfirmation";
  if (place.operationalStatus === "OPEN") return "open";
  if (place.operationalStatus === "OPEN_TODAY") return "openToday";
  return "unknownHours";
}

function distanceNumber(label: string | null) {
  if (!label) return 99;
  const number = Number(label.replace(/[^0-9,.]/gu, "").replace(",", "."));
  if (!Number.isFinite(number)) return 99;
  return label.includes(" m") && !label.includes("km") ? number / 1000 : number;
}

function conditionLabel(item: PublicPlaceRecord["requirements"][number]) {
  return item.label;
}

function requirementTone(item: PublicPlaceRecord["requirements"][number]): DetailListItem["status"] {
  if (item.state === "UNKNOWN") return "unknown";
  const positiveLabel = /bez |niewymagan|bezpłat/iu.test(item.label);
  if (positiveLabel) return "positive";
  return item.state === "YES" ? "warning" : "positive";
}

function accessibilityTone(state: "YES" | "NO" | "UNKNOWN"): DetailListItem["status"] {
  return state === "YES" ? "positive" : state === "NO" ? "warning" : "unknown";
}

function formatPeriods(rows: PublicPlaceRecord["openingHours"]) {
  return rows.map((row) => {
    if (row.opensAt && row.closesAt) return `${row.opensAt}-${row.closesAt}`;
    if (row.opensAt) return `od ${row.opensAt}`;
    if (row.closesAt) return `do ${row.closesAt}`;
    return row.note ?? "Brak potwierdzonych godzin";
  });
}

function openingDays(place: PublicPlaceRecord): OpeningDay[] {
  const kind = place.accommodation ? "ADMISSION" : "OPERATION";
  return weekdayRows.map(([weekday, day]) => {
    const rows = place.openingHours.filter((row) => row.kind === kind && row.weekday === weekday);
    if (!rows.length) return { day, status: "unknown" as const, note: "Brak potwierdzonych godzin", isToday: weekday === todayWeekday };
    const first = rows[0];
    if (first.status === "CLOSED") return { day, status: "closed" as const, isToday: weekday === todayWeekday };
    if (first.status === "UNKNOWN") return { day, status: "unknown" as const, note: first.note ?? "Brak potwierdzonych godzin", isToday: weekday === todayWeekday };
    return { day, status: "open" as const, periods: formatPeriods(rows), isToday: weekday === todayWeekday };
  });
}

function statusDetails(place: PublicPlaceRecord): PlaceDetail["status"] {
  const status = placeStatus(place);
  const labels = { open: "OTWARTE", closed: "ZAMKNIĘTE", openToday: "OTWARTE DZISIAJ", unknownHours: "BRAK POTWIERDZONYCH GODZIN", needsConfirmation: "DANE WYMAGAJĄ POTWIERDZENIA" } as const;
  const tones = { open: "open", closed: "closed", openToday: "openToday", unknownHours: "unknown", needsConfirmation: "unknown" } as const;
  return { label: labels[status], tone: tones[status], todayHours: place.todayHoursLabel ?? "Brak potwierdzonych godzin" };
}

function triRequirement(label: string, value: "YES" | "NO" | "UNKNOWN") : DetailListItem {
  if (value === "UNKNOWN") return { label: `${label}: brak potwierdzonych danych`, status: "unknown" };
  return { label: value === "YES" ? `Wymagany ${label}` : `${label} niewymagany`, status: value === "YES" ? "warning" : "positive" };
}

function accommodationAvailability(place: PublicPlaceRecord): NonNullable<PlaceDetail["accommodation"]>["availability"] {
  const accommodation = place.accommodation!;
  const state = ({ AVAILABLE: "available", FEW: "few", FULL: "full", UNKNOWN: "unknown", STALE: "stale", SUSPENDED: "suspended" } as const)[accommodation.availabilityState];
  return {
    state,
    label: accommodation.availabilityLabel ?? ({ available: "Są wolne miejsca", few: "Niewiele miejsc", full: "Brak miejsc", unknown: "Brak aktualnych danych", stale: "Dane mogą być nieaktualne", suspended: "Przyjęcia czasowo wstrzymane" } as const)[state],
    confirmed: relativeAge(accommodation.availabilityConfirmedAt),
    note: accommodation.availabilityNote ?? undefined,
  };
}

function toPlaceDetail(place: PublicPlaceRecord): PlaceDetail {
  const accommodation = place.accommodation;
  const detailAccommodation: PlaceDetail["accommodation"] = accommodation ? {
    availability: accommodationAvailability(place),
    admissionsToday: accommodation.admissionHoursDescription ?? place.todayHoursLabel ?? "Godziny przyjęć wymagają potwierdzenia",
    capacityGroups: accommodation.capacityGroups.map((group) => ({ label: group.label, free: group.availableBeds ?? undefined, total: group.totalBeds ?? undefined })),
    audience: accommodation.targetGroups.length ? accommodation.targetGroups : place.audience,
    admissionRequirements: [
      triRequirement("ostatni meldunek w Łodzi", accommodation.lodzRegistrationRequired),
      triRequirement("skierowanie", accommodation.referralRequired),
      triRequirement("dokument", accommodation.documentRequired),
    ],
    sobriety: {
      label: ({ SOBRIETY_REQUIRED: "Wymagana trzeźwość", ZERO_TOLERANCE: "Wymagane 0,0", INDIVIDUAL_ASSESSMENT: "Przyjęcie po indywidualnej ocenie", SEPARATE_PROCEDURE: "Osobna procedura dla osób po spożyciu", UNKNOWN: "Brak potwierdzonych zasad trzeźwości" } as const)[accommodation.sobrietyPolicy],
      status: accommodation.sobrietyPolicy === "UNKNOWN" ? "unknown" : "warning",
      note: accommodation.sobrietyNote ?? undefined,
    },
    animals: [{
      label: ({ ACCEPTED: "Zwierzęta przyjmowane", NOT_ACCEPTED: "Zwierzęta nieprzyjmowane", DOG_ONLY: "Przyjmowany tylko pies", BY_ARRANGEMENT: "Zwierzęta po uzgodnieniu", ASSISTANCE_DOG_ONLY: "Przyjmowany pies asystujący", UNKNOWN: "Brak danych o przyjmowaniu zwierząt" } as const)[accommodation.petPolicy],
      status: accommodation.petPolicy === "UNKNOWN" ? "unknown" : accommodation.petPolicy === "NOT_ACCEPTED" ? "warning" : "positive",
      note: accommodation.petNote ?? undefined,
    }],
    accessibility: place.accessibility.map((item) => ({ label: item.label, status: accessibilityTone(item.state), note: item.note ?? undefined })),
    overnightInfo: [
      ["Wyżywienie", accommodation.mealsInfo], ["Higiena", accommodation.hygieneInfo], ["Bagaż", accommodation.luggageInfo],
      ["Godzina powrotu", accommodation.returnTimeInfo], ["Maksymalny pobyt", accommodation.maxStayInfo], ["Odpłatność", accommodation.feeInfo],
    ].filter((row): row is [string, string] => Boolean(row[1])).map(([label, value]) => ({ label, value })),
    importantNote: accommodation.importantNote ?? "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
  } : undefined;

  return {
    id: place.legacyId ?? place.id,
    citySlug: "lodz",
    categorySlug: place.primaryCategory.slug,
    slug: place.slug,
    variant: accommodation ? "accommodation" : "standard",
    name: place.name,
    typeLabel: place.typeLabel ?? place.primaryCategory.name,
    helpTypes: place.categories.map((item) => item.category.name),
    status: statusDetails(place),
    distanceLabel: `${place.distanceLabel ?? "Odległość nieznana"}${place.distanceLabel ? " od Ciebie" : ""}`,
    address: place.addressLine,
    coordinatesLabel: place.district ? `Łódź, ${place.district}` : "Łódź",
    requirements: place.requirements.map((item) => ({ label: conditionLabel(item), status: requirementTone(item), note: item.note ?? undefined })),
    audience: place.audience,
    services: place.services,
    accessibility: place.accessibility.map((item) => ({ label: item.label, status: accessibilityTone(item.state), note: item.note ?? undefined })),
    description: place.description?.split(/\n\s*\n/u).filter(Boolean) ?? [],
    contact: { phone: place.phone ?? undefined, email: place.email ?? undefined, website: place.website ?? undefined, social: place.socialMedia ?? undefined },
    openingHours: openingDays(place),
    verification: {
      label: place.verificationStatus === "VERIFIED" ? relativeAge(place.verifiedAt, true) : "Dane wymagają potwierdzenia",
      tone: place.verificationStatus === "VERIFIED" ? "verified" : "needsConfirmation",
      note: place.verificationNote ?? "Informacje w Mapie Dobra są regularnie aktualizowane.",
    },
    accommodation: detailAccommodation,
  };
}

function toDemoPlace(place: PublicPlaceRecord): DemoPlace {
  return {
    id: place.legacyId ?? place.id,
    categorySlug: place.primaryCategory.slug,
    slug: place.slug,
    name: place.name,
    helpTypes: place.categories.map((item) => item.category.name),
    status: placeStatus(place),
    todayHours: place.todayHoursLabel ?? "Brak potwierdzonych godzin",
    distance: place.distanceLabel ?? "Odległość nieznana",
    address: place.addressLine,
    conditions: place.requirements.map(conditionLabel),
    freshness: place.verificationStatus === "VERIFIED" ? relativeAge(place.verifiedAt, true) : "Dane wymagają potwierdzenia",
    freshnessWarning: place.verificationStatus !== "VERIFIED",
    phone: place.phone ?? undefined,
    primaryIcon: iconMap[place.primaryCategory.slug] ?? Droplets,
    latitude: place.latitude === null ? 51.7592 : Number(place.latitude),
    longitude: place.longitude === null ? 19.456 : Number(place.longitude),
  };
}

function accommodationState(value: "AVAILABLE" | "FEW" | "FULL" | "UNKNOWN" | "STALE" | "SUSPENDED"): AccommodationAvailabilityState {
  return ({ AVAILABLE: "fresh", FEW: "few", FULL: "none", UNKNOWN: "unknown", STALE: "stale", SUSPENDED: "suspended" } as const)[value];
}

function toAccommodation(place: PublicPlaceRecord): Accommodation | null {
  const accommodation = place.accommodation;
  if (!accommodation) return null;
  const profiles = accommodation.acceptedProfiles.filter((item): item is AccommodationProfile => ["woman", "man", "womanWithChildren", "family", "disability", "other"].includes(item));
  const available = accommodation.capacityGroups.reduce((sum, group) => sum + (group.availableBeds ?? 0), 0);
  return {
    id: place.legacyId ?? place.id,
    categorySlug: "nocleg",
    slug: place.slug,
    name: place.name,
    typeLabel: place.typeLabel ?? "Miejsce noclegowe",
    audienceLabel: accommodation.audienceLabel ?? accommodation.targetGroups.join(", "),
    acceptedProfiles: profiles.length ? profiles : ["other"],
    availability: {
      state: accommodationState(accommodation.availabilityState),
      freePlaces: accommodation.capacityGroups.some((group) => group.availableBeds !== null) ? available : undefined,
      label: accommodation.availabilityLabel ?? accommodationAvailability(place).label,
      confirmed: relativeAge(accommodation.availabilityConfirmedAt),
      note: accommodation.availabilityNote ?? undefined,
    },
    acceptsToday: normalizeInformationState(accommodation.acceptsToday),
    admissionsToday: accommodation.admissionHoursDescription ?? "Godziny przyjęć wymagają potwierdzenia",
    lodzRegistrationRequired: normalizeInformationState(accommodation.lodzRegistrationRequired),
    referralRequired: normalizeInformationState(accommodation.referralRequired),
    documentRequired: normalizeInformationState(accommodation.documentRequired),
    sobrietyPolicy: normalizeSobrietyPolicy(accommodation.sobrietyPolicy),
    sobrietyRule: ({ SOBRIETY_REQUIRED: "Wymagana trzeźwość", ZERO_TOLERANCE: "Wymagane 0,0", INDIVIDUAL_ASSESSMENT: "Przyjęcie po indywidualnej ocenie", SEPARATE_PROCEDURE: "Osobna procedura dla osób po spożyciu", UNKNOWN: "Brak potwierdzonych zasad" } as const)[accommodation.sobrietyPolicy],
    petPolicy: normalizePetPolicy(accommodation.petPolicy),
    petPolicyNote: accommodation.petNote ?? undefined,
    accessibility: normalizeInformationState(accommodation.wheelchairAccessibility),
    careServices: normalizeInformationState(accommodation.careServices),
    partialDependencySupport: normalizeInformationState(accommodation.partialDependencySupport),
    distanceKm: distanceNumber(place.distanceLabel),
    distanceLabel: place.distanceLabel ?? "Odległość nieznana",
    phone: place.phone ?? undefined,
    latitude: place.latitude === null ? 51.7592 : Number(place.latitude),
    longitude: place.longitude === null ? 19.456 : Number(place.longitude),
  };
}

function toMapPlace(place: PublicPlaceRecord): MapPlace | null {
  if (place.latitude === null || place.longitude === null) return null;
  const categories = Array.from(new Set(place.categories.map((item) => categoryMap[item.category.slug]).filter((item): item is MapCategory => Boolean(item))));
  if (!categories.length) return null;
  const openNow = place.accommodation
    ? place.accommodation.acceptsToday === "UNKNOWN"
      ? null
      : place.accommodation.acceptsToday === "YES" &&
        !["FULL", "SUSPENDED"].includes(place.accommodation.availabilityState)
    : place.operationalStatus === "UNKNOWN" || place.operationalStatus === "OPEN_TODAY"
      ? null
      : place.operationalStatus === "OPEN";
  const feeRequirement = place.requirements.find((item) => item.kind === "FEE");
  const free = !feeRequirement || feeRequirement.state === "UNKNOWN"
    ? null
    : feeRequirement.state === "NO" || /bezpłat/iu.test(feeRequirement.label);
  const base = {
    id: place.legacyId ?? place.id,
    name: place.name,
    helpTypes: place.categories.map((item) => item.category.name),
    categories,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    distanceLabel: place.distanceLabel ?? "Odległość nieznana",
    address: place.addressLine,
    phone: place.phone ?? undefined,
    detailsHref: `/lodz/${place.primaryCategory.slug}/${place.slug}`,
    openNow,
    free,
    searchTerms: [place.name, place.typeLabel ?? "", ...place.categories.map((item) => item.category.name), ...place.requirements.map((item) => item.label)],
  };
  if (!place.accommodation) return { ...base, status: { kind: "standard", status: placeStatus(place), todayHours: place.todayHoursLabel ?? "Brak potwierdzonych godzin" } };
  const availability = accommodationAvailability(place);
  return { ...base, status: { kind: "accommodation", availabilityState: availability.state, availabilityLabel: availability.label, confirmed: availability.confirmed, admissionsToday: place.accommodation.admissionHoursDescription ?? "Godziny przyjęć wymagają potwierdzenia", availabilityNote: availability.note } };
}

export async function getPublicSearchPlaces() {
  return (await publicPlaces()).filter((place) => !place.accommodation).map(toDemoPlace);
}

export async function getPublicAccommodations() {
  return (await publicPlaces()).map(toAccommodation).filter((item): item is Accommodation => Boolean(item));
}

export async function getPublicMapPlaces() {
  return (await publicPlaces()).map(toMapPlace).filter((item): item is MapPlace => Boolean(item));
}

export async function getPublicPlaceDetail(categorySlug: string, slug: string) {
  const place = await prisma.place.findFirst({ where: { ...visibleWhere(), slug, categories: { some: { category: { slug: categorySlug } } } }, include: publicPlaceInclude });
  return place ? toPlaceDetail(place) : null;
}

export async function getPublicPlaceContext(identifier: string) {
  const place = await prisma.place.findFirst({ where: { ...visibleWhere(), OR: [{ id: uuidPattern.test(identifier) ? identifier : undefined }, { legacyId: identifier }, { slug: identifier }] }, include: { primaryCategory: true } });
  return place ? { id: place.legacyId ?? place.id, slug: place.slug, name: place.name, address: place.addressLine, href: `/lodz/${place.primaryCategory.slug}/${place.slug}` } : undefined;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
