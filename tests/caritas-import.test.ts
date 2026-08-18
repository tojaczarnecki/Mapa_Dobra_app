import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCaritasCandidates,
  CARITAS_GDZIE_IMPORT,
  normalizeAddress,
  type SourceEntry,
} from "../src/lib/imports/caritas-gdzie-parser.ts";

function entry(overrides: Partial<SourceEntry> & Pick<SourceEntry, "sourceKey" | "rawName">): SourceEntry {
  return {
    section: "Gdzie zjeść",
    sourcePages: [14],
    rawAddress: "ul. Wólczańska 108, Łódź",
    rawPhone: "42 637 53 50",
    rawEmail: null,
    rawWebsite: null,
    rawOpeningHours: "poniedziałek - piątek 9:00-12:00",
    rawAdmissionHours: null,
    rawAssistanceDescription: "pomoc doraźna",
    rawText: "pozycja źródłowa",
    categoryHints: ["jedzenie"],
    targetGroupHints: [],
    ...overrides,
  };
}

test("Caritas import metadata identifies the stable source batch", () => {
  assert.equal(CARITAS_GDZIE_IMPORT.key, "CARITAS_GDZIE_2025_2026");
  assert.equal(CARITAS_GDZIE_IMPORT.edition, "2025/2026");
  assert.match(CARITAS_GDZIE_IMPORT.sourceUrl, /GDZIE-przewodnik-po-Lodzi-2025\.pdf$/);
});

test("same physical place from multiple sections is merged and keeps all categories", () => {
  const candidates = buildCaritasCandidates([
    entry({ sourceKey: "food-4", rawName: "Caritas Archidiecezji Łódzkiej - Punkt Pomocy Charytatywnej" }),
    entry({ sourceKey: "clothing-1", rawName: "Caritas Archidiecezji Łódzkiej - Punkt Pomocy Charytatywnej", section: "Gdzie się ubrać", categoryHints: ["odziez"] }),
  ]);
  assert.equal(candidates.length, 1);
  assert.deepEqual(new Set(candidates[0].sourceKeys), new Set(["food-4", "clothing-1"]));
  assert.ok(candidates[0].categorySlugs.includes("jedzenie"));
  assert.ok(candidates[0].categorySlugs.includes("odziez"));
});

test("same address alone never merges distinct services", () => {
  const candidates = buildCaritasCandidates([
    entry({ sourceKey: "service-a", rawName: "Punkt A" }),
    entry({ sourceKey: "service-b", rawName: "Punkt B" }),
  ]);
  assert.equal(candidates.length, 2);
});

test("accommodation capacity does not become available capacity", () => {
  const [candidate] = buildCaritasCandidates([
    entry({
      sourceKey: "sleep-men-10",
      rawName: "Dom Wspólnotowy",
      section: "Gdzie spać - mężczyźni",
      categoryHints: ["nocleg"],
      targetGroupHints: ["Mężczyźni"],
      rawAssistanceDescription: "zakwaterowanie stałe, 26 miejsc",
    }),
  ]);
  const accommodation = candidate.proposedData.accommodation as { availabilityState: string; capacityGroups: Array<{ totalBeds: number; availableBeds: number | null }> };
  assert.equal(accommodation.availabilityState, "UNKNOWN");
  assert.equal(accommodation.capacityGroups[0].totalBeds, 26);
  assert.equal(accommodation.capacityGroups[0].availableBeds, null);
});

test("unknown qualifying data stays UNKNOWN and mobile service requires review", () => {
  const [candidate] = buildCaritasCandidates([
    entry({ sourceKey: "food-12", rawName: "Autobus dla osób potrzebujących", rawAddress: null, rawOpeningHours: null }),
  ]);
  const requirements = candidate.proposedData.requirements as Array<{ kind: string; state: string }>;
  assert.ok(requirements.filter((item) => item.kind !== "APPOINTMENT").every((item) => item.state === "UNKNOWN"));
  assert.ok(candidate.reviewReasons.some((reason) => reason.includes("mobilna")));
  assert.ok(candidate.reviewReasons.some((reason) => reason.includes("adresu")));
});

test("address normalization handles common source variants without inventing coordinates", () => {
  assert.equal(normalizeAddress("ul. K.I. Gałczyńskiego 7, Łódź"), normalizeAddress("Gałczyńskiego 7"));
  const [candidate] = buildCaritasCandidates([entry({ sourceKey: "one", rawName: "Punkt" })]);
  assert.equal("latitude" in candidate.proposedData, false);
  assert.equal("longitude" in candidate.proposedData, false);
});
