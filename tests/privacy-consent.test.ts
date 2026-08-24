import test from "node:test";
import assert from "node:assert/strict";
import { canLoadOptionalTechnologies, isConsentChoice } from "../src/lib/privacy/consent.ts";

test("no consent keeps optional technologies disabled", () => {
  assert.equal(canLoadOptionalTechnologies(null), false);
});

test("only necessary consent keeps optional technologies disabled", () => {
  assert.equal(canLoadOptionalTechnologies("necessary"), false);
});

test("all consent enables the optional consent gate", () => {
  assert.equal(canLoadOptionalTechnologies("all"), true);
});

test("consent choices accept only known values", () => {
  assert.equal(isConsentChoice("necessary"), true);
  assert.equal(isConsentChoice("all"), true);
  assert.equal(isConsentChoice("analytics"), false);
  assert.equal(isConsentChoice(null), false);
});
