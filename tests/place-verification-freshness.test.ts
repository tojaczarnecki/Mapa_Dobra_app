import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPlaceVerificationFreshness,
  placeVerificationNeedsAttention,
  placeVerificationNote,
} from "../src/lib/places/verification-freshness.ts";

const now = new Date("2026-08-27T12:00:00.000Z");

function daysAgo(days: number) {
  return new Date(now.getTime() - days * 86_400_000);
}

test("recent verified place is treated as fresh", () => {
  const freshness = classifyPlaceVerificationFreshness("VERIFIED", daysAgo(14), now);
  assert.equal(freshness, "fresh");
  assert.equal(placeVerificationNeedsAttention(freshness), false);
});

test("verified place older than 30 days asks for practical confirmation", () => {
  const freshness = classifyPlaceVerificationFreshness("VERIFIED", daysAgo(31), now);
  assert.equal(freshness, "review");
  assert.equal(placeVerificationNeedsAttention(freshness), true);
  assert.match(placeVerificationNote(freshness), /ponad 30 dni/u);
});

test("verified place older than 90 days is stale", () => {
  const freshness = classifyPlaceVerificationFreshness("VERIFIED", daysAgo(91), now);
  assert.equal(freshness, "stale");
  assert.equal(placeVerificationNeedsAttention(freshness), true);
  assert.match(placeVerificationNote(freshness), /ponad 90 dni/u);
});

test("missing timestamp or non-verified status never looks confirmed", () => {
  assert.equal(classifyPlaceVerificationFreshness("VERIFIED", null, now), "unverified");
  assert.equal(classifyPlaceVerificationFreshness("NEEDS_CONFIRMATION", daysAgo(1), now), "unverified");
});
