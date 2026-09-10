import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldReopenFilledNeed,
  statusAfterCapacityEdit,
  statusAfterConfirmedResponse,
} from "../src/lib/needs/validation.ts";

test("editing a published need below the confirmed count is rejected", () => {
  assert.deepEqual(statusAfterCapacityEdit("PUBLISHED", 2, 3), {
    ok: false,
    reason: "BELOW_CONFIRMED",
  });
});

test("editing a published need down to the confirmed count closes it as filled", () => {
  assert.deepEqual(statusAfterCapacityEdit("PUBLISHED", 3, 3), {
    ok: true,
    status: "FILLED",
  });
});

test("editing a published need with remaining capacity keeps it published", () => {
  assert.deepEqual(statusAfterCapacityEdit("PUBLISHED", 4, 3), {
    ok: true,
    status: "PUBLISHED",
  });
});

test("editing a filled need does not silently reopen it", () => {
  assert.deepEqual(statusAfterCapacityEdit("FILLED", 5, 3), {
    ok: true,
    status: "FILLED",
  });
});

test("the last confirmed response turns a published need into filled", () => {
  assert.equal(statusAfterConfirmedResponse("PUBLISHED", 3, 3), "FILLED");
  assert.equal(statusAfterConfirmedResponse("PUBLISHED", 3, 2), "PUBLISHED");
});

test("undoing a confirmed response reopens a filled need only when capacity becomes available", () => {
  assert.equal(shouldReopenFilledNeed("FILLED", "CONFIRMED", "NEW", 2, 3), true);
  assert.equal(shouldReopenFilledNeed("FILLED", "DECLINED", "NEW", 2, 3), false);
  assert.equal(shouldReopenFilledNeed("CANCELLED", "CONFIRMED", "NEW", 2, 3), false);
});
