import type { HelpRequestNeed, HelpRequestUrgency, InformationState } from "@/generated/prisma/enums";
import { hasImpossibleFormTiming } from "../security/form-timing.ts";

const needs = [
  "SAFE_PLACE",
  "FOOD",
  "CLOTHING_HYGIENE",
  "MEDICAL",
  "DAILY_FUNCTIONING",
  "OLDER_PERSON_SUPPORT",
  "NO_SUPPORT_NETWORK",
  "OUTDOOR_HARSH_CONDITIONS",
  "DAILY_TASKS",
  "SAFETY_WELLBEING",
  "LOST_OR_DISORIENTED",
  "OTHER",
] as const satisfies readonly HelpRequestNeed[];

const emergencyAnswers = ["YES", "NO", "UNKNOWN"] as const satisfies readonly InformationState[];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export type ValidHelpRequest = {
  emergencyAnswer: InformationState;
  urgency: HelpRequestUrgency;
  needs: HelpRequestNeed[];
  description: string;
  addressText?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  reporterName?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  anonymous: boolean;
};

export type HelpRequestValidationResult =
  | { ok: true; data: ValidHelpRequest }
  | { ok: false; reason: string };

function text(value: unknown, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function optionalNumber(value: unknown, min: number, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function validateHelpRequest(input: unknown): HelpRequestValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, reason: "Nieprawidłowe dane zgłoszenia." };
  }
  const value = input as Record<string, unknown>;
  if (hasImpossibleFormTiming(value.formStartedAt)) return { ok: false, reason: "Nieprawidłowy czas formularza." };
  if (typeof value.honeypot === "string" && value.honeypot.trim()) {
    return { ok: false, reason: "Nieprawidłowe dane zgłoszenia." };
  }

  const emergencyAnswer = value.emergencyAnswer;
  if (!emergencyAnswers.includes(emergencyAnswer as InformationState)) {
    return { ok: false, reason: "Odpowiedz na pytanie o bezpośrednie zagrożenie." };
  }
  const selectedNeeds = value.needs;
  if (
    !Array.isArray(selectedNeeds) ||
    selectedNeeds.length < 1 ||
    selectedNeeds.length > needs.length ||
    new Set(selectedNeeds).size !== selectedNeeds.length ||
    selectedNeeds.some((need) => !needs.includes(need as HelpRequestNeed))
  ) {
    return { ok: false, reason: "Wybierz co najmniej jedną potrzebę." };
  }
  const description = text(value.description, 5000);
  if (!description || description.length < 10) {
    return { ok: false, reason: "Opisz krótko sytuację (co najmniej 10 znaków)." };
  }

  const addressText = text(value.addressText, 500);
  const reporterName = text(value.reporterName, 160);
  const reporterPhone = text(value.reporterPhone, 50);
  const reporterEmail = text(value.reporterEmail, 320);
  if (addressText === null || reporterName === null || reporterPhone === null || reporterEmail === null) {
    return { ok: false, reason: "Sprawdź długość wpisanych danych." };
  }
  if (reporterEmail && !emailPattern.test(reporterEmail)) {
    return { ok: false, reason: "Podaj poprawny adres e-mail." };
  }

  const latitude = optionalNumber(value.latitude, -90, 90);
  const longitude = optionalNumber(value.longitude, -180, 180);
  const locationAccuracy = optionalNumber(value.locationAccuracy, 0, 100_000);
  if (
    latitude === null ||
    longitude === null ||
    locationAccuracy === null ||
    (latitude === undefined) !== (longitude === undefined)
  ) {
    return { ok: false, reason: "Sprawdź lokalizację." };
  }

  return {
    ok: true,
    data: {
      emergencyAnswer: emergencyAnswer as InformationState,
      urgency: emergencyAnswer === "YES" ? "IMMEDIATE" : "UNKNOWN",
      needs: selectedNeeds as HelpRequestNeed[],
      description,
      addressText: addressText ?? undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      locationAccuracy: locationAccuracy ?? undefined,
      reporterName: reporterName ?? undefined,
      reporterPhone: reporterPhone ?? undefined,
      reporterEmail: reporterEmail ?? undefined,
      anonymous: !reporterName && !reporterPhone && !reporterEmail,
    },
  };
}

export const helpRequestNeedLabels: Record<HelpRequestNeed, string> = {
  SAFE_PLACE: "Bezpieczne miejsce lub nocleg",
  FOOD: "Posiłek lub żywność",
  CLOTHING_HYGIENE: "Odzież lub środki higieniczne",
  MEDICAL: "Możliwa potrzeba pomocy medycznej",
  DAILY_FUNCTIONING: "Trudność z codziennym funkcjonowaniem",
  OLDER_PERSON_SUPPORT: "Starsza osoba może potrzebować wsparcia",
  NO_SUPPORT_NETWORK: "Osoba może nie mieć wsparcia bliskich",
  OUTDOOR_HARSH_CONDITIONS: "Osoba przebywa na zewnątrz w trudnych warunkach",
  DAILY_TASKS: "Pomoc w zakupach lub codziennych sprawach",
  SAFETY_WELLBEING: "Niepokój o bezpieczeństwo lub dobrostan",
  LOST_OR_DISORIENTED: "Osoba wygląda na zagubioną lub zdezorientowaną",
  OTHER: "Inne",
};
