import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { demoAccommodations } from "../src/data/demo-accommodations";
import {
  demoPlaceDetails,
  type DetailListItem,
  type OpeningDay,
} from "../src/data/demo-place-details";
import { demoPlaces } from "../src/data/demo-places";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const now = new Date();

const categories = [
  ["jedzenie", "Jedzenie"],
  ["nocleg", "Nocleg"],
  ["prysznic", "Prysznic"],
  ["higiena", "Higiena"],
  ["odziez", "Odzież"],
  ["pomoc-medyczna", "Pomoc medyczna"],
  ["pomoc-psychologiczna", "Pomoc psychologiczna"],
  ["pomoc-prawna", "Pomoc prawna"],
  ["pomoc-socjalna", "Pomoc socjalna"],
] as const;

const categoryByHelpType: Record<string, string> = {
  Jedzenie: "jedzenie",
  Nocleg: "nocleg",
  Prysznic: "prysznic",
  Higiena: "higiena",
  Odzież: "odziez",
  "Pomoc medyczna": "pomoc-medyczna",
  "Pomoc psychologiczna": "pomoc-psychologiczna",
  "Pomoc prawna": "pomoc-prawna",
  "Pomoc socjalna": "pomoc-socjalna",
};

const weekdayByLabel = {
  Poniedziałek: "MONDAY",
  Wtorek: "TUESDAY",
  Środa: "WEDNESDAY",
  Czwartek: "THURSDAY",
  Piątek: "FRIDAY",
  Sobota: "SATURDAY",
  Niedziela: "SUNDAY",
} as const;

const weekdays = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function subtractTime(amount: number, unit: "minutes" | "hours" | "days") {
  const multiplier = unit === "minutes" ? 60_000 : unit === "hours" ? 3_600_000 : 86_400_000;
  return new Date(now.getTime() - amount * multiplier);
}

function dateFromLabel(label: string) {
  const normalized = label.toLocaleLowerCase("pl-PL");
  const amount = Number(normalized.match(/\d+/u)?.[0] ?? "0");
  if (normalized.includes("min")) return subtractTime(amount, "minutes");
  if (normalized.includes("godzin") || normalized.includes(" godz")) return subtractTime(amount, "hours");
  if (normalized.includes("wczoraj")) return subtractTime(1, "days");
  if (normalized.includes("dni") || normalized.includes("dzień")) return subtractTime(amount, "days");
  return now;
}

function parseAddress(addressLine: string) {
  const streetMatch = addressLine.match(/(?:ul\.\s*)?([^,]+?)(?:\s+(\d+[A-Za-z]?))?,\s*Łódź$/u);
  if (!streetMatch) return { street: addressLine.replace(/,\s*Łódź$/u, ""), buildingNumber: undefined };
  return {
    street: streetMatch[1]?.replace(/^okolice\s+ul\.\s*/u, "").replace(/^ul\.\s*/u, "").trim(),
    buildingNumber: streetMatch[2],
  };
}

function requirementKind(label: string) {
  const value = label.toLocaleLowerCase("pl-PL");
  if (value.includes("skierowa")) return "REFERRAL" as const;
  if (value.includes("dokument")) return "DOCUMENT" as const;
  if (value.includes("bezpłat") || value.includes("odpłat")) return "FEE" as const;
  if (value.includes("zameld")) return "LODZ_REGISTRATION" as const;
  if (value.includes("umów") || value.includes("zapis")) return "APPOINTMENT" as const;
  return "OTHER" as const;
}

function informationState(item: DetailListItem) {
  const value = item.label.toLocaleLowerCase("pl-PL");
  if (item.status === "unknown" || value.includes("brak danych") || value.includes("nie potwierdz")) {
    return "UNKNOWN" as const;
  }
  if (value.includes("niewymagan") || value.startsWith("bez ") || value.includes("bezpłat")) {
    return "NO" as const;
  }
  if (value.includes("wymagan") || item.status === "warning") return "YES" as const;
  return item.status === "positive" ? ("YES" as const) : ("UNKNOWN" as const);
}

function accessibilityFeature(label: string) {
  const value = label.toLocaleLowerCase("pl-PL");
  if (value.includes("bez stopni")) return "STEP_FREE_ENTRANCE" as const;
  if (value.includes("podjazd")) return "RAMP" as const;
  if (value.includes("wind")) return "ELEVATOR" as const;
  if (value.includes("toalet")) return "ACCESSIBLE_TOILET" as const;
  if (value.includes("prysznic")) return "ACCESSIBLE_SHOWER" as const;
  if (value.includes("wózk")) return "WHEELCHAIR_PLACE" as const;
  if (value.includes("asystując")) return "ASSISTANCE_DOG" as const;
  if (value.includes("opiekuń")) return "CARE_SERVICES" as const;
  if (value.includes("asystent")) return "STAY_WITH_ASSISTANT" as const;
  return "OTHER" as const;
}

