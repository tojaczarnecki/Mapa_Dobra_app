import assert from "node:assert/strict";
import test from "node:test";
import { validateNeedInput } from "../src/lib/needs/validation.ts";

function validNeed(overrides: Record<string, unknown> = {}) {
  return {
    title: "Pomoc przy wydawaniu posiłków",
    description: "Potrzebujemy wsparcia przy przygotowaniu i wydawaniu posiłków.",
    peopleNeeded: 3,
    startsAt: "2026-09-10T10:00:00.000Z",
    endsAt: "2026-09-10T14:00:00.000Z",
    signupDeadline: "2026-09-10T09:00:00.000Z",
    experienceRequired: false,
    requirements: "",
    locationNote: "",
    ...overrides,
  };
}

test("need accepts signup deadline before activity end", () => {
  const result = validateNeedInput(validNeed());
  assert.equal(result.ok, true);
});

test("need rejects signup deadline after activity end", () => {
  const result = validateNeedInput(validNeed({ signupDeadline: "2026-09-10T15:00:00.000Z" }));
  assert.deepEqual(result, {
    ok: false,
    message: "Termin zgłoszeń nie może przypadać po zakończeniu potrzeby.",
  });
});

test("need may omit signup deadline", () => {
  const result = validateNeedInput(validNeed({ signupDeadline: "" }));
  assert.equal(result.ok, true);
});
