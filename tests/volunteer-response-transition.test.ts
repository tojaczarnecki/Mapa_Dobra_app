import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionVolunteerResponse } from "../src/lib/needs/validation.ts";

test("new response can only be confirmed or declined", () => {
  assert.equal(canTransitionVolunteerResponse("NEW", "CONFIRMED"), true);
  assert.equal(canTransitionVolunteerResponse("NEW", "DECLINED"), true);
  assert.equal(canTransitionVolunteerResponse("NEW", "NEW"), false);
  assert.equal(canTransitionVolunteerResponse("NEW", "CANCELLED"), false);
  assert.equal(canTransitionVolunteerResponse("NEW", "COMPLETED"), false);
});

test("confirmed and declined decisions can be undone back to new", () => {
  assert.equal(canTransitionVolunteerResponse("CONFIRMED", "NEW"), true);
  assert.equal(canTransitionVolunteerResponse("DECLINED", "NEW"), true);
  assert.equal(canTransitionVolunteerResponse("CONFIRMED", "DECLINED"), false);
  assert.equal(canTransitionVolunteerResponse("DECLINED", "CONFIRMED"), false);
});

test("cancelled and completed responses remain terminal until their workflow is explicitly designed", () => {
  for (const current of ["CANCELLED", "COMPLETED"]) {
    for (const next of ["NEW", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED"]) {
      assert.equal(canTransitionVolunteerResponse(current, next), false);
    }
  }
});
