import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wizard = readFileSync(resolve(root, "src/components/help-requests/help-request-wizard.tsx"), "utf8");
const route = readFileSync(resolve(root, "src/app/api/help-requests/route.ts"), "utf8");

test("help request validates reporter contact before sending", () => {
  assert.match(wizard, /validateHelpRequestContact/);
  assert.match(wizard, /setShowContact\(true\)/);
  assert.match(wizard, /setError\(contactValidation\.reason\)/);
});

test("help request surfaces safe API validation and rate-limit messages", () => {
  assert.match(route, /validation\.reason/);
  assert.match(route, /Wysłano zbyt wiele zgłoszeń w krótkim czasie/);
  assert.match(wizard, /responseErrorMessage\(response\)/);
});

test("help request distinguishes transport failure from server validation failure", () => {
  assert.match(wizard, /Nie udało się połączyć z Dobrą Mapą/);
  assert.match(wizard, /Sprawdź połączenie z internetem/);
});
