import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMobileSchedule,
  isAnnualDateInRange,
  isMobileSeasonActive,
} from "../src/lib/places/mobile-service.ts";

test("inactive mobile season stays inactive even when current date is inside the range", () => {
  assert.equal(
    isMobileSeasonActive(
      { active: false, startMonth: 9, startDay: 1, endMonth: 9, endDay: 30 },
      new Date(2026, 8, 9),
    ),
    false,
  );
});

test("active mobile season is active only inside its date range", () => {
  const season = { active: true, startMonth: 9, startDay: 1, endMonth: 9, endDay: 30 };
  assert.equal(isMobileSeasonActive(season, new Date(2026, 8, 9)), true);
  assert.equal(isMobileSeasonActive(season, new Date(2026, 9, 1)), false);
});

test("cross-year mobile season correctly spans December and January", () => {
  assert.equal(isAnnualDateInRange(new Date(2026, 11, 20), 11, 1, 2, 28), true);
  assert.equal(isAnnualDateInRange(new Date(2027, 0, 15), 11, 1, 2, 28), true);
  assert.equal(isAnnualDateInRange(new Date(2027, 2, 1), 11, 1, 2, 28), false);
});

test("mobile schedule keeps weekday and time in public presentation", () => {
  assert.equal(
    formatMobileSchedule({ weekday: "TUESDAY", opensAt: "10:00", closesAt: "12:00" }),
    "Wtorek · 10:00–12:00",
  );
});

test("all-day mobile schedule keeps weekday", () => {
  assert.equal(
    formatMobileSchedule({ weekday: "SUNDAY", allDay: true }),
    "Niedziela · Całodobowo",
  );
});
