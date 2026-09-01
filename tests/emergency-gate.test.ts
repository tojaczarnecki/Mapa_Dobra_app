import test from "node:test";
import assert from "node:assert/strict";
import { canContinueFromEmergency, isTerminalEmergency, restoreEmergencyAnswer } from "../src/lib/help-requests/emergency-gate.ts";

test("emergency gate requires a conscious answer", () => {
  assert.equal(canContinueFromEmergency(null), false);
  assert.equal(canContinueFromEmergency("NO"), true);
  assert.equal(canContinueFromEmergency("UNKNOWN"), true);
});

test("YES is terminal and does not become a regular submission", () => {
  assert.equal(isTerminalEmergency("YES"), true);
  assert.equal(isTerminalEmergency("NO"), false);
  assert.equal(isTerminalEmergency("UNKNOWN"), false);
});

test("old drafts with default UNKNOWN require a new conscious answer", () => {
  assert.deepEqual(restoreEmergencyAnswer({ emergencyAnswer: "UNKNOWN" }), { answer: null, selected: false });
  assert.deepEqual(restoreEmergencyAnswer({ emergencyAnswer: "UNKNOWN", emergencyAnswerSelected: true }), { answer: "UNKNOWN", selected: true });
  assert.deepEqual(restoreEmergencyAnswer({ emergencyAnswer: "NO", emergencyAnswerSelected: true }), { answer: "NO", selected: true });
});
