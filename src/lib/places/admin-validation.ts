import type {
  AccessibilityFeatureValue,
  AccommodationAvailabilityValue,
  AccommodationTypeValue,
  AdminAccessibility,
  AdminAccommodation,
  AdminRequirement,
  PetPolicyValue,
  PlaceAdminPayload,
  PlacePublicationStatusValue,
  PlaceOperationalStatusValue,
  RequirementKindValue,
  SobrietyPolicyValue,
  TriState,
  VerificationSourceValue,
} from "@/types/place-admin";
import { validateOpeningSchedule } from "./opening-hours.ts";
import { validatePlaceStatusCombination } from "./publication-status.ts";

type UnknownRecord = Record<string, unknown>;

const triStates: TriState[] = ["YES", "NO", "UNKNOWN"];
const requirementKinds: RequirementKindValue[] = [
  "REFERRAL",
  "DOCUMENT",
  "FEE",
  "LODZ_REGISTRATION",
  "APPOINTMENT",
  "OTHER",
];
const accessibilityFeatures: AccessibilityFeatureValue[] = [
  "STEP_FREE_ENTRANCE",
  "RAMP",
  "ELEVATOR",
  "ACCESSIBLE_TOILET",
  "ACCESSIBLE_SHOWER",
  "WHEELCHAIR_PLACE",
  "ASSISTANCE_DOG",
  "CARE_SERVICES",
  "STAY_WITH_ASSISTANT",
  "OTHER",
];
const operationalStatuses: PlaceOperationalStatusValue[] = [
  "OPEN",
  "CLOSED",
  "OPEN_TODAY",
  "UNKNOWN",
];
const publicationStatuses: PlacePublicationStatusValue[] = [
  "DRAFT",
  "PUBLISHED",
  "TEMPORARILY_CLOSED",
  "PERMANENTLY_CLOSED",
  "ARCHIVED",
];
const accommodationTypes: AccommodationTypeValue[] = [
  "SHELTER",
  "NIGHT_SHELTER",
  "WARMING_CENTER",
  "HOSTEL",
  "INTERVENTION_HOSTEL",
  "CARE_SHELTER",
  "WOMEN_WITH_CHILDREN_HOME",
  "OTHER",
];
const availabilityStates: AccommodationAvailabilityValue[] = [
  "AVAILABLE",
  "FEW",
  "FULL",
  "UNKNOWN",
  "STALE",
  "SUSPENDED",
];
const sobrietyPolicies: SobrietyPolicyValue[] = [
  "SOBRIETY_REQUIRED",
  "ZERO_TOLERANCE",
  "INDIVIDUAL_ASSESSMENT",
  "SEPARATE_PROCEDURE",
  "UNKNOWN",
];
const petPolicies: PetPolicyValue[] = [
  "ACCEPTED",
  "NOT_ACCEPTED",
  "DOG_ONLY",
  "BY_ARRANGEMENT",
  "ASSISTANCE_DOG_ONLY",
  "UNKNOWN",
];
const verificationSources: VerificationSourceValue[] = [
  "PHONE_CALL",
  "ORGANIZATION_EMAIL",
  "VISIT",
  "OFFICIAL_WEBSITE",
  "SOCIAL_MEDIA",
  "OTHER",
];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type PlaceValidationResult =
  | { ok: true; data: PlaceAdminPayload }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > max) return null;
  return normalized;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]) {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : null;
}

function stringArray(value: unknown, maxItems = 30, maxLength = 240) {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const normalized = value.map((item) => text(item, maxLength, true));
  if (normalized.some((item) => item === null)) return null;
  return Array.from(new Set(normalized as string[]));
}

function optionalNumber(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
}

function requirements(value: unknown) {
  if (!Array.isArray(value) || value.length > 20) return null;
  const parsed: AdminRequirement[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const kind = enumValue(item.kind, requirementKinds);
    const state = enumValue(item.state, triStates);
    const label = text(item.label, 240, true);
    const note = text(item.note, 500);
    if (!kind || !state || !label || note === null) return null;
    parsed.push({ kind, state, label, note });
  }
  return parsed;
}

function accessibility(value: unknown) {
  if (!Array.isArray(value) || value.length > 20) return null;
  const parsed: AdminAccessibility[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const feature = enumValue(item.feature, accessibilityFeatures);
    const state = enumValue(item.state, triStates);
    const label = text(item.label, 240, true);
    const note = text(item.note, 500);
    if (!feature || !state || !label || note === null) return null;
    parsed.push({ feature, state, label, note });
  }
  return parsed;
}

