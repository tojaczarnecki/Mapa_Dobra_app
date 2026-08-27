import assert from "node:assert/strict";
import test from "node:test";
import { accessTokenExpiry, hashAccessToken, isUsableAccessToken } from "../src/lib/admin/access-tokens.ts";
import {
  canChangeAdminIdentity,
  hasPlaceScopedPermission,
  placeScopedPermissions,
  resolveEffectivePermissions,
  roleDefaultPermissions,
} from "../src/lib/admin/permissions.ts";

test("role defaults keep place manager operational and moderator unable to publish", () => {
  assert.deepEqual(roleDefaultPermissions.PLACE_MANAGER, ["VIEW_DASHBOARD"]);
  assert.equal(roleDefaultPermissions.MODERATOR.includes("VERIFY_PLACES"), true);
  assert.equal(roleDefaultPermissions.MODERATOR.includes("PUBLISH_PLACES"), false);
});

test("individual ALLOW and DENY override a role immediately", () => {
  const permissions = resolveEffectivePermissions("MODERATOR", [
    { permission: "PUBLISH_PLACES", effect: "ALLOW" },
    { permission: "EDIT_PLACES", effect: "DENY" },
  ]);
  assert.equal(permissions.includes("PUBLISH_PLACES"), true);
  assert.equal(permissions.includes("EDIT_PLACES"), false);
});

test("place access never grants access to another place", () => {
  const assignment = { active: true, permissions: ["VIEW_PLACES", "UPDATE_BED_AVAILABILITY"] as const };
  assert.equal(hasPlaceScopedPermission([], assignment, "UPDATE_BED_AVAILABILITY"), true);
  assert.equal(hasPlaceScopedPermission([], null, "UPDATE_BED_AVAILABILITY"), false);
  assert.equal(hasPlaceScopedPermission([], { ...assignment, active: false }, "UPDATE_BED_AVAILABILITY"), false);
  assert.equal(hasPlaceScopedPermission([], assignment, "PUBLISH_PLACES"), false);
});

test("place-scoped verification can be explicitly delegated without publication rights", () => {
  const assignment = { active: true, permissions: ["VIEW_PLACES", "VERIFY_PLACES"] as const };
  assert.equal(placeScopedPermissions.includes("VERIFY_PLACES"), true);
  assert.equal(hasPlaceScopedPermission([], assignment, "VERIFY_PLACES"), true);
  assert.equal(hasPlaceScopedPermission([], assignment, "PUBLISH_PLACES"), false);
  assert.equal(roleDefaultPermissions.PLACE_MANAGER.includes("VERIFY_PLACES"), false);
});

test("place-scoped permissions exclude global administration rights", () => {
  assert.equal(placeScopedPermissions.includes("UPDATE_BED_AVAILABILITY"), true);
  assert.equal(placeScopedPermissions.includes("MANAGE_USERS"), false);
  assert.equal(placeScopedPermissions.includes("PUBLISH_PLACES"), false);
});

test("the last active super administrator cannot be removed", () => {
  assert.equal(canChangeAdminIdentity({ activeSuperAdminCount: 1, targetIsActiveSuperAdmin: true, nextRole: "ADMIN", nextActive: true }), false);
  assert.equal(canChangeAdminIdentity({ activeSuperAdminCount: 1, targetIsActiveSuperAdmin: true, nextRole: "SUPER_ADMIN", nextActive: false }), false);
  assert.equal(canChangeAdminIdentity({ activeSuperAdminCount: 2, targetIsActiveSuperAdmin: true, nextRole: "ADMIN", nextActive: true }), true);
});

test("invitation and reset tokens are hashed, expiring and one-use", () => {
  assert.equal(hashAccessToken("secret-token"), hashAccessToken("secret-token"));
  assert.notEqual(hashAccessToken("secret-token"), "secret-token");
  const now = new Date("2026-08-18T10:00:00Z");
  const expiry = accessTokenExpiry("INVITATION", now);
  assert.equal(expiry.getTime() - now.getTime(), 48 * 60 * 60 * 1000);
  assert.equal(isUsableAccessToken({ usedAt: null, expiresAt: expiry }, now), true);
  assert.equal(isUsableAccessToken({ usedAt: now, expiresAt: expiry }, now), false);
  assert.equal(isUsableAccessToken({ usedAt: null, expiresAt: now }, now), false);
});