type OpeningRow = {
  kind: "ADMISSION" | "OPERATION";
  weekday: (typeof weekdays)[number];
  status: "OPEN" | "CLOSED" | "UNKNOWN";
  opensAt?: string;
  closesAt?: string;
  note?: string;
  sortOrder: number;
};

function openingRows(days: OpeningDay[], accommodation: boolean) {
  return days.reduce<OpeningRow[]>((rows, day) => {
    const weekday = day.day === "Dzisiaj"
      ? weekdays[now.getDay()]
      : weekdayByLabel[day.day as keyof typeof weekdayByLabel];
    if (!weekday) return rows;
    const kind = accommodation ? ("ADMISSION" as const) : ("OPERATION" as const);
    if (day.status !== "open" || !day.periods?.length) {
      rows.push({
        kind,
        weekday,
        status: day.status === "closed" ? ("CLOSED" as const) : ("UNKNOWN" as const),
        note: day.note,
        sortOrder: 0,
      });
      return rows;
    }
    day.periods.forEach((period, sortOrder) => {
      const normalized = period.trim();
      const [rangeStart, rangeEnd] = normalized
        .split(/[-–—]/u)
        .map((value) => value.trim());
      const opensAt = normalized.startsWith("do ")
        ? undefined
        : rangeStart.replace(/^od\s+/u, "");
      const closesAt = normalized.startsWith("do ")
        ? rangeStart.replace(/^do\s+/u, "")
        : rangeEnd;
      rows.push({ kind, weekday, status: "OPEN", opensAt, closesAt, sortOrder });
    });
    return rows;
  }, []);
}

function accommodationType(label: string) {
  const value = label.toLocaleLowerCase("pl-PL");
  if (value.includes("usługami opiekuńczymi")) return "CARE_SHELTER" as const;
  if (value.includes("kobiet z dziećmi")) return "WOMEN_WITH_CHILDREN_HOME" as const;
  if (value.includes("noclegown")) return "NIGHT_SHELTER" as const;
  if (value.includes("ogrzewal")) return "WARMING_CENTER" as const;
  if (value.includes("interwencyj")) return "INTERVENTION_HOSTEL" as const;
  if (value.includes("hostel")) return "HOSTEL" as const;
  if (value.includes("schronisko")) return "SHELTER" as const;
  return "OTHER" as const;
}

function availabilityState(value: string) {
  return ({
    fresh: "AVAILABLE",
    few: "FEW",
    none: "FULL",
    unknown: "UNKNOWN",
    stale: "STALE",
    suspended: "SUSPENDED",
  } as const)[value as "fresh"] ?? "UNKNOWN";
}

function overnightValue(items: Array<{ label: string; value: string }>, label: string) {
  return items.find((item) => item.label.toLocaleLowerCase("pl-PL").includes(label))?.value;
}

