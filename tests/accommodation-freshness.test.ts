import assert from "node:assert/strict";
import test from "node:test";
import { ACCOMMODATION_FRESHNESS_LIMIT_MS, resolveAvailabilityState } from "../src/lib/accommodations/freshness.ts";

const now = new Date("2026-08-18T12:00:00Z");
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);

test("fresh availability remains current before and at the 24 hour threshold", () => {
  assert.equal(resolveAvailabilityState("AVAILABLE", ago(5 * 60_000), now), "AVAILABLE");
  assert.equal(resolveAvailabilityState("FEW", ago(6 * 60 * 60_000), now), "FEW");
  assert.equal(resolveAvailabilityState("AVAILABLE", ago(ACCOMMODATION_FRESHNESS_LIMIT_MS), now), "AVAILABLE");
});

test("availability older than 24 hours or without a timestamp becomes stale", () => {
  assert.equal(resolveAvailabilityState("AVAILABLE", ago(ACCOMMODATION_FRESHNESS_LIMIT_MS + 1), now), "STALE");
  assert.equal(resolveAvailabilityState("FEW", ago(7 * 24 * 60 * 60_000), now), "STALE");
  assert.equal(resolveAvailabilityState("FULL", null, now), "STALE");
});

test("explicit unknown, stale and suspended states are preserved", () => {
  assert.equal(resolveAvailabilityState("UNKNOWN", ago(5 * 60_000), now), "UNKNOWN");
  assert.equal(resolveAvailabilityState("STALE", ago(5 * 60_000), now), "STALE");
  assert.equal(resolveAvailabilityState("SUSPENDED", ago(7 * 24 * 60 * 60_000), now), "SUSPENDED");
});
