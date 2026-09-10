import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const review = readFileSync(resolve(root, "src/components/help-requests/help-request-review.tsx"), "utf8");
const wizard = readFileSync(resolve(root, "src/components/help-requests/help-request-wizard.tsx"), "utf8");

test("help-request review includes all information that will be submitted", () => {
  assert.match(review, />Bezpieczeństwo</);
  assert.match(review, />Miejsce</);
  assert.match(review, />Sytuacja</);
  assert.match(review, />Opis</);
  assert.match(review, />Kontakt zgłaszającego</);
  assert.match(review, /Anonimowo — bez danych kontaktowych/);
});

test("help-request review repeats the operational promise before final submit", () => {
  assert.match(review, /prywatnej kolejki Dobrej Mapy/);
  assert.match(review, /nie jest wezwanie służb/);
  assert.match(review, /gwarancja interwencji lub czasu reakcji/);
  assert.match(review, /nie publikujemy treści ani dokładnej lokalizacji/);
});

test("wizard validates optional contact and communicates its requirement", () => {
  assert.match(wizard, /validateHelpRequestContact/);
  assert.match(wizard, /Jeśli zostawiasz kontakt, podaj telefon lub e-mail/);
  assert.match(wizard, /setShowContact\(true\)/);
  assert.match(wizard, /setError\(contactValidation\.reason\)/);
});

test("final submit is disabled while request is being sent", () => {
  assert.match(wizard, /\|\| sending/);
  assert.match(wizard, /sending \? "Przekazuję…" : "Przekaż informację"/);
});
