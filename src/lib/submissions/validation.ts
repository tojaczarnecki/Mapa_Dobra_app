type UnknownRecord = Record<string, unknown>;

export const placeUpdateTypes = [
  "hours",
  "address",
  "phone",
  "online-contact",
  "help-scope",
  "requirements",
  "temporary-closure",
  "permanent-closure",
  "accommodation-availability",
  "accommodation-rules",
  "other",
] as const;

export const helpCategories = [
  "food",
  "accommodation",
  "hygiene",
  "clothing",
  "medical",
  "psychological",
  "legal",
  "social",
  "other",
] as const;

export const sourceTypes = [
  "visited",
  "used-help",
  "staff",
  "phone",
  "website",
  "social",
  "volunteer",
  "recommendation",
  "other",
  "prefer-not",
] as const;

const requirementValues = [
  "Bez skierowania",
  "Wymagane skierowanie",
  "Dokument niewymagany",
  "Wymagany dokument",
  "Bezpłatnie",
  "Wymagane wcześniejsze umówienie",
  "Ostatnie zameldowanie w Łodzi wymagane",
  "Ostatnie zameldowanie w Łodzi niewymagane",
  "Nie wiem",
] as const;

const accommodationTypes = [
  "Schronisko",
  "Noclegownia",
  "Ogrzewalnia",
  "Hostel",
  "Hostel interwencyjny",
  "Schronisko z usługami opiekuńczymi",
  "Dom dla kobiet z dziećmi",
  "Inne",
  "Nie wiem",
] as const;

const targetGroupValues = [
  "Koedukacyjne",
  "Dla kobiet",
  "Dla mężczyzn",
  "Dla kobiet z dziećmi",
  "Dla rodzin",
  "Dla osób z niepełnosprawnościami",
  "Dla osób wymagających usług opiekuńczych",
  "Nie wiem",
] as const;

const accessibilityValues = [
  "Wejście bez stopni",
  "Podjazd",
  "Winda",
  "Toaleta dostępna",
  "Prysznic dostępny",
  "Miejsce dla osoby na wózku",
  "Usługi opiekuńcze",
  "Nie wiem",
] as const;

const sobrietyValues = [
  "Wymagana trzeźwość",
  "Przyjęcie po indywidualnej ocenie",
  "Osobna procedura dla osób po spożyciu",
  "Nie wiem",
] as const;

const petPolicyValues = [
  "Przyjmowane",
  "Nieprzyjmowane",
  "Po uzgodnieniu",
  "Tylko pies",
  "Pies asystujący",
  "Nie wiem",
] as const;

const availabilityUpdateValues = ["just-now", "today", "yesterday", "other"] as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

type PlaceUpdateTypeValue = (typeof placeUpdateTypes)[number];
type HelpCategoryValue = (typeof helpCategories)[number];
type SourceTypeValue = (typeof sourceTypes)[number];

export type ValidPlaceUpdateSubmission = {
  requestId: string;
  placeId?: string;
  placeSlug?: string;
  placeNameSnapshot: string;
  submissionTypes: PlaceUpdateTypeValue[];
  description: string;
  proposedPhone?: string;
  proposedAddress?: string;
  proposedOpeningHours?: string;
  proposedWebsite?: string;
  proposedOtherValue?: string;
  sourceType?: SourceTypeValue;
  sourceUrl?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
};

export type ValidNewPlaceSubmission = {
  requestId: string;
  name: string;
  organizationName?: string;
  categories: HelpCategoryValue[];
  streetAddress?: string;
  postalCode?: string;
  city: string;
  district?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingHoursDescription?: string;
  description?: string;
  requirements: string[];
  sourceType?: SourceTypeValue;
  sourceUrl?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  accommodationType?: string;
  targetGroups: string[];
  availabilityKnown?: "YES" | "NO" | "UNKNOWN";
  availableBedsReported?: number;
  availabilityReportedAt?: Date;
  availabilityReportedDescription?: string;
  admissionHoursDescription?: string;
  sobrietyPolicy?: string;
  petPolicy?: string;
  accessibilityFeatures: string[];
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.length <= maxLength ? normalized : null;
}

function requiredString(value: unknown, maxLength: number) {
  const normalized = optionalString(value, maxLength);
  return typeof normalized === "string" ? normalized : null;
}

function optionalEmail(value: unknown) {
  const email = optionalString(value, 320);
  if (email === undefined) return undefined;
  return email && emailPattern.test(email) ? email : null;
}

function optionalUrl(value: unknown) {
  const url = optionalString(value, 2048);
  if (url === undefined) return undefined;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T) {
  return typeof value === "string" && allowed.includes(value) ? (value as T[number]) : null;
}

function optionalEnumValue<T extends readonly string[]>(value: unknown, allowed: T) {
  if (value === undefined || value === null || value === "") return undefined;
  return enumValue(value, allowed);
}

function enumArray<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  { min = 0, max = allowed.length }: { min?: number; max?: number } = {},
) {
  if (!Array.isArray(value) || value.length < min || value.length > max) return null;
  const uniqueValues = [...new Set(value)];
  if (uniqueValues.length !== value.length) return null;
  if (!uniqueValues.every((item) => enumValue(item, allowed))) return null;
  return uniqueValues as T[number][];
}

