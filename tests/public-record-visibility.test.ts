import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicRecordKind,
  isPubliclyVisiblePlace,
  publicRecordKindsForEnvironment,
} from "../src/lib/places/public-visibility.ts";

test("development visibility includes production and demo records", () => {
  assert.equal(isPublicRecordKind("PRODUCTION", "development"), true);
  assert.equal(isPublicRecordKind("DEMO", "development"), true);
  assert.deepEqual(publicRecordKindsForEnvironment("development"), ["PRODUCTION", "DEMO"]);
});

test("public place visibility always excludes test records", () => {
  assert.equal(isPublicRecordKind("TEST", "development"), false);
  assert.equal(isPublicRecordKind("TEST", "production"), false);
});

test("production visibility fails closed and only includes published production records", () => {
  assert.deepEqual(publicRecordKindsForEnvironment("production"), ["PRODUCTION"]);
  assert.deepEqual(publicRecordKindsForEnvironment(undefined), ["PRODUCTION"]);
  assert.deepEqual(publicRecordKindsForEnvironment("unexpected"), ["PRODUCTION"]);
  assert.equal(isPubliclyVisiblePlace({ recordKind: "PRODUCTION", publicationStatus: "PUBLISHED" }, "production"), true);
  assert.equal(isPubliclyVisiblePlace({ recordKind: "DEMO", publicationStatus: "PUBLISHED" }, "production"), false);
  assert.equal(isPubliclyVisiblePlace({ recordKind: "TEST", publicationStatus: "PUBLISHED" }, "production"), false);
  assert.equal(isPubliclyVisiblePlace({ recordKind: "PRODUCTION", publicationStatus: "DRAFT" }, "production"), false);
});

test("READY_TO_PUBLISH workflow never bypasses the DRAFT visibility rule", () => {
  assert.equal(isPubliclyVisiblePlace({ recordKind: "PRODUCTION", publicationStatus: "DRAFT" }, "development"), false);
});
