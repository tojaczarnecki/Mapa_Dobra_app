import assert from "node:assert/strict";
import test from "node:test";
import type { OpeningDay } from "../src/data/demo-place-details.ts";
import { groupOpeningDays } from "../src/components/place-details/opening-hours-groups.ts";

const dayNames = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

function schedule(periods: string[] | undefined, status: OpeningDay["status"] = "open"): OpeningDay[] {
  return dayNames.map((day) => ({ day, status, periods }));
}

test("groups consecutive Monday to Friday with identical hours", () => {
  const days = schedule(["08:00-16:00"]);
  days[5] = { day: "Sobota", status: "closed" };
  days[6] = { day: "Niedziela", status: "closed" };
  const groups = groupOpeningDays(days);
  assert.deepEqual(groups.map((group) => group.label), ["Poniedziałek–piątek", "Sobota–niedziela"]);
});

test("groups an identical weekend separately", () => {
  const days = schedule(["08:00-16:00"]);
  days[5] = { day: "Sobota", status: "open", periods: ["10:00-14:00"] };
  days[6] = { day: "Niedziela", status: "open", periods: ["10:00-14:00"] };
  const groups = groupOpeningDays(days);
  assert.deepEqual(groups.map((group) => group.label), ["Poniedziałek–piątek", "Sobota–niedziela"]);
});

test("keeps different daily hours separate", () => {
  const days = schedule(["08:00-16:00"]);
  days[1] = { day: "Wtorek", status: "open", periods: ["10:00-18:00"] };
  const groups = groupOpeningDays(days);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((group) => group.label), ["Poniedziałek", "Wtorek", "Środa–niedziela"]);
});

test("compares the complete set of multiple intervals", () => {
  const days = schedule(["08:00-12:00", "15:00-18:00"]);
  days[2] = { day: "Środa", status: "open", periods: ["08:00-12:00", "16:00-18:00"] };
  const groups = groupOpeningDays(days);
  assert.deepEqual(groups.slice(0, 3).map((group) => group.label), ["Poniedziałek–wtorek", "Środa", "Czwartek–niedziela"]);
});

test("groups consecutive closed days", () => {
  const days = schedule(undefined, "closed");
  days[2] = { day: "Środa", status: "open", periods: ["08:00-16:00"] };
  const groups = groupOpeningDays(days);
  assert.equal(groups[0].label, "Poniedziałek–wtorek");
  assert.equal(groups[0].days[0].status, "closed");
});

test("does not group non-consecutive days with the same hours", () => {
  const days = schedule(["08:00-16:00"]);
  days[1] = { day: "Wtorek", status: "open", periods: ["10:00-18:00"] };
  days[3] = { day: "Czwartek", status: "open", periods: ["10:00-18:00"] };
  const groups = groupOpeningDays(days);
  assert.deepEqual(groups.map((group) => group.label), ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek–niedziela"]);
});

test("keeps today on the combined range", () => {
  const days = schedule(["08:00-16:00"]);
  days[1].isToday = true;
  const [group] = groupOpeningDays(days);
  assert.equal(group.label, "Poniedziałek–niedziela");
  assert.equal(group.isToday, true);
});

test("keeps an empty schedule available for a single fallback message", () => {
  assert.deepEqual(groupOpeningDays([]), []);
});
