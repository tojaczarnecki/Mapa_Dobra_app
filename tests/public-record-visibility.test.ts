import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicRecordKind,
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
});
