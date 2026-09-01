import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCOMMODATION_WIZARD_STORAGE_KEY,
  LEGACY_ACCOMMODATION_WIZARD_STORAGE_KEY,
  clearAccommodationWizardState,
  getAccommodationWizardProgress,
  parseAccommodationWizardState,
  serializeAccommodationWizardState,
} from "../src/lib/accommodations/wizard-state.ts";

const state = {
  version: 3 as const,
  step: 3,
  answers: { partyProfile: "woman" as const, wheelchair: "unknown" as const, needs: ["noDocuments" as const] },
  showResults: true,
};

test("wizard state round-trips answers, step and result visibility", () => {
  assert.deepEqual(parseAccommodationWizardState(serializeAccommodationWizardState(state)), state);
});

test("invalid wizard storage is ignored and does not invent answers", () => {
  assert.equal(parseAccommodationWizardState("not-json"), null);
  assert.equal(parseAccommodationWizardState(JSON.stringify({ version: 2, step: 1, answers: { partyProfile: "woman", needs: [] } })), null);
  assert.equal(parseAccommodationWizardState(JSON.stringify({ step: -1, answers: {} })), null);
  assert.equal(parseAccommodationWizardState(JSON.stringify({ step: 1, answers: { needs: ["unsupported"] }, showResults: false })), null);
});

test("incompatible profile values are ignored rather than migrated", () => {
  assert.deepEqual(parseAccommodationWizardState(JSON.stringify({ version: 3, step: 0, answers: { partyProfile: "disability", needs: [] } })), {
    version: 3,
    step: 0,
    answers: { needs: [] },
    showResults: false,
  });
});

test("reset removes only the accommodation wizard state", () => {
  const removed: string[] = [];
  clearAccommodationWizardState({ removeItem: (key) => removed.push(key) });
  assert.deepEqual(removed, [ACCOMMODATION_WIZARD_STORAGE_KEY, LEGACY_ACCOMMODATION_WIZARD_STORAGE_KEY, "mapa-dobra:accommodation-wizard:v1"]);
});

test("wizard progress includes the conditional pet step immediately", () => {
  assert.equal(getAccommodationWizardProgress(1, false), "Krok 2 z 2");
  assert.equal(getAccommodationWizardProgress(1, true), "Krok 2 z 3");
  assert.equal(getAccommodationWizardProgress(2, true), "Krok 3 z 3");
});
