import type { WizardAnswers } from "@/lib/accommodations/matching";
import type {
  AccommodationNeed,
  PartyProfile,
  PetAnswer,
  RegistrationAnswer,
  WheelchairNeed,
} from "@/lib/accommodations/types";

export const ACCOMMODATION_WIZARD_STORAGE_KEY = "mapa-dobra:accommodation-wizard:v3";
export const LEGACY_ACCOMMODATION_WIZARD_STORAGE_KEY = "mapa-dobra:accommodation-wizard:v2";
export const OLDER_ACCOMMODATION_WIZARD_STORAGE_KEY = "mapa-dobra:accommodation-wizard:v1";
const WIZARD_STATE_VERSION = 3 as const;

export function getAccommodationWizardStepCount(petPresent: boolean) {
  return petPresent ? 3 : 2;
}

export function getAccommodationWizardProgress(step: number, petPresent: boolean) {
  return `Krok ${step + 1} z ${getAccommodationWizardStepCount(petPresent)}`;
}

export type AccommodationWizardState = {
  version: typeof WIZARD_STATE_VERSION;
  step: number;
  answers: WizardAnswers;
  showResults: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function serializeAccommodationWizardState(state: AccommodationWizardState) {
  return JSON.stringify({ ...state, version: WIZARD_STATE_VERSION });
}

export function parseAccommodationWizardState(value: string | null): AccommodationWizardState | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== WIZARD_STATE_VERSION || typeof parsed.step !== "number" || !Number.isInteger(parsed.step) || parsed.step < 0 || !isRecord(parsed.answers)) {
      return null;
    }

    const answers: WizardAnswers = {
      needs: Array.isArray(parsed.answers.needs)
        ? parsed.answers.needs.filter((item): item is AccommodationNeed =>
            ["noReferral", "noDocuments", "careServices", "partialDependency"].includes(item as string),
          )
        : [],
    };

    const partyProfile = parsed.answers.partyProfile;
    if (typeof partyProfile === "string" && ["woman", "man", "womanWithChildren", "family", "other"].includes(partyProfile)) {
      answers.partyProfile = partyProfile as PartyProfile;
    }
    const wheelchair = parsed.answers.wheelchair;
    if (typeof wheelchair === "string" && ["yes", "no", "unknown"].includes(wheelchair)) {
      answers.wheelchair = wheelchair as WheelchairNeed;
    }
    const registration = parsed.answers.registration;
    if (typeof registration === "string" && ["yes", "no", "unknown"].includes(registration)) {
      answers.registration = registration as RegistrationAnswer;
    }
    const pet = parsed.answers.pet;
    if (typeof pet === "string" && ["none", "dog", "other"].includes(pet)) {
      answers.pet = pet as PetAnswer;
    }
    if (typeof parsed.answers.petPresent === "boolean") {
      answers.petPresent = parsed.answers.petPresent;
    }

    return {
      version: WIZARD_STATE_VERSION,
      step: parsed.step,
      answers,
      showResults: parsed.showResults === true,
    };
  } catch {
    return null;
  }
}

export function clearAccommodationWizardState(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(ACCOMMODATION_WIZARD_STORAGE_KEY);
  storage.removeItem(LEGACY_ACCOMMODATION_WIZARD_STORAGE_KEY);
  storage.removeItem(OLDER_ACCOMMODATION_WIZARD_STORAGE_KEY);
}