async function main() {
  const categoryIds = new Map<string, string>();
  for (const [index, [slug, name]] of categories.entries()) {
    const category = await prisma.category.upsert({
      where: { slug },
      create: { slug, name, sortOrder: index },
      update: { name, sortOrder: index, active: true },
      select: { id: true },
    });
    categoryIds.set(slug, category.id);
  }

  const organization = await prisma.organization.upsert({
    where: { slug: "mapa-dobra-demo" },
    create: {
      slug: "mapa-dobra-demo",
      name: "Dane demonstracyjne Mapy Dobra",
      description: "Rekord techniczny grupujący miejsca przeniesione z lokalnych demo-data.",
    },
    update: {},
    select: { id: true },
  });

  const searchById = new Map(demoPlaces.map((place) => [place.id, place]));
  const accommodationById = new Map(demoAccommodations.map((place) => [place.id, place]));
  let created = 0;
  let skipped = 0;

  for (const detail of demoPlaceDetails) {
    const existing = await prisma.place.findUnique({
      where: { slug: detail.slug },
      select: { id: true, recordKind: true },
    });
    if (existing) {
      if (existing.recordKind !== "DEMO") throw new Error(`Refusing to overwrite non-demo place: ${detail.slug}`);
      skipped += 1;
      continue;
    }

    const searchPlace = searchById.get(detail.id);
    const accommodation = accommodationById.get(detail.id);
    const primaryCategoryId = categoryIds.get(detail.categorySlug);
    if (!primaryCategoryId) throw new Error(`Missing category: ${detail.categorySlug}`);
    const categorySlugs = Array.from(new Set([
      detail.categorySlug,
      ...detail.helpTypes.map((type) => categoryByHelpType[type]).filter(Boolean),
    ]));
    const address = parseAddress(detail.address);
    const isAccommodation = detail.variant === "accommodation" && Boolean(accommodation && detail.accommodation);
    const availabilityConfirmedAt = accommodation
      ? dateFromLabel(accommodation.availability.confirmed)
      : undefined;

    const place = await prisma.place.create({
      data: {
        legacyId: detail.id,
        citySlug: detail.citySlug,
        slug: detail.slug,
        name: detail.name,
        organizationId: organization.id,
        primaryCategoryId,
        typeLabel: detail.typeLabel,
        description: detail.description.join("\n\n"),
        street: address.street,
        buildingNumber: address.buildingNumber,
        addressLine: detail.address,
        city: "Łódź",
        latitude: searchPlace?.latitude ?? accommodation?.latitude,
        longitude: searchPlace?.longitude ?? accommodation?.longitude,
        phone: detail.contact.phone,
        email: detail.contact.email,
        website: detail.contact.website,
        socialMedia: detail.contact.social,
        publicationStatus: "PUBLISHED",
        verificationStatus:
          detail.verification.tone === "verified" ? "VERIFIED" : "NEEDS_CONFIRMATION",
        operationalStatus:
          detail.status.tone === "open"
            ? "OPEN"
            : detail.status.tone === "closed"
              ? "CLOSED"
              : detail.status.tone === "openToday"
                ? "OPEN_TODAY"
                : "UNKNOWN",
        todayHoursLabel: detail.status.todayHours,
        verificationNote: detail.verification.note,
        verifiedAt: dateFromLabel(searchPlace?.freshness ?? detail.verification.label),
        audience: detail.audience,
        services: detail.services,
        distanceLabel: searchPlace?.distance ?? accommodation?.distanceLabel ?? detail.distanceLabel.replace(/\s+od Ciebie$/u, ""),
        recordKind: "DEMO",
        isDemo: true,
        categories: {
          create: categorySlugs.map((slug, sortOrder) => ({
            sortOrder,
            category: { connect: { id: categoryIds.get(slug)! } },
          })),
        },
        openingHours: { create: openingRows(detail.openingHours, isAccommodation) },
        requirements: {
          create: detail.requirements.map((item, sortOrder) => ({
            kind: requirementKind(item.label),
            state: informationState(item),
            label: item.label,
            note: item.note,
            sortOrder,
          })),
        },
        accessibility: {
          create: detail.accessibility.map((item, sortOrder) => ({
            feature: accessibilityFeature(item.label),
            state:
              item.status === "positive"
                ? "YES"
                : item.status === "warning"
                  ? "NO"
                  : "UNKNOWN",
            label: item.label,
            note: item.note,
            sortOrder,
          })),
        },
        ...(isAccommodation && accommodation && detail.accommodation
          ? {
              accommodation: {
                create: {
                  type: accommodationType(detail.typeLabel),
                  audienceLabel: accommodation.audienceLabel,
                  targetGroups: detail.accommodation.audience,
                  acceptedProfiles: accommodation.acceptedProfiles,
                  admissionHoursDescription: accommodation.admissionsToday,
                  acceptsToday: accommodation.acceptsToday,
                  lodzRegistrationRequired: accommodation.lodzRegistrationRequired,
                  referralRequired: accommodation.referralRequired,
                  documentRequired: accommodation.documentRequired,
                  sobrietyPolicy: accommodation.sobrietyPolicy,
                  sobrietyNote: detail.accommodation.sobriety.note,
                  petPolicy: accommodation.petPolicy,
                  petNote: detail.accommodation.animals.map((item) => item.label).join(", "),
                  wheelchairAccessibility: accommodation.accessibility,
                  careServices: accommodation.careServices,
                  partialDependencySupport: accommodation.partialDependencySupport,
                  mealsInfo: overnightValue(detail.accommodation.overnightInfo, "wyżywienie"),
                  hygieneInfo: overnightValue(detail.accommodation.overnightInfo, "higien"),
                  luggageInfo: overnightValue(detail.accommodation.overnightInfo, "bagaż"),
                  returnTimeInfo: overnightValue(detail.accommodation.overnightInfo, "powrot"),
                  maxStayInfo: overnightValue(detail.accommodation.overnightInfo, "maksymalny"),
                  feeInfo: overnightValue(detail.accommodation.overnightInfo, "odpłat"),
                  availabilityState: availabilityState(accommodation.availability.state),
                  availabilityLabel: accommodation.availability.label,
                  availabilityConfirmedAt,
                  availabilityNote: accommodation.availability.note,
                  importantNote: detail.accommodation.importantNote,
                  capacityGroups: {
                    create: detail.accommodation.capacityGroups.map((group, sortOrder) => ({
                      label: group.label,
                      totalBeds: group.total,
                      availableBeds: group.free,
                      availabilityUpdatedAt: availabilityConfirmedAt,
                      sortOrder,
                    })),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        accommodation: { include: { capacityGroups: true } },
      },
    });

    if (place.accommodation) {
      const groups = place.accommodation.capacityGroups;
      if (groups.length === 0) {
        await prisma.accommodationAvailabilityHistory.create({
          data: {
            accommodationDetailsId: place.accommodation.id,
            availabilityState: place.accommodation.availabilityState,
            reportedAt: availabilityConfirmedAt ?? now,
            origin: "DEMO_MIGRATION",
            note: place.accommodation.availabilityNote,
          },
        });
      } else {
        await prisma.accommodationAvailabilityHistory.createMany({
          data: groups.map((group) => ({
            accommodationDetailsId: place.accommodation!.id,
            capacityGroupId: group.id,
            availabilityState: place.accommodation!.availabilityState,
            availableBeds: group.availableBeds,
            totalBeds: group.totalBeds,
            reportedAt: group.availabilityUpdatedAt ?? now,
            origin: "DEMO_MIGRATION" as const,
            note: place.accommodation!.availabilityNote,
          })),
        });
      }
    }

    created += 1;
  }

  const migratedPlaces = await prisma.place.findMany({
    where: { recordKind: "DEMO" },
    select: {
      id: true,
      legacyId: true,
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      _count: {
        select: {
          openingHours: true,
          categories: true,
          requirements: true,
          accessibility: true,
        },
      },
      accommodation: {
        select: { _count: { select: { capacityGroups: true } } },
      },
    },
    orderBy: { slug: "asc" },
  });

  for (const place of migratedPlaces) {
    await prisma.placeUpdateSubmission.updateMany({
      where: {
        targetPlaceId: null,
        OR: [{ placeSlug: place.slug }, { placeId: place.legacyId ?? place.slug }],
      },
      data: { targetPlaceId: place.id },
    });
  }

  const sourceBySlug = new Map(demoPlaceDetails.map((place) => [place.slug, place]));
  const mismatches = migratedPlaces.filter((place) => {
    const source = sourceBySlug.get(place.slug);
    if (!source) return true;
    const searchPlace = searchById.get(source.id);
    const accommodation = accommodationById.get(source.id);
    const expectedLatitude = searchPlace?.latitude ?? accommodation?.latitude;
    const expectedLongitude = searchPlace?.longitude ?? accommodation?.longitude;
    const expectedCategories = new Set([
      source.categorySlug,
      ...source.helpTypes.map((type) => categoryByHelpType[type]).filter(Boolean),
    ]).size;
    const expectedCapacityGroups = source.accommodation?.capacityGroups.length ?? 0;
    return (
      source.name !== place.name ||
      Number(place.latitude) !== expectedLatitude ||
      Number(place.longitude) !== expectedLongitude ||
      place._count.categories !== expectedCategories ||
      place._count.openingHours !== openingRows(source.openingHours, source.variant === "accommodation").length ||
      place._count.requirements !== source.requirements.length ||
      place._count.accessibility !== source.accessibility.length ||
      (place.accommodation?._count.capacityGroups ?? 0) !== expectedCapacityGroups
    );
  });

  if (migratedPlaces.length !== demoPlaceDetails.length || mismatches.length > 0) {
    throw new Error(
      `Demo migration comparison failed: source=${demoPlaceDetails.length}, database=${migratedPlaces.length}, mismatches=${mismatches.length}`,
    );
  }

  const capacityGroups = await prisma.accommodationCapacityGroup.count();
  const historyEntries = await prisma.accommodationAvailabilityHistory.count();
  console.info(JSON.stringify({
    sourcePlaces: demoPlaceDetails.length,
    databasePlaces: migratedPlaces.length,
    created,
    skipped,
    capacityGroups,
    historyEntries,
    comparison: "OK",
  }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
