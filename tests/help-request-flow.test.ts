import test from "node:test";
import assert from "node:assert/strict";
import { HELP_REQUEST_FORM_TYPE, HELP_REQUEST_STEP_COUNT, restoreHelpRequestStep, stripHelpRequestContact } from "../src/lib/help-requests/form-flow.ts";
import { helpRequestNeedLabels } from "../src/lib/help-requests/validation.ts";

test("help request flow has four safe steps", () => {
  assert.equal(HELP_REQUEST_STEP_COUNT, 4);
  assert.equal(HELP_REQUEST_FORM_TYPE, "help-request-v3");
  assert.equal(restoreHelpRequestStep(4), 4);
  assert.equal(restoreHelpRequestStep(6), 1);
  assert.equal(restoreHelpRequestStep("6"), 1);
});

test("OTHER is presented as uncertainty without changing the enum value", () => {
  assert.equal(helpRequestNeedLabels.OTHER, "Inne / trudno powiedzieć");
});

test("help request drafts exclude contact details", () => {
  const draft = stripHelpRequestContact({
    description: "Opis sytuacji",
    reporterName: "Ala",
    reporterPhone: "123",
    reporterEmail: "ala@example.com",
  });
  assert.deepEqual(draft, { description: "Opis sytuacji" });
});
