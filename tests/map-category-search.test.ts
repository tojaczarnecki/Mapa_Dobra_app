import assert from "node:assert/strict";
import test from "node:test";
import { filterPublicSearchPlaces, type PublicSearchPlace } from "../src/lib/places/search.ts";

const base = {
  status: "open",
  openNow: true,
  todayHours: "Dzisiaj 10:00-18:00",
  free: "UNKNOWN" as const,
  referralRequired: "UNKNOWN" as const,
  documentRequired: "UNKNOWN" as const,
  distanceKm: 1,
};

const places: PublicSearchPlace[] = [
  { ...base, id: "psych", name: "Punkt psychologiczny", categorySlug: "pomoc-psychologiczna", slug: "psych", categorySlugs: ["pomoc-psychologiczna"], searchText: "psycholog wsparcie" },
  { ...base, id: "social", name: "Punkt socjalny", categorySlug: "pomoc-socjalna", slug: "social", categorySlugs: ["pomoc-socjalna"], searchText: "pomoc socjalna" },
  { ...base, id: "clothes", name: "Punkt odzieżowy", categorySlug: "odziez", slug: "clothes", categorySlugs: ["odziez"], searchText: "odzież ubrania" },
  { ...base, id: "other", name: "Punkt integracyjny", categorySlug: "integracja", slug: "other", categorySlugs: ["integracja"], searchText: "integracja wsparcie" },
  { ...base, id: "mixed", name: "Punkt mieszany", categorySlug: "jedzenie", slug: "mixed", categorySlugs: ["jedzenie", "integracja"], searchText: "jedzenie integracja" },
];

test("expanded map categories resolve to the same public list categories", () => {
  assert.deepEqual(filterPublicSearchPlaces(places, { category: "psychological" }).map((place) => place.id), ["psych"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { category: "social" }).map((place) => place.id), ["social"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { category: "clothing" }).map((place) => place.id), ["clothes"]);
  assert.deepEqual(filterPublicSearchPlaces(places, { category: "inne" }).map((place) => place.id), ["other", "mixed"]);
});
