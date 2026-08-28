import test from "node:test";
import assert from "node:assert/strict";
import {
  autocompleteQueryIsEligible,
  buildGeoapifyAutocompleteUrl,
  geoapifyApiKey,
  normalizeGeoapifyFeatures,
  rankAutocompleteSuggestions,
} from "../src/lib/geocoding/autocomplete.ts";
import { addressFieldsFromSuggestion } from "../src/lib/places/address-form.ts";

const feature = (properties: Record<string, unknown>) => ({ properties });

test("autocomplete requires at least three characters", () => {
  assert.equal(autocompleteQueryIsEligible(" Łó "), false);
  assert.equal(autocompleteQueryIsEligible("Łód"), true);
});

test("Geoapify results are normalized, capped, and preserve Polish characters", () => {
  const suggestions = normalizeGeoapifyFeatures({
    features: [
      feature({ place_id: "one", formatted: "Łódź, ul. Żółta 1", street: "Żółta", housenumber: "1", postcode: "90-001", city: "Łódź", lat: 51.76, lon: 19.45 }),
      ...Array.from({ length: 8 }, (_, index) => feature({ place_id: String(index + 2), formatted: `Łódź ${index + 2}`, lat: 51.76, lon: 19.45 })),
    ],
  });
  assert.equal(suggestions.length, 7);
  assert.equal(suggestions[0].road, "Żółta");
  assert.equal(suggestions[0].city, "Łódź");
});

test("missing address parts are represented as null and do not overwrite existing fields", () => {
  const suggestion = normalizeGeoapifyFeatures({ features: [feature({ formatted: "Łódź", lat: 51.76, lon: 19.45 })] })[0];
  const fields = addressFieldsFromSuggestion(suggestion);
  assert.equal(fields.street, undefined);
  assert.equal(fields.postalCode, undefined);
  assert.equal(fields.city, undefined);
  assert.equal(fields.latitude, 51.76);
  assert.equal(fields.addressLine, "Łódź");
});

test("provider configuration is optional and never exposes a fallback secret", () => {
  assert.equal(geoapifyApiKey({}), null);
  assert.equal(geoapifyApiKey({ GEOAPIFY_API_KEY: "  test-key  " }), "test-key");
});

test("Geoapify autocomplete uses a Polish country filter and Lodz proximity bias", () => {
  const url = buildGeoapifyAutocompleteUrl("Żółta", "test-key");
  assert.equal(url.searchParams.get("filter"), "countrycode:pl");
  assert.equal(url.searchParams.get("bias"), "proximity:19.455,51.759");
  assert.equal(url.searchParams.get("lang"), "pl");
  assert.equal(url.searchParams.get("limit"), "7");
  assert.equal(url.searchParams.get("filter")?.startsWith("rect:"), false);
});

test("autocomplete ranks an exact building number above composite and missing numbers", () => {
  const suggestions = normalizeGeoapifyFeatures({ features: [
    feature({ place_id: "composite", formatted: "ul. Piotrkowska 204/210, Łódź", street: "Piotrkowska", housenumber: "204/210", city: "Łódź", lat: 51.76, lon: 19.45 }),
    feature({ place_id: "exact", formatted: "ul. Piotrkowska 204, Łódź", street: "Piotrkowska", housenumber: "204", city: "Łódź", lat: 51.76, lon: 19.45 }),
    feature({ place_id: "street", formatted: "ul. Piotrkowska, Łódź", street: "Piotrkowska", city: "Łódź", lat: 51.76, lon: 19.45 }),
  ]});
  assert.deepEqual(rankAutocompleteSuggestions(" Piotrkowska   204 ", suggestions).map(({ id }) => id), ["exact", "composite", "street"]);
});

test("autocomplete ranking is stable and tolerates missing building numbers", () => {
  const suggestions = normalizeGeoapifyFeatures({ features: [
    feature({ place_id: "one", formatted: "Piotrkowska, Łódź", street: "Piotrkowska", city: "Łódź", lat: 51.76, lon: 19.45 }),
    feature({ place_id: "two", formatted: "Piotrkowska, Łódź", street: "Piotrkowska", city: "Łódź", lat: 51.761, lon: 19.451 }),
  ]});
  assert.deepEqual(rankAutocompleteSuggestions("Piotrkowska", suggestions).map(({ id }) => id), ["one", "two"]);
  assert.doesNotThrow(() => rankAutocompleteSuggestions("", suggestions));
});
