import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/lib/admin/password.ts";
import {
  consumeLoginAttempt,
  resetLoginAttempts,
} from "../src/lib/admin/rate-limit.ts";
import {
  canTransitionModerationStatus,
  parseModerationInput,
} from "../src/lib/admin/validation.ts";

test("admin passwords are salted and verified with scrypt", async () => {
  const password = "Very-long-test-password-123";
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.match(firstHash, /^scrypt\$/u);
  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword("wrong-password-123", firstHash), false);
  assert.equal(await verifyPassword(password, "malformed"), false);
});

test("login limiter blocks the sixth attempt in a window", () => {
  const key = `test-${crypto.randomUUID()}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(consumeLoginAttempt(key, 1_000).allowed, true);
  }
  assert.equal(consumeLoginAttempt(key, 1_000).allowed, false);
  resetLoginAttempts(key);
});

test("moderation transitions only allow unfinished submissions", () => {
  assert.equal(canTransitionModerationStatus("PENDING", "UNDER_REVIEW"), true);
  assert.equal(canTransitionModerationStatus("PENDING", "APPROVED"), true);
  assert.equal(canTransitionModerationStatus("UNDER_REVIEW", "REJECTED"), true);
  assert.equal(canTransitionModerationStatus("APPROVED", "REJECTED"), false);
  assert.equal(canTransitionModerationStatus("REJECTED", "APPROVED"), false);
});

test("rejection requires a short reason and approval note remains optional", () => {
  assert.equal(parseModerationInput({ targetStatus: "REJECTED", note: "" }), null);
  assert.deepEqual(
    parseModerationInput({ targetStatus: "REJECTED", note: "Nie można potwierdzić źródła." }),
    { targetStatus: "REJECTED", note: "Nie można potwierdzić źródła." },
  );
  assert.deepEqual(parseModerationInput({ targetStatus: "APPROVED", note: "" }), {
    targetStatus: "APPROVED",
    note: "",
  });
});
