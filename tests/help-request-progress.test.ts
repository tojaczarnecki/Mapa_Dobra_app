import assert from "node:assert/strict";
import test from "node:test";
import { conceptualHelpRequestProgress } from "../src/lib/help-requests/progress.ts";

test("location sub-screens stay on conceptual step 2", () => {
  assert.equal(conceptualHelpRequestProgress(2, true), 2);
  assert.equal(conceptualHelpRequestProgress(3, true), 2);
  assert.equal(conceptualHelpRequestProgress(4, true), 2);
  assert.equal(conceptualHelpRequestProgress(8, true), 2);
});

test("situation, description and review progress monotonically", () => {
  assert.equal(conceptualHelpRequestProgress(5, true), 3);
  assert.equal(conceptualHelpRequestProgress(6, true), 4);
  assert.equal(conceptualHelpRequestProgress(7, true), 5);
});

test("final success remains at completed conceptual step", () => {
  assert.equal(conceptualHelpRequestProgress(8, false), 5);
});
