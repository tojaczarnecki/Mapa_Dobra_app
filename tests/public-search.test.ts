import assert from "node:assert/strict";
import test from "node:test";
import { getHomeSuggestions } from "../src/lib/home/autosuggest.ts";
import { getCategoryAccentMap } from "../src/lib/home/category-accent.ts";
import { filterPublicSearchPlaces, type PublicSearchPlace } from "../src/lib/places/search.ts";

const places: PublicSearchPlace[] = [
  { id: "food", name: "Łódzki Punkt Posiłków", categorySlug: "jedzenie", slug: "lodzki-punkt-posilkow", categorySlugs: ["jedzenie"], searchText: "Łódzki Punkt Posiłków Caritas jedzenie ciepły posiłek", status: "open", openNow: true, free: "YES", referralRequired: "NO", documentRequired: "NO", distanceKm: 2 },
  { id: "shower", name: "Centrum Prysznic", categorySlug: "higiena", slug: "centrum-prysznic", categorySlugs: ["higiena"], searchText: "Centrum Prysznic higiena prysznic", status: "closed", openNow: false, free: "UNKNOWN", referralRequired: "UNKNOWN", documentRequired: "NO", distanceKm: 1 },
  { id: "unknown", name: "Niepewny Punkt", categorySlug: "jedzenie", slug: "niepewny-punkt", categorySlugs: ["jedzenie"], searchText: "Niepewny Punkt jedzenie", status: "unknownHours", openNow: null, free: "UNKNOWN", referralRequired: "UNKNOWN", documentRequired: "UNKNOWN", distanceKm: 0.5 },
];

test("search is case and diacritic insensitive across name and category", () => {
  assert.deepEqual(filterPublicSearchPlaces(places, { query: "LODZKI" }).map((place) => place.id), ["food"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { query: "prysznic" }).map((place) => place.id), ["shower"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { category: "food" }).map((place) => place.id), ["unknown", "food"]);
});

test("filters preserve UNKNOWN and only accept explicitly confirmed conditions", () => {
  assert.deepEqual(filterPublicSearchPlaces(places, { noReferral: true }).map((place) => place.id), ["food"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { noDocuments: true }).map((place) => place.id), ["shower", "food"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { free: true }).map((place) => place.id), ["food"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { openNow: true }).map((place) => place.id), ["food"]);
});

test("search supports no results, combined filters and distance sorting", () => {
  assert.equal(filterPublicSearchPlaces(places, { query: "nie istnieje" }).length, 0);
  assert.deepEqual(filterPublicSearchPlaces(places, { category: "jedzenie", noReferral: true }).map((place) => place.id), ["food"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { sort: "distance" }).map((place) => place.id), ["unknown", "shower", "food"]);
});

test("homepage autosuggest requires two characters and prioritizes categories", () => {
  const suggestions = getHomeSuggestions("noc", [{ label: "Nocleg", slug: "nocleg" }], places);
  assert.equal(getHomeSuggestions("n", [{ label: "Nocleg", slug: "nocleg" }], places).length, 0);
  assert.equal(suggestions[0]?.label, "Nocleg");
  assert.equal(suggestions[0]?.secondary, "Kategoria");
  assert.ok(suggestions.some((suggestion) => suggestion.label === "Schronisko"));
});

test("homepage autosuggest builds safe category and place routes", () => {
  const suggestions = getHomeSuggestions("prysznic", [{ label: "Prysznic", slug: "prysznic" }], places);
  assert.equal(suggestions[0]?.href, "/szukaj?kategoria=prysznic");
  const place = getHomeSuggestions("centrum", [], places).find((suggestion) => suggestion.secondary === "Miejsce");
  assert.equal(place?.href, "/lodz/higiena/centrum-prysznic");
});

test("category accents are stable across order and additions", () => {
  const initial = getCategoryAccentMap(["jedzenie", "nowa-kategoria"]);
  const reordered = getCategoryAccentMap(["nowa-kategoria", "jedzenie"]);
  const extended = getCategoryAccentMap(["inna-kategoria", "jedzenie", "nowa-kategoria"]);

  assert.equal(initial.get("jedzenie"), "#D97706");
  assert.equal(initial.get("nowa-kategoria"), reordered.get("nowa-kategoria"));
  assert.equal(initial.get("nowa-kategoria"), extended.get("nowa-kategoria"));
  assert.equal(initial.get("jedzenie"), extended.get("jedzenie"));
  assert.equal(new Set([
    initial.get("jedzenie"),
    getCategoryAccentMap(["nocleg"]).get("nocleg"),
    getCategoryAccentMap(["higiena"]).get("higiena"),
  ]).size, 3);
});