function accommodation(value: unknown) {
  if (!isRecord(value)) return null;
  const type = enumValue(value.type, accommodationTypes);
  const audienceLabel = text(value.audienceLabel, 240);
  const targetGroups = stringArray(value.targetGroups);
  const acceptedProfiles = stringArray(value.acceptedProfiles, 10, 80);
  const admissionHoursDescription = text(value.admissionHoursDescription, 1200);
  const acceptsToday = enumValue(value.acceptsToday, triStates);
  const lodzRegistrationRequired = enumValue(value.lodzRegistrationRequired, triStates);
  const referralRequired = enumValue(value.referralRequired, triStates);
  const documentRequired = enumValue(value.documentRequired, triStates);
  const sobrietyPolicy = enumValue(value.sobrietyPolicy, sobrietyPolicies);
  const sobrietyNote = text(value.sobrietyNote, 500);
  const petPolicy = enumValue(value.petPolicy, petPolicies);
  const petNote = text(value.petNote, 500);
  const wheelchairAccessibility = enumValue(value.wheelchairAccessibility, triStates);
  const careServices = enumValue(value.careServices, triStates);
  const partialDependencySupport = enumValue(value.partialDependencySupport, triStates);
  const availabilityState = enumValue(value.availabilityState, availabilityStates);
  const shortFields = [
    "mealsInfo",
    "hygieneInfo",
    "luggageInfo",
    "returnTimeInfo",
    "maxStayInfo",
    "feeInfo",
    "availabilityLabel",
    "importantNote",
  ] as const;
  const parsedShortFields = Object.fromEntries(
    shortFields.map((field) => [field, text(value[field], field === "availabilityLabel" ? 240 : 500)]),
  ) as Record<(typeof shortFields)[number], string | null>;
  const availabilityNote = text(value.availabilityNote, 1000);
  if (
    !type ||
    audienceLabel === null ||
    !targetGroups ||
    !acceptedProfiles ||
    admissionHoursDescription === null ||
    !acceptsToday ||
    !lodzRegistrationRequired ||
    !referralRequired ||
    !documentRequired ||
    !sobrietyPolicy ||
    sobrietyNote === null ||
    !petPolicy ||
    petNote === null ||
    !wheelchairAccessibility ||
    !careServices ||
    !partialDependencySupport ||
    !availabilityState ||
    Object.values(parsedShortFields).some((item) => item === null) ||
    availabilityNote === null ||
    !Array.isArray(value.capacityGroups) ||
    value.capacityGroups.length > 20
  ) {
    return null;
  }
  const capacityGroups: AdminAccommodation["capacityGroups"] = [];
  for (const rawGroup of value.capacityGroups) {
    if (!isRecord(rawGroup)) return null;
    const id = text(rawGroup.id, 36);
    const label = text(rawGroup.label, 160, true);
    const totalBeds = optionalNumber(rawGroup.totalBeds, 0, 100_000);
    const availableBeds = optionalNumber(rawGroup.availableBeds, 0, 100_000);
    if (
      (id && !uuidPattern.test(id)) ||
      !label ||
      totalBeds === undefined ||
      availableBeds === undefined ||
      (totalBeds !== null && availableBeds !== null && availableBeds > totalBeds)
    ) {
      return null;
    }
    capacityGroups.push({
      id: id || undefined,
      label,
      totalBeds,
      availableBeds,
      active: rawGroup.active !== false,
    });
  }
  return {
    type,
    audienceLabel,
    targetGroups,
    acceptedProfiles,
    admissionHoursDescription,
    acceptsToday,
    lodzRegistrationRequired,
    referralRequired,
    documentRequired,
    sobrietyPolicy,
    sobrietyNote,
    petPolicy,
    petNote,
    wheelchairAccessibility,
    careServices,
    partialDependencySupport,
    ...parsedShortFields,
    availabilityState,
    availabilityNote,
    capacityGroups,
  } as AdminAccommodation;
}

