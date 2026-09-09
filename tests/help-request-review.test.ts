import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const review = readFileSync(resolve(root, "src/components/help-requests/help-request-review.tsx"), "utf8");
const wizard = readFileSync(resolve(root, "src/components/help-requests/help-request-wizard.tsx"), "utf8");

test("review shows every material piece of the help request before submit", () => {
  assert.match(review, />Bezpieczeństwo</);
  assert.match(review, />Miejsce</);
  assert.match(review, />Sytuacja</);
  assert.match(review, />Opis</);
  assert.match(review, />Kontakt zgłaszającego</);
  assert.match(review, /Anonimowo — bez danych kontaktowych/);
  assert.match(review, /To nie jest wezwanie służb ani gwarancja interwencji lub czasu reakcji/);
  assert.match(review, /nie publikujemy treści ani dokładnej lokalizacji/);
});

test("wizard uses the complete review and disables duplicate submit while sending", () => {
  assert.match(wizard, /<HelpRequestReview/);
  assert.match(wizard, /description=\{form\.description\}/);
  assert.match(wizard, /reporterPhone=\{form\.reporterPhone\}/);
  assert.match(wizard, /reporterEmail=\{form\.reporterEmail\}/);
  assert.match(wizard, /\|\| sending/);
  assert.match(wizard, /sending \? "Przekazuję…" : "Przekaż informację"/);
});
