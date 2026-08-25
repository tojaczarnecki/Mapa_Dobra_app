import assert from "node:assert/strict";
import test from "node:test";
import { hasImpossibleFormTiming } from "../src/lib/security/form-timing.ts";

test("form timing accepts omitted and realistic timestamps", () => {
  const now = 1_000_000;
  assert.equal(hasImpossibleFormTiming(undefined, now), false);
  assert.equal(hasImpossibleFormTiming(now - 2_000, now), false);
});

test("form timing rejects instant and stale timestamps", () => {
  const now = 1_000_000;
  assert.equal(hasImpossibleFormTiming(now - 100, now), true);
  assert.equal(hasImpossibleFormTiming(now - 8 * 24 * 60 * 60 * 1000, now), true);
  assert.equal(hasImpossibleFormTiming("not-a-timestamp", now), true);
});
