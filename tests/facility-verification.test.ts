import assert from "node:assert/strict";
import test from "node:test";
import { facilityVerificationBlockMessage, facilityVerificationGate } from "../src/lib/admin/facility-verification.ts";

test("published places can be confirmed when no verification workflow is active", () => {
  assert.deepEqual(facilityVerificationGate("PUBLISHED", null), { allowed: true, reason: null });
  assert.deepEqual(facilityVerificationGate("PUBLISHED", "VERIFIED"), { allowed: true, reason: null });
  assert.deepEqual(facilityVerificationGate("TEMPORARILY_CLOSED", null), { allowed: true, reason: null });
  assert.deepEqual(facilityVerificationGate("PERMANENTLY_CLOSED", "VERIFIED"), { allowed: true, reason: null });
});

test("draft and archived places cannot self-confirm freshness", () => {
  assert.deepEqual(facilityVerificationGate("DRAFT", null), { allowed: false, reason: "NOT_PUBLIC" });
  assert.deepEqual(facilityVerificationGate("ARCHIVED", null), { allowed: false, reason: "NOT_PUBLIC" });
  assert.match(facilityVerificationBlockMessage("NOT_PUBLIC"), /opublikowanego/u);
});

test("active administrative verification blocks facility confirmation", () => {
  for (const status of ["PENDING", "IN_PROGRESS", "CONTACT_REQUIRED", "READY", "SKIPPED"] as const) {
    assert.deepEqual(facilityVerificationGate("PUBLISHED", status), { allowed: false, reason: "ACTIVE_VERIFICATION" });
  }
  assert.match(facilityVerificationBlockMessage("ACTIVE_VERIFICATION"), /weryfikację administracyjną/u);
});
