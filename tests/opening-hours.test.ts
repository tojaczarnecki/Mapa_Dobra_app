import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyOpeningSchedule,
  openingRows,
  validateOpeningSchedule,
} from "../src/lib/places/opening-hours.ts";

test("opening hours accept and sort multiple intervals", () => {
  const days = emptyOpeningSchedule();
  days[0] = {
    weekday: "MONDAY",
    status: "OPEN",
    periods: [
      { opensAt: "14:00", closesAt: "18:00" },
      { opensAt: "08:00", closesAt: "12:00" },
    ],
    note: "",
  };
  const result = validateOpeningSchedule(days);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.days[0].periods, [
    { opensAt: "08:00", closesAt: "12:00" },
    { opensAt: "14:00", closesAt: "18:00" },
  ]);
});

test("opening hours reject overlapping and duplicate intervals", () => {
  const overlapping = emptyOpeningSchedule();
  overlapping[0] = { weekday: "MONDAY", status: "OPEN", periods: [
    { opensAt: "08:00", closesAt: "14:00" },
    { opensAt: "13:00", closesAt: "17:00" },
  ], note: "" };
  const overlapResult = validateOpeningSchedule(overlapping);
  assert.equal(overlapResult.ok, false);
  if (!overlapResult.ok) assert.match(overlapResult.error, /nakładają/u);

  const duplicate = emptyOpeningSchedule();
  duplicate[0] = { weekday: "MONDAY", status: "OPEN", periods: [
    { opensAt: "08:00", closesAt: "14:00" },
    { opensAt: "08:00", closesAt: "14:00" },
  ], note: "" };
  const duplicateResult = validateOpeningSchedule(duplicate);
  assert.equal(duplicateResult.ok, false);
  if (!duplicateResult.ok) assert.match(duplicateResult.error, /więcej niż raz/u);
});

test("CLOSED cannot contain active periods and UNKNOWN stays distinct", () => {
  const closed = emptyOpeningSchedule();
  closed[0] = { weekday: "MONDAY", status: "CLOSED", periods: [{ opensAt: "08:00", closesAt: "12:00" }], note: "" };
  assert.equal(validateOpeningSchedule(closed).ok, false);

  const unknown = emptyOpeningSchedule();
  unknown[0].note = "Godziny wymagają potwierdzenia";
  const result = validateOpeningSchedule(unknown);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.days[0].status, "UNKNOWN");
    assert.equal(openingRows(result.days, "OPERATION")[0].status, "UNKNOWN");
  }
});

test("opening hours reject start at or after end", () => {
  const days = emptyOpeningSchedule();
  days[0] = { weekday: "MONDAY", status: "OPEN", periods: [{ opensAt: "16:00", closesAt: "08:00" }], note: "" };
  const result = validateOpeningSchedule(days);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /wcześniejsza/u);
});