function contactData(value: unknown) {
  if (!isRecord(value)) return null;
  const name = optionalString(value.name, 160);
  const email = optionalEmail(value.email);
  const phone = optionalString(value.phone, 50);
  if (name === null || email === null || phone === null) return null;
  return { name, email, phone };
}

function sourceData(value: unknown) {
  if (!isRecord(value)) return null;
  const type = optionalEnumValue(value.type, sourceTypes);
  const url = optionalUrl(value.url);
  if (type === null || url === null) return null;
  return { type, url };
}

function hasFilledHoneypot(value: UnknownRecord) {
  const directValue = value.contactWebsite;
  const protection = isRecord(value.protection) ? value.protection.contactWebsite : undefined;
  return Boolean(
    (typeof directValue === "string" && directValue.trim()) ||
      (typeof protection === "string" && protection.trim()),
  );
}

export function validatePlaceUpdateSubmission(
  value: unknown,
): ValidationResult<ValidPlaceUpdateSubmission> {
  if (!isRecord(value)) return { ok: false, reason: "invalid-body" };
  if (hasFilledHoneypot(value)) return { ok: false, reason: "honeypot" };

  const requestId = requiredString(value.requestId, 36);
  const placeId = optionalString(value.placeId, 200);
  const placeSlug = optionalString(value.placeSlug, 200);
  const placeNameSnapshot = requiredString(value.placeReference, 250);
  const submissionTypes = enumArray(value.reportTypes, placeUpdateTypes, { min: 1 });
  const description = requiredString(value.description, 4000);
  const proposedData = isRecord(value.proposedData) ? value.proposedData : null;
  const source = sourceData(value.source);
  const contact = contactData(value.submitterContact);

  if (!requestId || !uuidPattern.test(requestId)) return { ok: false, reason: "request-id" };
  if (placeId === null || placeSlug === null || !placeNameSnapshot) {
    return { ok: false, reason: "place" };
  }
  if (!submissionTypes || !description || !proposedData || !source || !contact) {
    return { ok: false, reason: "required-fields" };
  }

  const proposedPhone = optionalString(proposedData.phone, 50);
  const proposedAddress = optionalString(proposedData.address, 400);
  const proposedOpeningHours = optionalString(proposedData.hours, 1200);
  const proposedWebsite = optionalUrl(proposedData.website);
  const proposedOtherValue = optionalString(proposedData.closedSince, 2000);

  if (
    proposedPhone === null ||
    proposedAddress === null ||
    proposedOpeningHours === null ||
    proposedWebsite === null ||
    proposedOtherValue === null
  ) {
    return { ok: false, reason: "proposed-data" };
  }

  return {
    ok: true,
    data: {
      requestId,
      placeId,
      placeSlug,
      placeNameSnapshot,
      submissionTypes,
      description,
      proposedPhone,
      proposedAddress,
      proposedOpeningHours,
      proposedWebsite,
      proposedOtherValue,
      sourceType: source.type,
      sourceUrl: source.url,
      reporterName: contact.name,
      reporterEmail: contact.email,
      reporterPhone: contact.phone,
    },
  };
}

function availabilityData(value: UnknownRecord) {
  const knownValue = value.availabilityKnown;
  const availabilityKnown: "YES" | "NO" | "UNKNOWN" | undefined | null =
    knownValue === "yes"
      ? "YES"
      : knownValue === "no"
        ? "NO"
        : knownValue === "unknown"
          ? "UNKNOWN"
          : knownValue === "" || knownValue === undefined
            ? undefined
            : null;

  if (availabilityKnown === null) return null;

  let availableBedsReported: number | undefined;
  if (availabilityKnown === "YES") {
    const rawBeds = value.freePlaces;
    if (typeof rawBeds !== "string" && typeof rawBeds !== "number") return null;
    const numericBeds = Number(rawBeds);
    if (!Number.isInteger(numericBeds) || numericBeds < 0 || numericBeds > 100_000) {
      return null;
    }
    availableBedsReported = numericBeds;
  }

  const updateType = optionalEnumValue(value.availabilityUpdated, availabilityUpdateValues);
  if (availabilityKnown === "YES" && !updateType) return null;
  if (updateType === null) return null;

  const otherDescription = optionalString(value.availabilityUpdatedOther, 240);
  if (otherDescription === null) return null;

  const now = new Date();
  let availabilityReportedAt: Date | undefined;
  let availabilityReportedDescription: string | undefined;

  if (updateType === "just-now" || updateType === "today") {
    availabilityReportedAt = now;
    availabilityReportedDescription = updateType === "just-now" ? "Przed chwilą" : "Dzisiaj";
  } else if (updateType === "yesterday") {
    availabilityReportedAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    availabilityReportedDescription = "Wczoraj";
  } else if (updateType === "other") {
    availabilityReportedDescription = otherDescription;
    if (otherDescription) {
      const parsedTimestamp = Date.parse(otherDescription);
      if (!Number.isNaN(parsedTimestamp)) {
        availabilityReportedAt = new Date(parsedTimestamp);
      }
    }
  }

  return {
    availabilityKnown,
    availableBedsReported,
    availabilityReportedAt,
    availabilityReportedDescription,
  };
}

