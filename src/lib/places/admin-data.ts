import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  accessibilityOptions,
  requirementOptions,
  weekdayOptions,
} from "@/lib/places/constants";
import type {
  AdminAccommodation,
  AdminOpeningDay,
  PlaceAdminPayload,
} from "@/types/place-admin";

export const adminPlaceInclude = {
  organization: true,
  primaryCategory: true,
  categories: {
    include: { category: true },
    orderBy: { sortOrder: "asc" as const },
  },
  openingHours: {
    orderBy: [
      { kind: "asc" as const },
      { weekday: "asc" as const },
      { sortOrder: "asc" as const },
    ],
  },
  requirements: { orderBy: { sortOrder: "asc" as const } },
  accessibility: { orderBy: { sortOrder: "asc" as const } },
  accommodation: {
    include: {
      capacityGroups: { orderBy: { sortOrder: "asc" as const } },
      availabilityHistory: {
        orderBy: { reportedAt: "desc" as const },
        take: 20,
        include: { adminUser: { select: { displayName: true } } },
      },
    },
  },
  lastEditedBy: { select: { displayName: true } },
  verifiedBy: { select: { displayName: true } },
} satisfies Prisma.PlaceInclude;

export async function getAdminPlace(id: string) {
  return prisma.place.findUnique({ where: { id }, include: adminPlaceInclude });
}

export async function getAdminPlaceHistory(placeId: string, capacityGroupIds: string[]) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "PLACE", entityId: placeId },
        ...(capacityGroupIds.length
          ? [{ entityType: "ACCOMMODATION_CAPACITY_GROUP" as const, entityId: { in: capacityGroupIds } }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { adminUser: { select: { displayName: true } } },
  });
}

export async function getAdminPlaceFormOptions() {
  const [categories, organizations] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true },
    }),
    prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { categories, organizations };
}

function defaultOpeningDays(): AdminOpeningDay[] {
  return weekdayOptions.map(({ value }) => ({
    weekday: value,
    status: "UNKNOWN",
    periods: [],
    note: "Brak potwierdzonych godzin",
  }));
}

function openingDays(
  records: Array<{
    kind: string;
    weekday: AdminOpeningDay["weekday"];
    status: AdminOpeningDay["status"];
    opensAt: string | null;
    closesAt: string | null;
    note: string | null;
  }>,
  kind: "OPERATION" | "ADMISSION",
) {
  return defaultOpeningDays().map((day) => {
    const rows = records.filter((record) => record.kind === kind && record.weekday === day.weekday);
    if (!rows.length) return day;
    const first = rows[0];
    return {
      weekday: day.weekday,
      status: first.status,
      periods:
        first.status === "OPEN"
          ? rows.map((row) => ({ opensAt: row.opensAt ?? "", closesAt: row.closesAt ?? "" }))
          : [],
      note: first.note ?? "",
    };
  });
}

export function emptyPlaceAdminPayload(primaryCategorySlug = "jedzenie"): PlaceAdminPayload {
  return {
    name: "",
    slug: "",
    organizationName: "",
    primaryCategorySlug,
    categorySlugs: [primaryCategorySlug],
    typeLabel: "Punkt pomocy",
    description: "",
    street: "",
    buildingNumber: "",
    addressLine: "",
    postalCode: "",
    city: "Łódź",
    district: "",
    latitude: null,
    longitude: null,
    phone: "",
    email: "",
    website: "",
    socialMedia: "",
    publicationStatus: "DRAFT",
    operationalStatus: "UNKNOWN",
    todayHoursLabel: "",
    audience: [],
    services: [],
    openingHours: {
      operation: defaultOpeningDays(),
      admission: defaultOpeningDays(),
    },
    requirements: requirementOptions.map((option) => ({
      kind: option.kind,
      state: "UNKNOWN",
      label: option.label,
      note: "",
    })),
    accessibility: accessibilityOptions.map((option) => ({
      feature: option.feature,
      state: "UNKNOWN",
      label: option.label,
      note: "",
    })),
    isAccommodation: false,
    markVerified: false,
    internalNote: "",
  };
}

