import type {
  Accommodation,
  AccommodationNeed,
  InformationState,
  PetAnswer,
  RegistrationAnswer,
  WheelchairNeed,
} from "./types";
import type { PartyProfile } from "./types";

export type WizardAnswers = {
  partyProfile?: PartyProfile;
  wheelchair?: WheelchairNeed;
  registration?: RegistrationAnswer;
  petPresent?: boolean;
  pet?: PetAnswer;
  needs: AccommodationNeed[];
};

export type MatchResult = {
  accommodation: Accommodation;
  score: number;
  unmetConditions: string[];
  confirmationConditions: string[];
  hardMismatch: boolean;
};

export type CriterionResult = "MATCH" | "MISMATCH" | "UNKNOWN";

export function evaluateRequiredState(
  state: InformationState,
  expected: "YES" | "NO",
): CriterionResult {
  if (state === "UNKNOWN") return "UNKNOWN";
  return state === expected ? "MATCH" : "MISMATCH";
}

function isAvailableNow(accommodation: Accommodation) {
  return accommodation.availability.state === "fresh" || accommodation.availability.state === "few";
}

function availabilityScore(accommodation: Accommodation) {
  switch (accommodation.availability.state) {
    case "fresh":
      return 70;
    case "few":
      return 55;
    case "stale":
      return 12;
    case "unknown":
      return 4;
    case "none":
      return -90;
    case "suspended":
      return -120;
  }
}

function addTriStateCondition(
  state: InformationState,
  expected: "YES" | "NO",
  mismatchLabel: string,
  unknownLabel: string,
  unmet: string[],
  confirmation: string[],
) {
  const result = evaluateRequiredState(state, expected);
  if (result === "MISMATCH") unmet.push(mismatchLabel);
  if (result === "UNKNOWN") confirmation.push(unknownLabel);
}

function petResult(accommodation: Accommodation, answer: PetAnswer): CriterionResult {
  if (answer === "none") return "MATCH";
  if (accommodation.petPolicy === "UNKNOWN") return "UNKNOWN";
  if (answer === "dog") {
    return ["ACCEPTED", "DOG_ONLY", "BY_ARRANGEMENT"].includes(accommodation.petPolicy)
      ? "MATCH"
      : "MISMATCH";
  }
  return ["ACCEPTED", "BY_ARRANGEMENT"].includes(accommodation.petPolicy)
    ? "MATCH"
    : "MISMATCH";
}

export function hasHardAccommodationMismatch(
  accommodation: Accommodation,
  answers: WizardAnswers,
): boolean {
  if (answers.partyProfile && answers.partyProfile !== "other") {
    const hasPartyProfile = accommodation.acceptedProfiles.includes(answers.partyProfile);
    const hasDisabilityOnlyProfile = accommodation.acceptedProfiles.includes("disability") && !hasPartyProfile;
    if (!hasPartyProfile && !hasDisabilityOnlyProfile) return true;
  }

  if (answers.wheelchair === "yes" && accommodation.accessibility === "NO") return true;
  if (answers.pet && answers.pet !== "none" && petResult(accommodation, answers.pet) === "MISMATCH") return true;
  if (answers.needs.includes("noReferral") && accommodation.referralRequired === "YES") return true;
  if (answers.needs.includes("noDocuments") && accommodation.documentRequired === "YES") return true;
  if (answers.needs.includes("careServices") && accommodation.careServices === "NO") return true;
  if (answers.needs.includes("partialDependency") && accommodation.partialDependencySupport === "NO") return true;
  return false;
}

