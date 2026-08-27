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

test("opening status works before, during, after and across multiple periods", () => {
  const schedule = rows("OPEN", [["09:00", "10:00"], ["14:00", "16:00"]]);

  const before = evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T07:30:00Z"));
  assert.equal(before.isOpenNow, false);
  assert.equal(before.label, "Dzisiaj · od 09:00");

  const firstPeriod = evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T08:30:00Z"));
  assert.equal(firstPeriod.isOpenNow, true);
  assert.equal(firstPeriod.label, "Otwarte jeszcze 30 min · do 10:00");
  assert.equal(firstPeriod.closesInMinutes, 30);

  const secondPeriod = evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T13:30:00Z"));
  assert.equal(secondPeriod.isOpenNow, true);
  assert.equal(secondPeriod.label, "Otwarte teraz · do 16:00");

  const after = evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T16:00:00Z"));
  assert.equal(after.isOpenNow, false);
  assert.equal(after.label, "W poniedziałek · od 09:00");
});

test("admission hours warn when today's intake is ending soon", () => {
  const schedule: PublicOpeningRow[] = [
    { kind: "ADMISSION", weekday: "MONDAY", status: "OPEN", opensAt: "18:00", closesAt: "21:00" },
  ];
  const state = evaluateCurrentOpening(schedule, "ADMISSION", new Date("2026-01-12T19:20:00Z"));
  assert.equal(state.label, "Przyjęcia kończą się za 40 min · do 21:00");
  assert.equal(state.closesInMinutes, 40);
});

test("after today's hours the next known opening is shown", () => {
  const schedule: PublicOpeningRow[] = [
    { kind: "OPERATION", weekday: "MONDAY", status: "OPEN", opensAt: "09:00", closesAt: "10:00" },
    { kind: "OPERATION", weekday: "TUESDAY", status: "OPEN", opensAt: "08:00", closesAt: "12:00" },
  ];
  const state = evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T10:30:00Z"));
  assert.equal(state.isOpenNow, false);
  assert.equal(state.label, "Jutro · od 08:00");
  assert.equal(state.nextOpeningLabel, "Jutro · od 08:00");
});

test("explicitly closed today can still show the next known opening", () => {
  const schedule: PublicOpeningRow[] = [
    { kind: "OPERATION", weekday: "MONDAY", status: "CLOSED", opensAt: null, closesAt: null },
    { kind: "OPERATION", weekday: "WEDNESDAY", status: "OPEN", opensAt: "09:00", closesAt: "12:00" },
  ];
  const state = evaluateCurrentOpening(schedule, "OPERATION", new Date("2026-01-12T09:00:00Z"));
  assert.equal(state.label, "Dzisiaj zamknięte · w środę · od 09:00");
});

test("CLOSED and UNKNOWN never become open", () => {
  assert.equal(evaluateCurrentOpening(rows("CLOSED"), "OPERATION", new Date("2026-01-12T09:00:00Z")).status, "CLOSED");
  assert.equal(evaluateCurrentOpening(rows("UNKNOWN"), "OPERATION", new Date("2026-01-12T09:00:00Z")).isOpenNow, null);
});
