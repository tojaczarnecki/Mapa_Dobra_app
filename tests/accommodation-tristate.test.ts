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
    partyProfile: "man",
    needs: ["noReferral"],
    },
  );

  assert.deepEqual(result.unmetConditions, []);
  assert.ok(result.confirmationConditions.includes("Wymóg skierowania wymaga potwierdzenia."));
});

test("unknown accessibility and pet policy remain confirmation conditions", () => {
  const result = getAccommodationConditions(accommodation("unknown-details"), {
    partyProfile: "man",
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
    { partyProfile: "man", needs: ["noReferral"] },
  );

  assert.deepEqual(ranked.map((item) => item.accommodation.id), ["match", "unknown", "mismatch"]);
  assert.ok(ranked[1].confirmationConditions.length > 0);
  assert.ok(ranked[2].unmetConditions.includes("Wymaga skierowania."));
});

test("party profiles remain separate from the disability profile stored by places", () => {
  const result = getAccommodationConditions(
    accommodation("disability-only", { acceptedProfiles: ["disability", "other"] }),
    { partyProfile: "woman", needs: [] },
  );
  assert.deepEqual(result.unmetConditions, []);
  assert.ok(result.confirmationConditions.includes("Grupa odbiorców tego miejsca wymaga potwierdzenia."));

  const compatible = getAccommodationConditions(
    accommodation("woman-with-disability", { acceptedProfiles: ["disability", "woman"], accessibility: "YES" }),
    { partyProfile: "woman", wheelchair: "yes", needs: [] },
  );
  assert.deepEqual(compatible.unmetConditions, []);
  assert.deepEqual(compatible.confirmationConditions, []);
});

test("all supported party profiles map to the existing acceptedProfiles values", () => {
  for (const partyProfile of ["woman", "man", "womanWithChildren", "family", "other"] as const) {
    const result = getAccommodationConditions(
      accommodation(partyProfile, { acceptedProfiles: [partyProfile] }),
      { partyProfile, needs: [] },
    );
    assert.deepEqual(result.unmetConditions, []);
  }
});

test("specific care and accessibility needs remain independent criteria", () => {
  const result = getAccommodationConditions(
    accommodation("needs", { acceptedProfiles: ["woman"], accessibility: "YES", careServices: "YES", partialDependencySupport: "YES" }),
    { partyProfile: "woman", wheelchair: "yes", needs: ["careServices", "partialDependency"] },
  );
  assert.deepEqual(result.unmetConditions, []);
  assert.deepEqual(result.confirmationConditions, []);
});

test("hard mismatches are excluded while UNKNOWN remains a safe confirmation fallback", () => {
  const woman = { partyProfile: "woman" as const, needs: [] };
  const maleOnly = accommodation("male-only", { acceptedProfiles: ["man"] });
  const unknown = accommodation("unknown-profile", { acceptedProfiles: ["disability", "other"] });
  const ranked = rankAccommodations([maleOnly, unknown], woman);

  assert.equal(ranked.find((item) => item.accommodation.id === "male-only")?.hardMismatch, true);
  assert.equal(ranked.find((item) => item.accommodation.id === "unknown-profile")?.hardMismatch, false);
  assert.ok(ranked.find((item) => item.accommodation.id === "unknown-profile")?.confirmationConditions.length);
});

test("confirmed pet and accessibility conflicts are hard mismatches", () => {
  assert.equal(
    rankAccommodations([accommodation("no-dog", { petPolicy: "NOT_ACCEPTED" })], { partyProfile: "man", pet: "dog", needs: [] })[0].hardMismatch,
    true,
  );
  assert.equal(
    rankAccommodations([accommodation("no-wheelchair", { accessibility: "NO" })], { partyProfile: "man", wheelchair: "yes", needs: [] })[0].hardMismatch,
    true,
  );
});
