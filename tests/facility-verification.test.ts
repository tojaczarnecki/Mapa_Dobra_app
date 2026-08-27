import assert from "node:assert/strict";
import test from "node:test";
import { facilityVerificationBlockMessage, facilityVerificationGate } from "../src/lib/admin/facility-verification.ts";

test("published production places can be confirmed when no verification workflow is active", () => {
  assert.deepEqual(facilityVerificationGate("PRODUCTION", "PUBLISHED", null), { allowed: true, reason: null });
  assert.deepEqual(facilityVerificationGate("PRODUCTION", "PUBLISHED", "VERIFIED"), { allowed: true, reason: null });
  assert.deepEqual(facilityVerificationGate("PRODUCTION", "TEMPORARILY_CLOSED", null), { allowed: true, reason: null });
  assert.deepEqual(facilityVerificationGate("PRODUCTION", "PERMANENTLY_CLOSED", "VERIFIED"), { allowed: true, reason: null });
});

test("demo and test records cannot self-confirm freshness", () => {
  assert.deepEqual(facilityVerificationGate("DEMO", "PUBLISHED", null), { allowed: false, reason: "NOT_PRODUCTION" });
  assert.deepEqual(facilityVerificationGate("TEST", "PUBLISHED", null), { allowed: false, reason: "NOT_PRODUCTION" });
  assert.match(facilityVerificationBlockMessage("NOT_PRODUCTION"), /produkcyjnych/u);
});

test("draft and archived production places cannot self-confirm freshness", () => {
  assert.deepEqual(facilityVerificationGate("PRODUCTION", "DRAFT", null), { allowed: false, reason: "NOT_PUBLIC" });
  assert.deepEqual(facilityVerificationGate("PRODUCTION", "ARCHIVED", null), { allowed: false, reason: "NOT_PUBLIC" });
  assert.match(facilityVerificationBlockMessage("NOT_PUBLIC"), /opublikowanego/u);
});

test("active administrative verification blocks facility confirmation", () => {
  for (const status of ["PENDING", "IN_PROGRESS", "CONTACT_REQUIRED", "READY", "SKIPPED"] as const) {
    assert.deepEqual(facilityVerificationGate("PRODUCTION", "PUBLISHED", status), { allowed: false, reason: "ACTIVE_VERIFICATION" });
  }
  assert.match(facilityVerificationBlockMessage("ACTIVE_VERIFICATION"), /weryfikację administracyjną/u);
});
