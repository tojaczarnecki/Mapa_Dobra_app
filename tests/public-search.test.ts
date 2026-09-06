import assert from "node:assert/strict";
import test from "node:test";
import { getHomeSuggestions } from "../src/lib/home/autosuggest.ts";
import { getCategoryAccentMap } from "../src/lib/home/category-accent.ts";
import { getSmartSearchSuggestions, interpretSearchQuery, searchIntentHref, searchIntentSuggestions } from "../src/lib/places/search-intent.ts";
import { filterPublicSearchPlaces, type PublicSearchPlace } from "../src/lib/places/search.ts";

const places: PublicSearchPlace[] = [
  { id: "food", name: "Łódzki Punkt Posiłków", categorySlug: "jedzenie", slug: "lodzki-punkt-posilkow", categorySlugs: ["jedzenie"], searchText: "Łódzki Punkt Posiłków Caritas jedzenie ciepły posiłek", status: "open", openNow: true, todayHours: "Dzisiaj 12:00-15:00", free: "YES", referralRequired: "NO", documentRequired: "NO", distanceKm: 2 },
  { id: "shower", name: "Centrum Prysznic", categorySlug: "higiena", slug: "centrum-prysznic", categorySlugs: ["higiena"], searchText: "Centrum Prysznic higiena prysznic", status: "closed", openNow: false, todayHours: "Dzisiaj 08:00-10:00", free: "UNKNOWN", referralRequired: "UNKNOWN", documentRequired: "NO", distanceKm: 1 },
  { id: "unknown", name: "Niepewny Punkt", categorySlug: "jedzenie", slug: "niepewny-punkt", categorySlugs: ["jedzenie"], searchText: "Niepewny Punkt jedzenie", status: "unknownHours", openNow: null, todayHours: "Brak potwierdzonych godzin", free: "UNKNOWN", referralRequired: "UNKNOWN", documentRequired: "UNKNOWN", distanceKm: 0.5 },
];

const socialFridge: PublicSearchPlace = {
  id: "fridge",
  name: "Lodówka społeczna",
  categorySlug: "jedzenie",
  slug: "lodowka-spoleczna",
  categorySlugs: ["jedzenie", "lodowka-spoleczna"],
  searchText: "Lodówka społeczna jedzenie",
  status: "open",
  openNow: null,
  todayHours: "Całodobowo",
  free: "UNKNOWN",
  referralRequired: "UNKNOWN",
  documentRequired: "UNKNOWN",
  distanceKm: 0.1,
  profileKind: "FOOD_SHARING",
};

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
  assert.deepEqual(filterPublicSearchPlaces(places, { today: true }).map((place) => place.id), ["shower", "food"]);
});

test("food journey keeps social fridges out of the confirmed-help ranking and open-now filter", () => {
  const foodPlaces = [...places, socialFridge];
  assert.deepEqual(filterPublicSearchPlaces(foodPlaces, { category: "jedzenie" }).map((place) => place.id), ["unknown", "food", "fridge"]);
  assert.deepEqual(filterPublicSearchPlaces(foodPlaces, { category: "jedzenie", openNow: true }).map((place) => place.id), ["food"]);
});

test("search supports no results, combined filters and distance sorting", () => {
  assert.equal(filterPublicSearchPlaces(places, { query: "nie istnieje" }).length, 0);
  assert.deepEqual(filterPublicSearchPlaces(places, { category: "jedzenie", noReferral: true }).map((place) => place.id), ["food"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { sort: "distance" }).map((place) => place.id), ["unknown", "shower", "food"]);
});

test("homepage autosuggest requires two characters and prioritizes categories for short queries", () => {
  const suggestions = getHomeSuggestions("noc", [{ label: "Nocleg", slug: "nocleg" }], places);
  assert.equal(getHomeSuggestions("n", [{ label: "Nocleg", slug: "nocleg" }], places).length, 0);
  assert.equal(suggestions[0]?.label, "Nocleg");
  assert.equal(suggestions[0]?.secondary, "Kategoria");
  assert.ok(suggestions.some((suggestion) => suggestion.label === "Schronisko"));
});

test("homepage autosuggest interprets natural language into actionable filters", () => {
  const suggestions = getHomeSuggestions("gdzie zjem ciepły posiłek teraz za darmo", [], places);
  const bestMatch = suggestions[0];
  assert.equal(bestMatch?.secondary, "Najlepsze dopasowanie");
  assert.match(bestMatch?.href ?? "", /zapytanie=/);
  assert.match(bestMatch?.href ?? "", /kategoria=jedzenie/);
  assert.match(bestMatch?.href ?? "", /otwarte=1/);
  assert.match(bestMatch?.href ?? "", /bezplatne=1/);
});

