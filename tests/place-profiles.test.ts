import assert from "node:assert/strict";
import test from "node:test";
import { inferPlaceProfileKind, orderPrimaryCategorySlugs, requiredProfileCategory } from "../src/lib/places/profile.ts";
import { emptyOpeningSchedule, validateOpeningSchedule } from "../src/lib/places/opening-hours.ts";

test("profile inference prefers food sharing over accommodation wording", () => {
  assert.equal(inferPlaceProfileKind({
    name: "Lodówka społeczna przy noclegowni",
    categorySlugs: ["lodowka-spoleczna"],
  }), "FOOD_SHARING");
  assert.equal(requiredProfileCategory("FOOD_SHARING"), "lodowka-spoleczna");
});

test("profile inference recognizes explicit mobile services only", () => {
  assert.equal(inferPlaceProfileKind({ name: "Mobilny punkt pomocy", categorySlugs: [] }), "MOBILE_SERVICE");
  assert.equal(inferPlaceProfileKind({ name: "Punkt higieny", categorySlugs: ["higiena"] }), "SUPPORT");
});

test("profile inference treats shelters and accommodation details as accommodation", () => {
  assert.equal(inferPlaceProfileKind({ name: "Schronisko dla osób w kryzysie", categorySlugs: [] }), "ACCOMMODATION");
  assert.equal(inferPlaceProfileKind({ name: "Punkt pomocy", categorySlugs: [], hasAccommodationDetails: true }), "ACCOMMODATION");
  assert.equal(requiredProfileCategory("ACCOMMODATION"), "nocleg");
});

test("primary category is persisted first without changing the selected set", () => {
  assert.deepEqual(orderPrimaryCategorySlugs(["jedzenie", "nocleg", "higiena"], "nocleg"), ["nocleg", "jedzenie", "higiena"]);
});

test("opening schedules support an explicit all-day state", () => {
  const days = emptyOpeningSchedule();
  days[0] = { ...days[0], status: "OPEN", allDay: true };
  const result = validateOpeningSchedule(days);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.days[0].allDay, true);
});

test("all-day opening cannot carry periods or a closed status", () => {
  const withPeriods = emptyOpeningSchedule();
  withPeriods[0] = { ...withPeriods[0], status: "OPEN", allDay: true, periods: [{ opensAt: "09:00", closesAt: "10:00" }] };
  assert.equal(validateOpeningSchedule(withPeriods).ok, false);

  const closed = emptyOpeningSchedule();
  closed[0] = { ...closed[0], status: "CLOSED", allDay: true };
  assert.equal(validateOpeningSchedule(closed).ok, false);
});