function accommodationPayload(
  accommodation: NonNullable<Awaited<ReturnType<typeof getAdminPlace>>>["accommodation"],
): AdminAccommodation | undefined {
  if (!accommodation) return undefined;
  return {
    type: accommodation.type,
    audienceLabel: accommodation.audienceLabel ?? "",
    targetGroups: accommodation.targetGroups,
    acceptedProfiles: accommodation.acceptedProfiles,
    admissionHoursDescription: accommodation.admissionHoursDescription ?? "",
    acceptsToday: accommodation.acceptsToday,
    lodzRegistrationRequired: accommodation.lodzRegistrationRequired,
    referralRequired: accommodation.referralRequired,
    documentRequired: accommodation.documentRequired,
    sobrietyPolicy: accommodation.sobrietyPolicy,
    sobrietyNote: accommodation.sobrietyNote ?? "",
    petPolicy: accommodation.petPolicy,
    petNote: accommodation.petNote ?? "",
    wheelchairAccessibility: accommodation.wheelchairAccessibility,
    careServices: accommodation.careServices,
    partialDependencySupport: accommodation.partialDependencySupport,
    mealsInfo: accommodation.mealsInfo ?? "",
    hygieneInfo: accommodation.hygieneInfo ?? "",
    luggageInfo: accommodation.luggageInfo ?? "",
    returnTimeInfo: accommodation.returnTimeInfo ?? "",
    maxStayInfo: accommodation.maxStayInfo ?? "",
    feeInfo: accommodation.feeInfo ?? "",
    availabilityState: accommodation.availabilityState,
    availabilityLabel: accommodation.availabilityLabel ?? "",
    availabilityNote: accommodation.availabilityNote ?? "",
    importantNote: accommodation.importantNote ?? "",
    capacityGroups: accommodation.capacityGroups.map((group) => ({
      id: group.id,
      label: group.label,
      totalBeds: group.totalBeds,
      availableBeds: group.availableBeds,
      active: group.active,
    })),
  };
}

export function toPlaceAdminPayload(
  place: NonNullable<Awaited<ReturnType<typeof getAdminPlace>>>,
): PlaceAdminPayload {
  const existingRequirementKinds = new Set(place.requirements.map((item) => item.kind));
  const existingAccessibility = new Set(place.accessibility.map((item) => item.feature));
  return {
    id: place.id,
    name: place.name,
    slug: place.slug,
    organizationName: place.organization?.name ?? "",
    primaryCategorySlug: place.primaryCategory.slug,
    categorySlugs: place.categories.map((item) => item.category.slug),
    typeLabel: place.typeLabel ?? "",
    description: place.description ?? "",
    street: place.street ?? "",
    buildingNumber: place.buildingNumber ?? "",
    addressLine: place.addressLine,
    postalCode: place.postalCode ?? "",
    city: place.city,
    district: place.district ?? "",
    latitude: place.latitude === null ? null : Number(place.latitude),
    longitude: place.longitude === null ? null : Number(place.longitude),
    phone: place.phone ?? "",
    email: place.email ?? "",
    website: place.website ?? "",
    socialMedia: place.socialMedia ?? "",
    publicationStatus: place.publicationStatus,
    operationalStatus: place.operationalStatus,
    todayHoursLabel: place.todayHoursLabel ?? "",
    audience: place.audience,
    services: place.services,
    openingHours: {
      operation: openingDays(place.openingHours, "OPERATION"),
      admission: openingDays(place.openingHours, "ADMISSION"),
    },
    requirements: [
      ...place.requirements.map((item) => ({
        kind: item.kind,
        state: item.state,
        label: item.label,
        note: item.note ?? "",
      })),
      ...requirementOptions
        .filter((option) => !existingRequirementKinds.has(option.kind))
        .map((option) => ({ kind: option.kind, state: "UNKNOWN" as const, label: option.label, note: "" })),
    ],
    accessibility: [
      ...place.accessibility.map((item) => ({
        feature: item.feature,
        state: item.state,
        label: item.label,
        note: item.note ?? "",
      })),
      ...accessibilityOptions
        .filter((option) => !existingAccessibility.has(option.feature))
        .map((option) => ({ feature: option.feature, state: "UNKNOWN" as const, label: option.label, note: "" })),
    ],
    isAccommodation: Boolean(place.accommodation),
    accommodation: accommodationPayload(place.accommodation),
    markVerified: false,
    verificationSource: place.verificationSource ?? undefined,
    internalNote: place.internalNote ?? "",
  };
}
