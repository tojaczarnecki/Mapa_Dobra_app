import assert from "node:assert/strict";
import test from "node:test";
import { retainPlaceIds, samePlaceIdSet } from "../src/lib/map/area.ts";

test("map area equality ignores marker ordering", () => {
  assert.equal(samePlaceIdSet(["a", "b", "c"], ["c", "a", "b"]), true);
  assert.equal(samePlaceIdSet(["a", "b"], ["a", "c"]), false);
  assert.equal(samePlaceIdSet(["a"], ["a", "b"]), false);
});

test("map area keeps only places still available after filters change", () => {
  assert.deepEqual(retainPlaceIds(["food-1", "night-1", "food-2"], ["food-2", "food-1"]), ["food-1", "food-2"]);
});
