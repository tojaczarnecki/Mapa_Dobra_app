import assert from "node:assert/strict";
import test from "node:test";
import { isValidOrganizationDecision, resolveEffectiveOrganization } from "../src/lib/imports/organization-decisions.ts";

test("NEW_CANDIDATE and POSSIBLE remain unresolved without an admin decision", () => {
  for (const status of ["NEW_CANDIDATE", "POSSIBLE"] as const) {
    assert.deepEqual(resolveEffectiveOrganization({ status, organizationId: null }), { status: "UNRESOLVED", organizationId: null });
  }
});

test("NONE resolves to no organization without persisting a decision", () => {
  assert.deepEqual(resolveEffectiveOrganization({ status: "NONE", organizationId: null }), { status: "NO_ORGANIZATION", organizationId: null });
});

test("active MATCHED organization is used and inactive match is blocked", () => {
  const analysis = { status: "MATCHED" as const, organizationId: "org-1" };
  assert.deepEqual(resolveEffectiveOrganization(analysis, null, { id: "org-1", active: true }), { status: "USE_MATCHED_ORGANIZATION", organizationId: "org-1" });
  assert.deepEqual(resolveEffectiveOrganization(analysis, null, { id: "org-1", active: false }), { status: "BLOCKED_INACTIVE_MATCH", organizationId: "org-1" });
});

test("admin decisions override unresolved analysis only when selected organization is active", () => {
  const analysis = { status: "NEW_CANDIDATE" as const, organizationId: null };
  assert.deepEqual(resolveEffectiveOrganization(analysis, { decision: "SELECTED_ORGANIZATION", organizationId: "org-2" }, { id: "org-2", active: true }), { status: "USE_SELECTED_ORGANIZATION", organizationId: "org-2" });
  assert.deepEqual(resolveEffectiveOrganization(analysis, { decision: "SELECTED_ORGANIZATION", organizationId: "org-2" }, { id: "org-2", active: false }), { status: "BLOCKED_INACTIVE_MATCH", organizationId: "org-2" });
  assert.deepEqual(resolveEffectiveOrganization(analysis, { decision: "NO_ORGANIZATION", organizationId: null }), { status: "NO_ORGANIZATION", organizationId: null });
});

test("organization decision invariant mirrors the database CHECK", () => {
  assert.equal(isValidOrganizationDecision({ decision: "SELECTED_ORGANIZATION", organizationId: "org-1" }), true);
  assert.equal(isValidOrganizationDecision({ decision: "SELECTED_ORGANIZATION", organizationId: "" }), false);
  assert.equal(isValidOrganizationDecision({ decision: "NO_ORGANIZATION", organizationId: null }), true);
  assert.equal(isValidOrganizationDecision({ decision: "NO_ORGANIZATION", organizationId: "org-1" }), false);
});