export function validatePlaceAdminPayload(value: unknown): PlaceValidationResult {
  if (!isRecord(value)) return { ok: false, reason: "invalid-body" };
  const id = text(value.id, 36);
  const name = text(value.name, 250, true);
  const slug = text(value.slug, 200, true);
  const organizationId = text(value.organizationId, 36);
  const primaryCategorySlug = text(value.primaryCategorySlug, 120, true);
  const categorySlugs = stringArray(value.categorySlugs, 20, 120);
  const typeLabel = text(value.typeLabel, 160);
  const description = text(value.description, 4000);
  const street = text(value.street, 300);
  const buildingNumber = text(value.buildingNumber, 40);
  const addressLine = text(value.addressLine, 400, true);
  const postalCode = text(value.postalCode, 20);
  const city = text(value.city, 120, true);
  const district = text(value.district, 120);
  const latitude = optionalNumber(value.latitude, -90, 90);
  const longitude = optionalNumber(value.longitude, -180, 180);
  const phone = text(value.phone, 50);
  const email = text(value.email, 320);
  const website = text(value.website, 2048);
  const socialMedia = text(value.socialMedia, 2048);
  const publicationStatus = enumValue(value.publicationStatus, publicationStatuses);
  const operationalStatus = enumValue(value.operationalStatus, operationalStatuses);
  const todayHoursLabel = text(value.todayHoursLabel, 240);
  const audience = stringArray(value.audience);
  const services = stringArray(value.services);
  const internalNote = text(value.internalNote, 2000);
  const verificationSource = value.verificationSource
    ? (enumValue(value.verificationSource, verificationSources) ?? undefined)
    : undefined;
  const isAccommodation = value.isAccommodation === true;
  const parsedAccommodation = isAccommodation ? accommodation(value.accommodation) : undefined;
  const rawHours = isRecord(value.openingHours) ? value.openingHours : null;
  const operationResult = rawHours ? validateOpeningSchedule(rawHours.operation) : null;
  const admissionResult = rawHours ? validateOpeningSchedule(rawHours.admission) : null;
  if (operationResult && !operationResult.ok) return { ok: false, reason: `Godziny działania: ${operationResult.error}` };
  if (admissionResult && !admissionResult.ok) return { ok: false, reason: `Godziny przyjęć: ${admissionResult.error}` };
  const operation = operationResult?.ok ? operationResult.days : null;
  const admission = admissionResult?.ok ? admissionResult.days : null;
  const parsedRequirements = requirements(value.requirements);
  const parsedAccessibility = accessibility(value.accessibility);

  if (
    (id && !uuidPattern.test(id)) ||
    !name ||
    !slug ||
    !slugPattern.test(slug) ||
    organizationId === null ||
    (organizationId && !uuidPattern.test(organizationId)) ||
    !primaryCategorySlug ||
    !slugPattern.test(primaryCategorySlug) ||
    !categorySlugs ||
    categorySlugs.length < 1 ||
    !categorySlugs.includes(primaryCategorySlug) ||
    categorySlugs.some((category) => !slugPattern.test(category)) ||
    typeLabel === null ||
    description === null ||
    street === null ||
    buildingNumber === null ||
    !addressLine ||
    postalCode === null ||
    !city ||
    district === null ||
    latitude === undefined ||
    longitude === undefined ||
    phone === null ||
    email === null ||
    (email && !emailPattern.test(email)) ||
    website === null ||
    socialMedia === null ||
    !publicationStatus ||
    !operationalStatus ||
    todayHoursLabel === null ||
    !audience ||
    !services ||
    !operation ||
    !admission ||
    !parsedRequirements ||
    !parsedAccessibility ||
    internalNote === null ||
    (value.markVerified === true && !verificationSource) ||
    (isAccommodation && !parsedAccommodation)
  ) {
    return { ok: false, reason: "invalid-fields" };
  }

  const statusValidation = validatePlaceStatusCombination(publicationStatus, operationalStatus);
  if (!statusValidation.ok) return { ok: false, reason: statusValidation.error };

  for (const candidate of [website, socialMedia]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false, reason: "invalid-url" };
      }
    } catch {
      return { ok: false, reason: "invalid-url" };
    }
  }

  return {
    ok: true,
    data: {
      id: id || undefined,
      name,
      slug,
      organizationId,
      primaryCategorySlug,
      categorySlugs,
      typeLabel,
      description,
      street,
      buildingNumber,
      addressLine,
      postalCode,
      city,
      district,
      latitude,
      longitude,
      phone,
      email,
      website,
      socialMedia,
      publicationStatus,
      operationalStatus,
      todayHoursLabel,
      audience,
      services,
      openingHours: { operation, admission },
      requirements: parsedRequirements,
      accessibility: parsedAccessibility,
      isAccommodation,
      accommodation: parsedAccommodation ?? undefined,
      markVerified: value.markVerified === true,
      verificationSource,
      internalNote,
    },
  };
}
