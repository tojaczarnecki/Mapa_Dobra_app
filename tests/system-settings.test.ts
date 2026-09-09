import assert from "node:assert/strict";
import test from "node:test";
import { defaultSystemState, publicWriteBlockMessage, systemModeDescription, systemModeLabel, toSystemState } from "../src/lib/system/settings.ts";

test("system settings use safe defaults when the singleton is missing", () => {
  assert.deepEqual(toSystemState(null), defaultSystemState);
  assert.equal(systemModeLabel("NORMAL"), "Normalny");
  assert.equal(systemModeLabel("READ_ONLY"), "Tylko do odczytu");
  assert.equal(systemModeLabel("MAINTENANCE"), "Serwisowy");
});

test("system settings preserve configured copy", () => {
  assert.equal(toSystemState({ mode: "MAINTENANCE", maintenanceTitle: "Przerwa", maintenanceMessage: "Wrócimy później" }).maintenanceTitle, "Przerwa");
  assert.match(systemModeDescription("MAINTENANCE"), /Panel administratora/);
});

test("public writes expose the controlled message", () => {
  assert.match(publicWriteBlockMessage(), /chwilowo niedostępna/);
  assert.match(publicWriteBlockMessage(), /korzystać z mapy/);
});
