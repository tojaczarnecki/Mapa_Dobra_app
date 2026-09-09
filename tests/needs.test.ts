import assert from "node:assert/strict";
import test from "node:test";
import { canDecideVolunteerResponse, confirmedCountAfterTransition, confirmedResponseCount, experienceRequirementLabel, needHasAvailableCapacity, remainingPeople, shouldReopenFilledNeed, statusAfterConfirmedResponse, validateNeedInput, validateVolunteerResponse } from "../src/lib/needs/validation.ts";
import { hasDuplicateVolunteerResponse, isResponseFormTooFast, isTurnstileVerificationSuccessful, normalizeContact } from "../src/lib/needs/anti-spam.ts";

const need = { title: "Pomoc przy kolacji", description: "Wydawanie ciepłego posiłku.", peopleNeeded: 3, startsAt: "2026-09-05T17:30", endsAt: "2026-09-05T20:00", experienceRequired: false };

test("need validation keeps the pilot focused and rejects invalid counts", () => {
  assert.equal(validateNeedInput(need).ok, true);
  assert.equal(validateNeedInput({ ...need, peopleNeeded: 0 }).ok, false);
  assert.equal(validateNeedInput({ ...need, endsAt: "2026-09-05T17:00" }).ok, false);
});

test("need experience label follows the stored boolean", () => {
  assert.equal(experienceRequirementLabel(true), "Wymagane doświadczenie");
  assert.equal(experienceRequirementLabel(false), "Bez doświadczenia");
});

test("volunteer response requires one contact method", () => {
  assert.equal(validateVolunteerResponse({ firstName: "Ania" }).ok, false);
  assert.equal(validateVolunteerResponse({ firstName: "Ania", email: "ania@example.org" }).ok, true);
  assert.equal(validateVolunteerResponse({ firstName: "Ania", phone: "123", email: "bad" }).ok, false);
});

test("volunteer response anti-spam checks keep autofill usable and normalize contacts", () => {
  assert.equal(isResponseFormTooFast(Date.parse("2026-09-05T10:00:00Z"), Date.parse("2026-09-05T10:00:01Z")), true);
  assert.equal(isResponseFormTooFast(Date.parse("2026-09-05T10:00:00Z"), Date.parse("2026-09-05T10:00:02Z")), false);
  assert.equal(normalizeContact(" +48 600 700 800 "), "48600700800");
  assert.equal(normalizeContact("ANIA@EXAMPLE.ORG"), "ania@example.org");
  assert.equal(hasDuplicateVolunteerResponse([{ phone: "+48 600 700 800", email: null }], { phone: "+48 600700800", email: null }), true);
  assert.equal(hasDuplicateVolunteerResponse([{ phone: null, email: "ania@example.org" }], { phone: null, email: "other@example.org" }), false);
  assert.equal(isTurnstileVerificationSuccessful({ success: true }), true);
  assert.equal(isTurnstileVerificationSuccessful({ success: false }), false);
});

test("only confirmed responses occupy the need limit", () => {
  assert.equal(confirmedResponseCount(["NEW", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED"]), 1);
  assert.equal(remainingPeople(3, 8), 0);
  assert.equal(remainingPeople(3, -4), 3);
});

test("a full need is not available for public listing or reopening", () => {
  assert.equal(needHasAvailableCapacity(1, 0), true);
  assert.equal(needHasAvailableCapacity(1, 1), false);
  assert.equal(needHasAvailableCapacity(2, 1), true);
  assert.equal(needHasAvailableCapacity(2, 2), false);
});

test("confirmed responses close a need exactly at its capacity", () => {
  assert.equal(statusAfterConfirmedResponse("PUBLISHED", 1, 1), "FILLED");
  assert.equal(statusAfterConfirmedResponse("PUBLISHED", 2, 1), "PUBLISHED");
  assert.equal(statusAfterConfirmedResponse("PUBLISHED", 2, 2), "FILLED");
  assert.equal(statusAfterConfirmedResponse("FILLED", 1, 1), "FILLED");
});

test("response status transitions update the confirmed count safely", () => {
  assert.equal(confirmedCountAfterTransition(0, "NEW", "CONFIRMED"), 1);
  assert.equal(confirmedCountAfterTransition(1, "NEW", "DECLINED"), 1);
  assert.equal(confirmedCountAfterTransition(1, "CONFIRMED", "NEW"), 0);
  assert.equal(confirmedCountAfterTransition(0, "DECLINED", "NEW"), 0);
});

test("filled need reopens only after undoing a confirmed response", () => {
  assert.equal(shouldReopenFilledNeed("FILLED", "CONFIRMED", "NEW", 1, 2), true);
  assert.equal(shouldReopenFilledNeed("FILLED", "CONFIRMED", "NEW", 2, 2), false);
  assert.equal(shouldReopenFilledNeed("FILLED", "DECLINED", "NEW", 1, 2), false);
});

test("reopened published need accepts a NEW response after a filled lifecycle", () => {
  assert.equal(canDecideVolunteerResponse("PUBLISHED", "NEW", "CONFIRMED"), true);
  assert.equal(canDecideVolunteerResponse("PUBLISHED", "NEW", "DECLINED"), true);
  assert.equal(canDecideVolunteerResponse("FILLED", "NEW", "CONFIRMED"), false);
  assert.equal(canDecideVolunteerResponse("PUBLISHED", "CONFIRMED", "CONFIRMED"), false);
});

test("confirmed and declined response undo paths preserve lifecycle counts", () => {
  const confirmedThenNew = confirmedCountAfterTransition(1, "CONFIRMED", "NEW");
  const declinedThenNew = confirmedCountAfterTransition(0, "DECLINED", "NEW");
  assert.equal(confirmedThenNew, 0);
  assert.equal(declinedThenNew, 0);
  assert.equal(canDecideVolunteerResponse("PUBLISHED", "NEW", "CONFIRMED"), true);
  assert.equal(canDecideVolunteerResponse("PUBLISHED", "NEW", "DECLINED"), true);
});