export function validateNewPlaceSubmission(
  value: unknown,
): ValidationResult<ValidNewPlaceSubmission> {
  if (!isRecord(value)) return { ok: false, reason: "invalid-body" };
  if (hasFilledHoneypot(value)) return { ok: false, reason: "honeypot" };

  const requestId = requiredString(value.requestId, 36);
  const proposedData = isRecord(value.proposedData) ? value.proposedData : null;
  const source = sourceData(value.source);
  const contact = contactData(value.submitterContact);
  if (!requestId || !uuidPattern.test(requestId) || !proposedData || !source || !contact) {
    return { ok: false, reason: "required-fields" };
  }

  const name = requiredString(proposedData.name, 250);
  const organizationName = optionalString(proposedData.organizationName, 250);
  const categories = enumArray(proposedData.helpCategories, helpCategories, { min: 1 });
  const address = isRecord(proposedData.address) ? proposedData.address : null;
  const placeContact = isRecord(proposedData.placeContact) ? proposedData.placeContact : null;
  const requirements = enumArray(proposedData.conditions, requirementValues);
  if (!name || organizationName === null || !categories || !address || !placeContact || !requirements) {
    return { ok: false, reason: "place-data" };
  }

  const streetAddress = optionalString(address.street, 300);
  const postalCode = optionalString(address.postalCode, 20);
  const city = requiredString(address.city, 120);
  const district = optionalString(address.district, 120);
  const phone = optionalString(placeContact.phone, 50);
  const email = optionalEmail(placeContact.email);
  const website = optionalUrl(placeContact.website);
  const openingHoursDescription = optionalString(proposedData.openingHours, 1200);
  const description = optionalString(proposedData.description, 4000);

  if (
    streetAddress === null ||
    postalCode === null ||
    !city ||
    district === null ||
    phone === null ||
    email === null ||
    website === null ||
    openingHoursDescription === null ||
    description === null
  ) {
    return { ok: false, reason: "field-format" };
  }

  const accommodation = isRecord(proposedData.accommodation)
    ? proposedData.accommodation
    : undefined;

  let accommodationType: string | undefined;
  let targetGroups: string[] = [];
  let availabilityKnown: "YES" | "NO" | "UNKNOWN" | undefined;
  let availableBedsReported: number | undefined;
  let availabilityReportedAt: Date | undefined;
  let availabilityReportedDescription: string | undefined;
  let admissionHoursDescription: string | undefined;
  let sobrietyPolicy: string | undefined;
  let petPolicy: string | undefined;
  let accessibilityFeatures: string[] = [];

  if (accommodation) {
    const parsedAccommodationType = optionalEnumValue(
      accommodation.facilityType,
      accommodationTypes,
    );
    const parsedTargetGroups = enumArray(accommodation.audiences, targetGroupValues);
    const parsedAvailability = availabilityData(accommodation);
    const parsedAdmissionHours = optionalString(accommodation.admissionHours, 1200);
    const parsedSobriety = optionalEnumValue(accommodation.sobriety, sobrietyValues);
    const parsedPetPolicy = optionalEnumValue(accommodation.animals, petPolicyValues);
    const parsedAccessibility = enumArray(
      accommodation.accessibility,
      accessibilityValues,
    );

    if (
      parsedAccommodationType === null ||
      !parsedTargetGroups ||
      !parsedAvailability ||
      parsedAdmissionHours === null ||
      parsedSobriety === null ||
      parsedPetPolicy === null ||
      !parsedAccessibility
    ) {
      return { ok: false, reason: "accommodation-data" };
    }

    accommodationType = parsedAccommodationType;
    targetGroups = parsedTargetGroups;
    availabilityKnown = parsedAvailability.availabilityKnown;
    availableBedsReported = parsedAvailability.availableBedsReported;
    availabilityReportedAt = parsedAvailability.availabilityReportedAt;
    availabilityReportedDescription = parsedAvailability.availabilityReportedDescription;
    admissionHoursDescription = parsedAdmissionHours;
    sobrietyPolicy = parsedSobriety;
    petPolicy = parsedPetPolicy;
    accessibilityFeatures = parsedAccessibility;
  }

  return {
    ok: true,
    data: {
      requestId,
      name,
      organizationName,
      categories,
      streetAddress,
      postalCode,
      city,
      district,
      phone,
      email,
      website,
      openingHoursDescription,
      description,
      requirements,
      sourceType: source.type,
      sourceUrl: source.url,
      reporterName: contact.name,
      reporterEmail: contact.email,
      reporterPhone: contact.phone,
      accommodationType,
      targetGroups,
      availabilityKnown,
      availableBedsReported,
      availabilityReportedAt,
      availabilityReportedDescription,
      admissionHoursDescription,
      sobrietyPolicy,
      petPolicy,
      accessibilityFeatures,
    },
  };
}
