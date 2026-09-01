export type InformationState = "YES" | "NO" | "UNKNOWN";

export type AccommodationProfile =
  | "woman"
  | "man"
  | "womanWithChildren"
  | "family"
  | "disability"
  | "other";

/** User-side profile; disability is a separate need, not a party profile. */
export type PartyProfile = Exclude<AccommodationProfile, "disability">;

export type WheelchairNeed = "yes" | "no" | "unknown";
export type RegistrationAnswer = "yes" | "no" | "unknown";
export type PetAnswer = "none" | "dog" | "other";

export type AccommodationNeed =
  | "noReferral"
  | "noDocuments"
  | "careServices"
  | "partialDependency";

export type AccommodationAvailabilityState =
  | "fresh"
  | "few"
  | "none"
  | "unknown"
  | "stale"
  | "suspended";

export type AccommodationAvailabilityFreshness = "FRESH" | "AGING" | "STALE" | "UNKNOWN";

export type AccommodationPetPolicy =
  | "ACCEPTED"
  | "NOT_ACCEPTED"
  | "DOG_ONLY"
  | "BY_ARRANGEMENT"
  | "ASSISTANCE_DOG_ONLY"
  | "UNKNOWN";

export type AccommodationSobrietyPolicy =
  | "SOBRIETY_REQUIRED"
  | "ZERO_TOLERANCE"
  | "INDIVIDUAL_ASSESSMENT"
  | "SEPARATE_PROCEDURE"
  | "UNKNOWN";

export type Accommodation = {
  id: string;
  categorySlug: "nocleg";
  slug: string;
  name: string;
  typeLabel: string;
  audienceLabel: string;
  acceptedProfiles: AccommodationProfile[];
  availability: {
    state: AccommodationAvailabilityState;
    freshness?: AccommodationAvailabilityFreshness;
    freePlaces?: number;
    label: string;
    confirmed: string;
    note?: string;
  };
  acceptsToday: InformationState;
  admissionsToday: string;
  lodzRegistrationRequired: InformationState;
  referralRequired: InformationState;
  documentRequired: InformationState;
  sobrietyPolicy: AccommodationSobrietyPolicy;
  sobrietyRule: string;
  petPolicy: AccommodationPetPolicy;
  petPolicyNote?: string;
  accessibility: InformationState;
  careServices: InformationState;
  partialDependencySupport: InformationState;
  distanceKm: number;
  distanceLabel: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
};

export function normalizeInformationState(value: InformationState): InformationState {
  return value;
}

export function normalizePetPolicy(value: AccommodationPetPolicy): AccommodationPetPolicy {
  return value;
}

export function normalizeSobrietyPolicy(
  value: AccommodationSobrietyPolicy,
): AccommodationSobrietyPolicy {
  return value;
}
