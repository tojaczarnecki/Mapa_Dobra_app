import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cookies = readFileSync(resolve(root, "src/app/cookies/page.tsx"), "utf8");
const privacy = readFileSync(resolve(root, "src/components/app/privacy-policy-content.tsx"), "utf8");
const accessibility = readFileSync(resolve(root, "src/app/dostepnosc/page.tsx"), "utf8");
const terms = readFileSync(resolve(root, "src/app/regulamin/page.tsx"), "utf8");
const contact = readFileSync(resolve(root, "src/app/kontakt/page.tsx"), "utf8");
const footer = readFileSync(resolve(root, "src/components/app/site-footer.tsx"), "utf8");
const publicInfo = readFileSync(resolve(root, "src/components/app/public-info-page.tsx"), "utf8");

test("public utility pages no longer use a generic placeholder", () => {
  for (const source of [privacy, accessibility, terms, contact, publicInfo]) {
    assert.doesNotMatch(source, /Treść w przygotowaniu/);
  }
});

test("cookies page documents actual local browser storage", () => {
  assert.match(cookies, /Cookie prywatności/);
  assert.match(cookies, /localStorage/);
  assert.match(cookies, /sessionStorage/);
  assert.match(cookies, /zapisane miejsca \(Ulubione\)/);
  assert.match(cookies, /draft/);
  assert.match(cookies, /Cache Storage/);
});

test("privacy notice does not pretend to be final before operator data exists", () => {
  assert.match(privacy, /techniczna informacja o prywatności/);
  assert.match(privacy, /pełne dane administratora danych/);
  assert.match(privacy, /nie powinien zostać uznany za finalną politykę prywatności/);
});

test("unpublished terms and contact are not advertised in the public footer", () => {
  assert.doesNotMatch(footer, /href: "\/regulamin"/);
  assert.doesNotMatch(footer, /href: "\/kontakt"/);
  assert.match(terms, /robots: \{ index: false, follow: false \}/);
  assert.match(contact, /robots: \{ index: false, follow: false \}/);
});

test("footer avoids intervention language for the help-request flow", () => {
  assert.doesNotMatch(footer, /label: "Uruchom pomoc"/);
  assert.match(footer, /Przekaż informację o sytuacji/);
});
