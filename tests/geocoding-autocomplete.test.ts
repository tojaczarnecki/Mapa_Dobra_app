import assert from "node:assert/strict";
import test from "node:test";
import { geographicContextFromSearchParams, geographicContextToSearchParams } from "../src/lib/geocoding/geographic-context.ts";
import { rankAutocompleteSuggestions, parseNominatimResults } from "../src/lib/geocoding/results.ts";

function results() {
  return parseNominatimResults([
    { place_id: 1, display_name: "Piotrkowska 10, Łódź, Polska", lat: "51.759", lon: "19.456", importance: 0.5, address: { road: "Piotrkowska", house_number: "10", city: "Łódź", country_code: "pl" } },
    { place_id: 2, display_name: "Piotrkowska 10, Pabianice, Polska", lat: "51.665", lon: "19.35", importance: 0.9, address: { road: "Piotrkowska", house_number: "10", city: "Pabianice", country_code: "pl" } },
    { place_id: 3, display_name: "Piotrkowska 10, Warszawa, Polska", lat: "52.23", lon: "21.01", importance: 0.9, address: { road: "Piotrkowska", house_number: "10", city: "Warszawa", country_code: "pl" } },
  ]);
}

test("autocomplete ranking prefers the configured city without filtering other Polish results", () => {
  const ranked = rankAutocompleteSuggestions(results(), "Piotrkowska 10", {
    city: "Łódź",
    countryCode: "pl",
    center: { lat: 51.7592, lng: 19.456 },
  });
  assert.equal(ranked[0].city, "Łódź");
  assert.equal(ranked.length, 3);
});

test("autocomplete ranking works with a different city context", () => {
  const ranked = rankAutocompleteSuggestions(results(), "Piotrkowska 10", {
    city: "Warszawa",
    countryCode: "pl",
    center: { lat: 52.23, lng: 21.01 },
  });
  assert.equal(ranked[0].city, "Warszawa");
});

test("autocomplete parser can expose up to seven suggestions", () => {
  const raw = Array.from({ length: 8 }, (_, index) => ({
    place_id: index,
    display_name: `Ulica ${index}, Łódź, Polska`,
    lat: "51.759",
    lon: "19.456",
    address: { road: `Ulica ${index}`, city: "Łódź" },
  }));
  assert.equal(parseNominatimResults(raw, 7).length, 7);
  assert.equal(parseNominatimResults(raw).length, 5);
});

test("geographic context accepts only bounded, finite coordinates", () => {
  const params = new URLSearchParams("city=%C5%81%C3%B3d%C5%BA&countryCode=PL&centerLat=51.7592&centerLng=19.456&north=51.9&south=51.6&east=19.7&west=19.3");
  const context = geographicContextFromSearchParams(params);
  assert.deepEqual(context?.center, { lat: 51.7592, lng: 19.456 });
  assert.equal(geographicContextToSearchParams(context).get("countryCode"), "pl");
  assert.equal(geographicContextFromSearchParams(new URLSearchParams("centerLat=999&centerLng=19")), undefined);
});

test("geocoder precision distinguishes an address, street and area result", () => {
  const parsed = parseNominatimResults([
    { place_id: 10, display_name: "12A, Piotrkowska, Łódź", lat: "51.759", lon: "19.456", address: { road: "Piotrkowska", house_number: "12A", city: "Łódź" } },
    { place_id: 11, display_name: "Piotrkowska, Łódź", lat: "51.759", lon: "19.456", type: "road", address: { road: "Piotrkowska", city: "Łódź" } },
    { place_id: 12, display_name: "Śródmieście, Łódź", lat: "51.759", lon: "19.456", type: "suburb", address: { suburb: "Śródmieście", city: "Łódź" } },
  ]);
  assert.deepEqual(parsed.map((item) => item.precision), ["address", "street", "area"]);
});
