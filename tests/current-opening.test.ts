import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCurrentOpening, type PublicOpeningRow } from "../src/lib/places/current-opening.ts";

function rows(status: "OPEN" | "CLOSED" | "UNKNOWN", periods: Array<[string, string]> = []): PublicOpeningRow[] {
  if (status !== "OPEN") return [{ kind: "OPERATION", weekday: "MONDAY", status, opensAt: null, closesAt: null }];
  return periods.map(([opensAt, closesAt], sortOrder) => ({ kind: "OPERATION", weekday: "MONDAY", status, opensAt, closesAt, sortOrder }));
}

test("Europe/Warsaw is used in winter and summer independently of server timezone", () => {
  assert.equal(evaluateCurrentOpening(rows("OPEN", [["09:00", "10:00"]]), "OPERATION", new Date("2026-01-12T08:30:00Z")).isOpenNow, true);
  assert.equal(evaluateCurrentOpening(rows("OPEN", [["09:00", "10:00"]]), "OPERATION", new Date("2026-07-13T07:30:00Z")).isOpenNow, true);
});

test("opening status works on the daylight-saving transition day", () => {
  const sundayRows: PublicOpeningRow[] = [{ kind: "OPERATION", weekday: "SUNDAY", status: "OPEN", opensAt: "09:00", closesAt: "10:00" }];
  assert.equal(evaluateCurrentOpening(sundayRows, "OPERATION", new Date("2026-03-29T07:30:00Z")).isOpenNow, true);
  assert.equal(evaluateCurrentOpening(sundayRows, "OPERATION", new Date("2026-10-25T08:30:00Z")).isOpenNow, true);
});

test("midnight switches to the next Warsaw weekday", () => {
  const schedule: PublicOpeningRow[] = [
    { kind: "OPERATION", weekday: "MONDAY", status: "OPEN", opensAt: "23:00", closesAt: "23:59" },
    { kind: "OPERATION", weekday: "TUESDAY", status: "OPEN", opensAt: "00:00", closesAt: "01:00" },
  ];
  assert.equal(evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T22:30:00Z")).weekday, "MONDAY");
  const afterMidnight = evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T23:30:00Z"));
  assert.equal(afterMidnight.weekday, "TUESDAY");
  assert.equal(afterMidnight.isOpenNow, true);
});

test("opening status handles before, during, after and multiple periods", () => {
  const schedule = rows("OPEN", [["09:00", "10:00"], ["14:00", "16:00"]]);
  assert.equal(evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T07:30:00Z")).isOpenNow, false);
  assert.equal(evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T08:30:00Z")).isOpenNow, true);
  assert.equal(evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T16:00:00Z")).isOpenNow, false);
  assert.equal(evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T13:30:00Z")).isOpenNow, true);
});

test("CLOSED and UNKNOWN never become open", () => {
  assert.equal(evaluateCurrentOpening(rows("CLOSED"), "OPERATION", new Date("2026-01-12T09:00:00Z")).status, "CLOSED");
  assert.equal(evaluateCurrentOpening(rows("UNKNOWN"), "OPERATION", new Date("2026-01-12T09:00:00Z")).isOpenNow, null);
});
