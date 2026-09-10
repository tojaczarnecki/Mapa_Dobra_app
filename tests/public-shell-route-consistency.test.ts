import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolveJourney } from "../src/lib/journeys.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = readFileSync(resolve(root, "src/app/page.tsx"), "utf8");
const footer = readFileSync(resolve(root, "src/components/app/site-footer.tsx"), "utf8");
const bottomNav = readFileSync(resolve(root, "src/components/app/mobile-bottom-nav.tsx"), "utf8");
const header = readFileSync(resolve(root, "src/components/app/site-header.tsx"), "utf8");

function params(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

test("canonical map entry points use /szukaj?view=map", () => {
  assert.match(home, /href="\/szukaj\?otwarte=1&lokalizacja=moja&view=map"/);
  assert.match(footer, /href: "\/szukaj\?view=map", label: "Mapa"/);
});

test("canonical open-now map keeps the now journey", () => {
  assert.equal(resolveJourney("/szukaj", params({ view: "map", otwarte: "1" })), "now");
  assert.equal(resolveJourney("/szukaj", params({ view: "map" })), "search");
});

test("needs routes stay inside the help journey", () => {
  assert.equal(resolveJourney("/potrzeby", params({})), "help");
  assert.equal(resolveJourney("/potrzeby/abc", params({})), "help");
  assert.match(bottomNav, /pathname\.startsWith\("\/potrzeby\/"\)/);
  assert.match(header, /isRoute\(pathname, "\/potrzeby"\)/);
});

test("place details keep the search navigation context", () => {
  assert.match(bottomNav, /pathname\.startsWith\("\/lodz\/"\)/);
  assert.match(header, /isRoute\(pathname, "\/lodz"\)/);
});
