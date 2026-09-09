import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { mapDetailsHref } from "../src/components/map/map-place-links.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const detailPage = readFileSync(resolve(root, "src/app/lodz/[kategoria]/[slug]/page.tsx"), "utf8");
const legacyMapPage = readFileSync(resolve(root, "src/app/mapa/page.tsx"), "utf8");
const mobileNav = readFileSync(resolve(root, "src/components/app/mobile-bottom-nav.tsx"), "utf8");
const searchResultsInteractive = readFileSync(resolve(root, "src/components/places/search-results-interactive.tsx"), "utf8");
const searchResultsMap = readFileSync(resolve(root, "src/components/places/search-results-map.tsx"), "utf8");

test("map details links preserve filters and force canonical map view", () => {
  const href = mapDetailsHref(
    "/lodz/jedzenie/test-place",
    "/szukaj?q=zupa&otwarte=1",
  );

  assert.equal(
    href,
    "/lodz/jedzenie/test-place?from=mapa&returnTo=%2Fszukaj%3Fq%3Dzupa%26otwarte%3D1%26view%3Dmap",
  );
});

test("canonical search map threads the current list href into every map popup path", () => {
  assert.match(searchResultsInteractive, /<SearchResultsMap[\s\S]*returnTo=\{listHref\}/);
  assert.match(searchResultsInteractive, /<MapPlacePopup place=\{selectedPlace\} returnTo=\{listHref\} \/>/);
  assert.match(searchResultsMap, /returnTo\?: string/);
  assert.match(searchResultsMap, /<HelpMap[\s\S]*returnTo=\{returnTo\}/);
});

test("legacy map return paths are normalized to the canonical search map route", () => {
  const href = mapDetailsHref(
    "/lodz/jedzenie/test-place",
    "/mapa?kategoria=jedzenie&dzisiaj=1",
  );

  assert.match(decodeURIComponent(href), /returnTo=\/szukaj\?kategoria=jedzenie&dzisiaj=1&view=map/);
});

test("unsafe return targets do not escape the application", () => {
  const href = mapDetailsHref(
    "/lodz/jedzenie/test-place",
    "https://example.com/steal-context",
  );

  assert.match(decodeURIComponent(href), /returnTo=\/szukaj\?view=map/);
  assert.doesNotMatch(href, /example\.com/);
});

test("place detail distinguishes map return state from list return state", () => {
  assert.match(detailPage, /isMapReturnTarget/);
  assert.match(detailPage, /returningToMap \? "Wróć do mapy"/);
  assert.match(detailPage, /fromMap \? "\/szukaj\?view=map"/);
});

test("legacy map route advertises the canonical map view", () => {
  assert.match(legacyMapPage, /canonicalAlternates\("\/szukaj\?view=map"\)/);
  assert.match(legacyMapPage, /query\.set\("view", "map"\)/);
});

test("mobile shell recognizes both legacy and canonical map mode", () => {
  assert.match(mobileNav, /pathname === "\/mapa" \|\| \(pathname === "\/szukaj" && searchParams\.get\("view"\) === "map"\)/);
});
