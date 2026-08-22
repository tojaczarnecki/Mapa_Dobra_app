import assert from "node:assert/strict";
import test from "node:test";
import { filterPublicSearchPlaces, type PublicSearchPlace } from "../src/lib/places/search.ts";

const places: PublicSearchPlace[] = [
  { id: "food", name: "Łódzki Punkt Posiłków", categorySlugs: ["jedzenie"], searchText: "Łódzki Punkt Posiłków Caritas jedzenie ciepły posiłek", status: "open", openNow: true, free: "YES", referralRequired: "NO", documentRequired: "NO", distanceKm: 2 },
  { id: "shower", name: "Centrum Prysznic", categorySlugs: ["higiena"], searchText: "Centrum Prysznic higiena prysznic", status: "closed", openNow: false, free: "UNKNOWN", referralRequired: "UNKNOWN", documentRequired: "NO", distanceKm: 1 },
  { id: "unknown", name: "Niepewny Punkt", categorySlugs: ["jedzenie"], searchText: "Niepewny Punkt jedzenie", status: "unknownHours", openNow: null, free: "UNKNOWN", referralRequired: "UNKNOWN", documentRequired: "UNKNOWN", distanceKm: 0.5 },
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
