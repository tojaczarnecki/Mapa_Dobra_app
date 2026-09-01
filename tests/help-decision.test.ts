import test from "node:test";
import assert from "node:assert/strict";
import { helpCategoryHref, helpDecisionScenarioDetails, helpDecisionScenarios } from "../src/lib/help-requests/help-decision.ts";

test("help decision reuses existing public category flows", () => {
  assert.equal(helpCategoryHref("jedzenie"), "/szukaj?kategoria=jedzenie");
  assert.equal(helpCategoryHref("higiena"), "/szukaj?kategoria=higiena");
  assert.equal(helpCategoryHref("nocleg"), "/znajdz-nocleg");
});

test("uncertain help scenarios have distinct local guidance", () => {
  assert.deepEqual(helpDecisionScenarios.map((scenario) => scenario.label), [
    "Osoba wygląda na zagubioną lub zdezorientowaną",
    "Osoba śpi lub przebywa w miejscu publicznym",
    "Nie potrafię ocenić sytuacji",
  ]);
  assert.equal(helpDecisionScenarioDetails.disoriented.question, "Czy udało Ci się dowiedzieć, czego potrzebuje?");
  assert.equal(helpDecisionScenarioDetails["public-place"].question, "Czy wiesz już, czego osoba potrzebuje?");
  assert.match(helpDecisionScenarioDetails.unsure.intro, /bezpieczeństwie/);
});
