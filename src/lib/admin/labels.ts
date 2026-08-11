import type {
  HelpCategory,
  ModerationStatus,
  PlaceUpdateType,
  SubmissionSourceType,
} from "@/generated/prisma/enums";

export const moderationStatusLabels: Record<ModerationStatus, string> = {
  PENDING: "Oczekujące",
  UNDER_REVIEW: "W trakcie",
  APPROVED: "Zatwierdzone",
  REJECTED: "Odrzucone",
};

export const updateTypeLabels: Record<PlaceUpdateType, string> = {
  HOURS: "Błędne godziny",
  ADDRESS: "Błędny adres",
  PHONE: "Błędny telefon",
  ONLINE_CONTACT: "Kontakt online",
  HELP_SCOPE: "Zakres pomocy",
  REQUIREMENTS: "Warunki skorzystania",
  TEMPORARY_CLOSURE: "Czasowe zamknięcie",
  PERMANENT_CLOSURE: "Stałe zamknięcie",
  ACCOMMODATION_AVAILABILITY: "Wolne miejsca noclegowe",
  ACCOMMODATION_RULES: "Zasady noclegu",
  OTHER: "Inna zmiana",
};

export const categoryLabels: Record<HelpCategory, string> = {
  FOOD: "Jedzenie",
  ACCOMMODATION: "Nocleg",
  HYGIENE: "Higiena",
  CLOTHING: "Odzież",
  MEDICAL: "Pomoc medyczna",
  PSYCHOLOGICAL: "Pomoc psychologiczna",
  LEGAL: "Pomoc prawna",
  SOCIAL: "Pomoc socjalna",
  OTHER: "Inna pomoc",
};

export const sourceTypeLabels: Record<SubmissionSourceType, string> = {
  VISITED: "Wizyta na miejscu",
  USED_HELP: "Skorzystanie z pomocy",
  STAFF: "Informacja od pracownika",
  PHONE: "Rozmowa telefoniczna",
  WEBSITE: "Strona internetowa",
  SOCIAL: "Media społecznościowe",
  VOLUNTEER: "Wolontariat",
  RECOMMENDATION: "Polecenie innej osoby",
  OTHER: "Inne źródło",
  PREFER_NOT: "Nie podano",
};

export const informationStateLabels = {
  YES: "Tak",
  NO: "Nie",
  UNKNOWN: "Brak danych / nie wiadomo",
} as const;

export function formatAdminDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(date);
}
