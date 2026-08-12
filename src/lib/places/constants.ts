import type {
  AccessibilityFeatureValue,
  AccommodationTypeValue,
  PetPolicyValue,
  PlacePublicationStatusValue,
  RequirementKindValue,
  SobrietyPolicyValue,
  VerificationSourceValue,
  WeekdayValue,
} from "@/types/place-admin";

export const weekdayOptions: Array<{ value: WeekdayValue; label: string }> = [
  { value: "MONDAY", label: "Poniedziałek" },
  { value: "TUESDAY", label: "Wtorek" },
  { value: "WEDNESDAY", label: "Środa" },
  { value: "THURSDAY", label: "Czwartek" },
  { value: "FRIDAY", label: "Piątek" },
  { value: "SATURDAY", label: "Sobota" },
  { value: "SUNDAY", label: "Niedziela" },
];

export const requirementOptions: Array<{
  kind: RequirementKindValue;
  label: string;
}> = [
  { kind: "REFERRAL", label: "Wymagane skierowanie" },
  { kind: "DOCUMENT", label: "Wymagany dokument" },
  { kind: "FEE", label: "Odpłatność" },
  { kind: "LODZ_REGISTRATION", label: "Wymagany ostatni meldunek w Łodzi" },
  { kind: "APPOINTMENT", label: "Wymagane wcześniejsze umówienie" },
];

export const accessibilityOptions: Array<{
  feature: AccessibilityFeatureValue;
  label: string;
}> = [
  { feature: "STEP_FREE_ENTRANCE", label: "Wejście bez stopni" },
  { feature: "RAMP", label: "Podjazd" },
  { feature: "ELEVATOR", label: "Winda" },
  { feature: "ACCESSIBLE_TOILET", label: "Dostępna toaleta" },
  { feature: "ACCESSIBLE_SHOWER", label: "Dostępny prysznic" },
  { feature: "WHEELCHAIR_PLACE", label: "Miejsce dla osoby na wózku" },
  { feature: "ASSISTANCE_DOG", label: "Pies asystujący" },
  { feature: "CARE_SERVICES", label: "Usługi opiekuńcze" },
  { feature: "STAY_WITH_ASSISTANT", label: "Pobyt z asystentem" },
];

export const accommodationTypeLabels: Record<AccommodationTypeValue, string> = {
  SHELTER: "Schronisko",
  NIGHT_SHELTER: "Noclegownia",
  WARMING_CENTER: "Ogrzewalnia",
  HOSTEL: "Hostel",
  INTERVENTION_HOSTEL: "Hostel interwencyjny",
  CARE_SHELTER: "Schronisko z usługami opiekuńczymi",
  WOMEN_WITH_CHILDREN_HOME: "Dom dla kobiet z dziećmi",
  OTHER: "Inny typ",
};

export const sobrietyPolicyLabels: Record<SobrietyPolicyValue, string> = {
  SOBRIETY_REQUIRED: "Wymagana trzeźwość",
  ZERO_TOLERANCE: "Wymagane 0,0",
  INDIVIDUAL_ASSESSMENT: "Przyjęcie po indywidualnej ocenie",
  SEPARATE_PROCEDURE: "Osobna procedura dla osób po spożyciu",
  UNKNOWN: "Brak potwierdzonych danych",
};

export const petPolicyLabels: Record<PetPolicyValue, string> = {
  ACCEPTED: "Przyjmowane",
  NOT_ACCEPTED: "Nieprzyjmowane",
  DOG_ONLY: "Tylko pies",
  BY_ARRANGEMENT: "Po uzgodnieniu",
  ASSISTANCE_DOG_ONLY: "Tylko pies asystujący",
  UNKNOWN: "Brak danych",
};

export const verificationSourceLabels: Record<VerificationSourceValue, string> = {
  PHONE_CALL: "Rozmowa telefoniczna",
  ORGANIZATION_EMAIL: "E-mail od placówki",
  VISIT: "Wizyta",
  OFFICIAL_WEBSITE: "Oficjalna strona WWW",
  SOCIAL_MEDIA: "Media społecznościowe",
  OTHER: "Inne źródło",
};

export const placeStatusLabels: Record<PlacePublicationStatusValue, string> = {
  DRAFT: "Szkic",
  PUBLISHED: "Opublikowane",
  TEMPORARILY_CLOSED: "Czasowo zamknięte",
  PERMANENTLY_CLOSED: "Zamknięte na stałe",
  ARCHIVED: "Zarchiwizowane",
};