export function getAccommodationConditions(
  accommodation: Accommodation,
  answers: WizardAnswers,
) {
  const unmetConditions: string[] = [];
  const confirmationConditions: string[] = [];

  if (answers.partyProfile && answers.partyProfile !== "other") {
    const hasPartyProfile = accommodation.acceptedProfiles.includes(answers.partyProfile);
    const hasDisabilityOnlyProfile = accommodation.acceptedProfiles.includes("disability") && !hasPartyProfile;

    if (!hasPartyProfile && hasDisabilityOnlyProfile) {
      confirmationConditions.push("Grupa odbiorców tego miejsca wymaga potwierdzenia.");
    } else if (!hasPartyProfile) {
      unmetConditions.push("Miejsce nie jest wskazane dla wybranej grupy.");
    }
  }

  if (answers.wheelchair === "yes") {
    addTriStateCondition(
      accommodation.accessibility,
      "YES",
      "Brak dostępności dla osoby na wózku.",
      "Dostępność dla osoby na wózku wymaga potwierdzenia.",
      unmetConditions,
      confirmationConditions,
    );
  }

  if (answers.registration === "no") {
    addTriStateCondition(
      accommodation.lodzRegistrationRequired,
      "NO",
      "Wymaga ostatniego meldunku w Łodzi.",
      "Wymóg ostatniego meldunku w Łodzi wymaga potwierdzenia.",
      unmetConditions,
      confirmationConditions,
    );
  } else if (answers.registration === "unknown") {
    const registration = evaluateRequiredState(accommodation.lodzRegistrationRequired, "NO");
    if (registration !== "MATCH") {
      confirmationConditions.push("Wymóg ostatniego meldunku w Łodzi wymaga potwierdzenia.");
    }
  }

  if (answers.pet && answers.pet !== "none") {
    const result = petResult(accommodation, answers.pet);
    if (result === "MISMATCH") {
      unmetConditions.push(
        answers.pet === "dog" ? "Nie przyjmuje psa." : "Nie przyjmuje tego zwierzęcia.",
      );
    } else if (result === "UNKNOWN") {
      confirmationConditions.push("Możliwość przyjęcia zwierzęcia wymaga potwierdzenia.");
    }
  }

  if (answers.needs.includes("noReferral")) {
    addTriStateCondition(
      accommodation.referralRequired,
      "NO",
      "Wymaga skierowania.",
      "Wymóg skierowania wymaga potwierdzenia.",
      unmetConditions,
      confirmationConditions,
    );
  }

  if (answers.needs.includes("noDocuments")) {
    addTriStateCondition(
      accommodation.documentRequired,
      "NO",
      "Wymaga dokumentu.",
      "Wymóg dokumentu wymaga potwierdzenia.",
      unmetConditions,
      confirmationConditions,
    );
  }

  if (answers.needs.includes("careServices")) {
    addTriStateCondition(
      accommodation.careServices,
      "YES",
      "Brak usług opiekuńczych.",
      "Dostępność usług opiekuńczych wymaga potwierdzenia.",
      unmetConditions,
      confirmationConditions,
    );
  }

  if (answers.needs.includes("partialDependency")) {
    addTriStateCondition(
      accommodation.partialDependencySupport,
      "YES",
      "Brak wsparcia dla osoby częściowo niesamodzielnej.",
      "Wsparcie dla osoby częściowo niesamodzielnej wymaga potwierdzenia.",
      unmetConditions,
      confirmationConditions,
    );
  }

  if (accommodation.availability.state === "none") {
    unmetConditions.push("Brak wolnych miejsc.");
  }
  if (accommodation.availability.state === "unknown") {
    confirmationConditions.push("Brak aktualnego potwierdzenia wolnych miejsc.");
  }
  if (accommodation.availability.state === "stale") {
    confirmationConditions.push("Dane o wolnych miejscach mogą być nieaktualne.");
  }
  if (accommodation.availability.state === "suspended") {
    unmetConditions.push("Przyjęcia są czasowo wstrzymane.");
  }
  const acceptsToday = evaluateRequiredState(accommodation.acceptsToday, "YES");
  if (acceptsToday === "MISMATCH" && accommodation.availability.state !== "suspended") {
    unmetConditions.push("Nie przyjmuje dzisiaj.");
  }
  if (acceptsToday === "UNKNOWN") {
    confirmationConditions.push("Możliwość przyjęcia dzisiaj wymaga potwierdzenia.");
  }

  return { unmetConditions, confirmationConditions };
}

export function rankAccommodations(
  accommodations: Accommodation[],
  answers: WizardAnswers,
): MatchResult[] {
  return accommodations
    .map((accommodation) => {
      const { unmetConditions, confirmationConditions } = getAccommodationConditions(
        accommodation,
        answers,
      );
      const groupMatch =
        !answers.partyProfile ||
        answers.partyProfile === "other" ||
        accommodation.acceptedProfiles.includes(answers.partyProfile);
      let score = 0;

      score += groupMatch ? 180 : -160;
      score += unmetConditions.length === 0 ? 70 : -unmetConditions.length * 24;
      score -= confirmationConditions.length * 8;
      score += accommodation.acceptsToday === "YES" ? 50 : accommodation.acceptsToday === "NO" ? -80 : -8;
      score += availabilityScore(accommodation);
      score += isAvailableNow(accommodation) ? 35 : 0;
      score += answers.needs.includes("careServices") && accommodation.careServices === "YES" ? 35 : 0;
      score +=
        answers.needs.includes("partialDependency") &&
        accommodation.partialDependencySupport === "YES"
          ? 30
          : 0;
      score -= accommodation.distanceKm * 4;

      return {
        accommodation,
        score,
        unmetConditions,
        confirmationConditions,
        hardMismatch: hasHardAccommodationMismatch(accommodation, answers),
      };
    })
    .sort((first, second) => {
      if (first.unmetConditions.length !== second.unmetConditions.length) {
        return first.unmetConditions.length - second.unmetConditions.length;
      }
      if (first.confirmationConditions.length !== second.confirmationConditions.length) {
        return first.confirmationConditions.length - second.confirmationConditions.length;
      }
      return second.score - first.score;
    });
}
