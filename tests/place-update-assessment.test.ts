import assert from "node:assert/strict";
import test from "node:test";
import { buildPlaceUpdateDescription } from "../src/lib/submissions/place-update-assessment.ts";

test("changed information is clearly separated from a verification request", () => {
  assert.equal(
    buildPlaceUpdateDescription("CHANGED", "Godziny są teraz 12:00-16:00."),
    "Zgłaszający wskazuje, że wybrane informacje uległy zmianie. Godziny są teraz 12:00-16:00.",
  );
});

test("uncertain reports remain useful without forcing invented details", () => {
  assert.equal(
    buildPlaceUpdateDescription("UNCERTAIN", ""),
    "Zgłaszający nie ma pewności i prosi o ponowne sprawdzenie wybranych informacji.",
  );
});

test("current information can be submitted as a confirmation signal", () => {
  assert.equal(
    buildPlaceUpdateDescription("CURRENT", "Sprawdzone telefonicznie dzisiaj."),
    "Zgłaszający potwierdza, że wybrane informacje są aktualne. Sprawdzone telefonicznie dzisiaj.",
  );
});
