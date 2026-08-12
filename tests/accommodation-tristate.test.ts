import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRequiredState,
  getAccommodationConditions,
  rankAccommodations,
} from "../src/lib/accommodations/matching.ts";
import {
  normalizeInformationState,
  normalizePetPolicy,
  normalizeSobrietyPolicy,
  type Accommodation,
} from "../src/lib/accommodations/types.ts";

function accommodation(
  id: string,
  overrides: Partial<Accommodation> = {},
): Accommodation {
  return {
    id,
    categorySlug: "nocleg",
    slug: id,
    name: `Miejsce ${id}`,
    typeLabel: "Schronisko",
    audienceLabel: "dla mężczyzn",
    acceptedProfiles: ["man", "other"],
    availability: {
      state: "fresh",
      freePlaces: 2,
      label: "2 wolne miejsca",
      confirmed: "Potwierdzone 10 min temu",
    },
    acceptsToday: "YES",
    admissionsToday: "Przyjęcia do 22:00",
    lodzRegistrationRequired: "NO",
    referralRequired: "NO",
    documentRequired: "NO",
    sobrietyPolicy: "UNKNOWN",
    sobrietyRule: "Brak potwierdzonych zasad",
    petPolicy: "UNKNOWN",
    accessibility: "UNKNOWN",
    careServices: "UNKNOWN",
    partialDependencySupport: "UNKNOWN",
    distanceKm: 1,
    distanceLabel: "1 km",
    latitude: 51.75,
    longitude: 19.45,
    ...overrides,
  };
}

test("tri-state adapters preserve YES, NO and UNKNOWN", () => {
  assert.equal(normalizeInformationState("YES"), "YES");
  assert.equal(normalizeInformationState("NO"), "NO");
  assert.equal(normalizeInformationState("UNKNOWN"), "UNKNOWN");
  assert.notEqual(normalizeInformationState("UNKNOWN"), "NO");
  assert.equal(normalizePetPolicy("UNKNOWN"), "UNKNOWN");
  assert.equal(normalizeSobrietyPolicy("UNKNOWN"), "UNKNOWN");
});

test("UNKNOWN criterion requires confirmation instead of becoming a mismatch", () => {
  assert.equal(evaluateRequiredState("UNKNOWN", "NO"), "UNKNOWN");
  const result = getAccommodationConditions(
    accommodation("unknown", { referralRequired: "UNKNOWN" }),
    {
    profile: "man",
    needs: ["noReferral"],
    },
  );

  assert.deepEqual(result.unmetConditions, []);
  assert.ok(result.confirmationConditions.includes("Wymóg skierowania wymaga potwierdzenia."));
});

test("unknown accessibility and pet policy remain confirmation conditions", () => {
  const result = getAccommodationConditions(accommodation("unknown-details"), {
    profile: "man",
    wheelchair: "yes",
    pet: "dog",
    needs: [],
  });

  assert.deepEqual(result.unmetConditions, []);
  assert.ok(result.confirmationConditions.includes("Dostępność dla osoby na wózku wymaga potwierdzenia."));
  assert.ok(result.confirmationConditions.includes("Możliwość przyjęcia zwierzęcia wymaga potwierdzenia."));
});

test("explicit mismatch ranks below a match and an unknown criterion", () => {
  const ranked = rankAccommodations(
    [
      accommodation("mismatch", { referralRequired: "YES", distanceKm: 0.1 }),
      accommodation("unknown", { referralRequired: "UNKNOWN", distanceKm: 0.2 }),
      accommodation("match", { referralRequired: "NO", distanceKm: 3 }),
    ],
    { profile: "man", needs: ["noReferral"] },
  );

  assert.deepEqual(ranked.map((item) => item.accommodation.id), ["match", "unknown", "mismatch"]);
  assert.ok(ranked[1].confirmationConditions.length > 0);
  assert.ok(ranked[2].unmetConditions.includes("Wymaga skierowania."));
});
