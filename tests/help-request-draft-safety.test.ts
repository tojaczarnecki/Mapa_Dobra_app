import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { restoreEmergencyAnswer } from "../src/lib/help-requests/emergency-gate.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wizard = readFileSync(resolve(root, "src/components/help-requests/help-request-wizard.tsx"), "utf8");

test("current help-request choices persist a conscious emergency answer", () => {
  assert.match(wizard, /emergencyAnswer: answer, emergencyAnswerSelected: true/);
  assert.match(wizard, /selectEmergencyAnswer\("YES"\)/);
  assert.match(wizard, /selectEmergencyAnswer\("NO"\)/);
  assert.match(wizard, /selectEmergencyAnswer\("UNKNOWN"\)/);
});

test("choosing immediate danger invalidates resumable help-request drafts", () => {
  assert.match(wizard, /if \(answer === "YES"\) \{[\s\S]*formDraft\.clear\(\);[\s\S]*previousFormDraft\.clear\(\);[\s\S]*legacyFormDraft\.clear\(\);/);
});

test("resuming consumes hook state instead of leaving storedDraft active", () => {
  assert.match(wizard, /const draft = formDraft\.resume\(\)/);
  assert.match(wizard, /const draft = previousFormDraft\.resume\(\)/);
  assert.match(wizard, /const draft = legacyFormDraft\.resume\(\)/);
});

test("legacy default UNKNOWN still cannot bypass the safety question", () => {
  assert.deepEqual(restoreEmergencyAnswer({ emergencyAnswer: "UNKNOWN" }), { answer: null, selected: false });
  assert.deepEqual(restoreEmergencyAnswer({ emergencyAnswer: "UNKNOWN", emergencyAnswerSelected: true }), { answer: "UNKNOWN", selected: true });
});