test("homepage autosuggest understands practical access constraints", () => {
  const suggestions = getHomeSuggestions("nocleg bez dokumentów bez skierowania najbliżej", [], places);
  const bestMatch = suggestions[0];
  assert.equal(bestMatch?.secondary, "Najlepsze dopasowanie");
  assert.match(bestMatch?.href ?? "", /kategoria=nocleg/);
  assert.match(bestMatch?.href ?? "", /bez_dokumentow=1/);
  assert.match(bestMatch?.href ?? "", /bez_skierowania=1/);
  assert.match(bestMatch?.href ?? "", /sort=distance/);
});

test("intent parser distinguishes today from open now and preserves original phrase", () => {
  const today = interpretSearchQuery("potrzebuję noclegu dzisiaj bez dokumentów");
  assert.equal(today.filters.category, "nocleg");
  assert.equal(today.filters.today, true);
  assert.equal(today.filters.openNow, undefined);
  assert.equal(today.filters.noDocuments, true);

  const now = interpretSearchQuery("gdzie zjem teraz");
  assert.equal(now.filters.category, "jedzenie");
  assert.equal(now.filters.openNow, true);

  const href = searchIntentHref("potrzebuję noclegu dzisiaj bez dokumentów");
  assert.match(href, /zapytanie=/);
  assert.match(href, /dzisiaj=1/);
  assert.match(href, /bez_dokumentow=1/);
});

test("intent parser recognizes psychological support and clothing needs", () => {
  assert.equal(interpretSearchQuery("potrzebuję rozmowy z psychologiem").filters.category, "pomoc-psychologiczna");
  assert.equal(interpretSearchQuery("potrzebuję ciepłej kurtki i ubrań").filters.category, "odziez");
});

test("intent parser recognizes legal and social support", () => {
  assert.equal(interpretSearchQuery("pomoc prawna").filters.category, "pomoc-prawna");
  assert.equal(interpretSearchQuery("praca socjalna").filters.category, "pomoc-socjalna");
});

test("map search suggestions reuse category aliases and natural language phrases", () => {
  const expected = [
    ["odzie", "Odzież"],
    ["ubrania", "Odzież"],
    ["jestem głodny", "Jedzenie"],
    ["nie mam gdzie spać", "Nocleg"],
    ["chcę się umyć", "Higiena"],
    ["prawnik", "Pomoc prawna"],
    ["psycholog", "Wsparcie psychologiczne"],
    ["lodówka", "Lodówka społeczna"],
  ] as const;

  for (const [query, label] of expected) {
    assert.equal(searchIntentSuggestions(query)[0]?.label, label);
  }
  assert.equal(searchIntentSuggestions("").length, 5);
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

test("smart search returns categories, combined intent and a safe plain-text fallback", () => {
  const category = getSmartSearchSuggestions("łóż", { places });
  assert.equal(category[0]?.label, "Nocleg");
  assert.match(category[0]?.href ?? "", /kategoria=nocleg/);

  const combined = getSmartSearchSuggestions("ciepły posiłek dzisiaj", { places });
  assert.equal(combined[0]?.group, "Interpretacja");
  assert.match(combined[0]?.href ?? "", /kategoria=jedzenie/);
  assert.match(combined[0]?.href ?? "", /dzisiaj=1/);

  const place = getSmartSearchSuggestions("centrum", { places }).find((suggestion) => suggestion.group === "Miejsce");
  assert.equal(place?.label, "Centrum Prysznic");
  assert.equal(getSmartSearchSuggestions("zzzz", { places })[0]?.label, "Szukaj „zzzz”");
  assert.match(getSmartSearchSuggestions("zzzz", { places })[0]?.href ?? "", /[?&]q=zzzz/);
});

test("smart search recognizes practical natural-language criteria without inventing filters", () => {
  const examples = [
    ["nocleg na dziś", "nocleg", "today"],
    ["jedzenie otwarte teraz", "jedzenie", "openNow"],
    ["psycholog najbliżej mnie", "pomoc-psychologiczna", "sort"],
    ["nocleg z psem", "nocleg", undefined],
    ["pomoc bez skierowania", undefined, "noReferral"],
  ] as const;

  for (const [query, category, filter] of examples) {
    const intent = interpretSearchQuery(query);
    assert.equal(intent.filters.category, category);
    if (filter) assert.ok(intent.filters[filter]);
  }
  assert.equal(interpretSearchQuery("nocleg z psem").filters.free, undefined);
});
