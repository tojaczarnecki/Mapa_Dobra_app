import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicRecordKind,
  isPubliclyVisiblePlace,
  PUBLIC_RECORD_KINDS,
} from "../src/lib/places/public-visibility.ts";

test("public place visibility includes production and demo records", () => {
  assert.equal(isPublicRecordKind("PRODUCTION"), true);
  assert.equal(isPublicRecordKind("DEMO"), true);
  assert.deepEqual(PUBLIC_RECORD_KINDS, ["PRODUCTION", "DEMO"]);
});

test("public place visibility always excludes test records", () => {
  assert.equal(isPublicRecordKind("TEST"), false);
  assert.equal(PUBLIC_RECORD_KINDS.includes("TEST" as never), false);
  assert.equal(isPubliclyVisiblePlace({ recordKind: "TEST", publicationStatus: "PUBLISHED" }), false);
});

test("public place actions follow the same record and publication rules as loaders", () => {
  assert.equal(isPubliclyVisiblePlace({ recordKind: "PRODUCTION", publicationStatus: "PUBLISHED" }), true);
  assert.equal(isPubliclyVisiblePlace({ recordKind: "DEMO", publicationStatus: "TEMPORARILY_CLOSED" }), true);
  assert.equal(isPubliclyVisiblePlace({ recordKind: "PRODUCTION", publicationStatus: "DRAFT" }), false);
  assert.equal(isPubliclyVisiblePlace({ recordKind: "DEMO", publicationStatus: "ARCHIVED" }), false);
});

test("READY_TO_PUBLISH workflow never bypasses the DRAFT visibility rule", () => {
  assert.equal(isPubliclyVisiblePlace({ recordKind: "PRODUCTION", publicationStatus: "DRAFT" }), false);
});
