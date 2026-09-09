import assert from "node:assert/strict";
import test from "node:test";
import { needSignupClosedMessage, resolveNeedSignupAvailability } from "../src/lib/needs/availability.ts";

const now = new Date("2026-09-09T12:00:00.000Z");

function need(overrides: Partial<{ status: string; endsAt: Date; signupDeadline: Date | null }> = {}) {
  return {
    status: "PUBLISHED",
    endsAt: new Date("2026-09-10T12:00:00.000Z"),
    signupDeadline: new Date("2026-09-09T18:00:00.000Z"),
    ...overrides,
  };
}

test("signup is open before the optional deadline", () => {
  assert.deepEqual(resolveNeedSignupAvailability(need(), now), { open: true });
});

test("signup closes exactly at signupDeadline", () => {
  const deadline = new Date(now);
  assert.deepEqual(
    resolveNeedSignupAvailability(need({ signupDeadline: deadline }), now),
    { open: false, reason: "SIGNUP_DEADLINE_PASSED" },
  );
});

test("signup stays closed after signupDeadline even when the activity is still in the future", () => {
  assert.deepEqual(
    resolveNeedSignupAvailability(
      need({ signupDeadline: new Date("2026-09-09T11:59:59.000Z") }),
      now,
    ),
    { open: false, reason: "SIGNUP_DEADLINE_PASSED" },
  );
});

test("need without signupDeadline remains open until the activity ends", () => {
  assert.deepEqual(
    resolveNeedSignupAvailability(need({ signupDeadline: null }), now),
    { open: true },
  );
});

test("signup closes exactly when the activity ends", () => {
  assert.deepEqual(
    resolveNeedSignupAvailability(
      need({ signupDeadline: null, endsAt: new Date(now) }),
      now,
    ),
    { open: false, reason: "ENDED" },
  );
});

test("unpublished need cannot accept responses", () => {
  assert.deepEqual(
    resolveNeedSignupAvailability(need({ status: "DRAFT", signupDeadline: null }), now),
    { open: false, reason: "NOT_PUBLISHED" },
  );
});

test("signup deadline has a specific public message", () => {
  assert.equal(
    needSignupClosedMessage("SIGNUP_DEADLINE_PASSED"),
    "Zapisy do tej potrzeby zostały zakończone.",
  );
});
