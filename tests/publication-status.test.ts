import assert from "node:assert/strict";
import test from "node:test";
import {
  requiresOperationalStatusOnRepublish,
  validatePlaceStatusCombination,
} from "../src/lib/places/publication-status.ts";

test("closed publication state requires CLOSED operational state", () => {
  assert.equal(validatePlaceStatusCombination("TEMPORARILY_CLOSED", "OPEN").ok, false);
  assert.equal(validatePlaceStatusCombination("PERMANENTLY_CLOSED", "UNKNOWN").ok, false);
  assert.equal(validatePlaceStatusCombination("TEMPORARILY_CLOSED", "CLOSED").ok, true);
});

test("republishing a closed place requires an explicit operational choice", () => {
  assert.equal(requiresOperationalStatusOnRepublish("TEMPORARILY_CLOSED", "PUBLISHED"), true);
  assert.equal(requiresOperationalStatusOnRepublish("PERMANENTLY_CLOSED", "PUBLISHED"), true);
  assert.equal(requiresOperationalStatusOnRepublish("DRAFT", "PUBLISHED"), false);
});

test("UNKNOWN remains valid for a normally published place", () => {
  assert.equal(validatePlaceStatusCombination("PUBLISHED", "UNKNOWN").ok, true);
});
