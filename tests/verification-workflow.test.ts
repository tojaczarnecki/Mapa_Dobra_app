import assert from "node:assert/strict";
import test from "node:test";
import { geocodingResultMatchesAddress, normalizeGeocodingQuery, parseNominatimResults } from "../src/lib/geocoding/results.ts";
import { getVerificationCompleteness } from "../src/lib/verification/completeness.ts";

function completeInput() {
  return {
    name: "TEST Punkt pomocy",
    addressLine: "ul. Testowa 1, Łódź",
    latitude: 51.7592,
    longitude: 19.455,
    phone: null,
    email: null,
    website: null,
    recordKind: "PRODUCTION" as const,
    verificationStatus: "VERIFIED" as const,
    verifiedAt: new Date(),
    primaryCategoryActive: true,
    categoryCount: 1,
    hasKnownOpeningHours: false,
    hasKnownRequirements: false,
    hasImportSource: true,
  };
}

test("optional contact and UNKNOWN hours do not block a verified place", () => {
  const result = getVerificationCompleteness(completeInput());
  assert.equal(result.readyToPublish, true);
  assert.equal(result.checks.find((item) => item.key === "contact")?.state, "optional");
  assert.equal(result.checks.find((item) => item.key === "hours")?.state, "unknown");
});

test("missing coordinates block ready-to-publish status", () => {
  const result = getVerificationCompleteness({ ...completeInput(), latitude: null, longitude: null });
  assert.equal(result.readyToPublish, false);
  assert.equal(result.checks.find((item) => item.key === "location")?.state, "missing");
});

test("TEST record can never become ready for public publication", () => {
  assert.equal(getVerificationCompleteness({ ...completeInput(), recordKind: "TEST" }).readyToPublish, false);
});

test("Nominatim parser keeps several administrator-selectable candidates", () => {
  const results = parseNominatimResults([
    { place_id: 1, osm_type: "node", osm_id: 10, display_name: "Testowa 1, Łódź, Polska", lat: "51.7592", lon: "19.455", importance: 0.8, address: { city: "Łódź", suburb: "Śródmieście" } },
    { place_id: 2, osm_type: "way", osm_id: 20, display_name: "Testowa, Łódź, Polska", lat: "51.7600", lon: "19.456", address: { city: "Łódź" } },
  ]);
  assert.equal(results.length, 2);
  assert.equal(results[0].city, "Łódź");
  assert.equal(results[0].district, "Śródmieście");
});

test("geocoder rejects malformed and out-of-country coordinates", () => {
  assert.deepEqual(parseNominatimResults([
    { display_name: "Brak współrzędnych" },
    { display_name: "Poza Polską", lat: "40", lon: "10" },
  ]), []);
});

test("geocoding cache key normalizes whitespace and case", () => {
  assert.equal(normalizeGeocodingQuery("  UL. Testowa  1, ŁÓDŹ "), "ul. testowa 1, łódź");
});

test("geocoder marks a mismatched single result as ambiguous", () => {
  const [wrong] = parseNominatimResults([{ display_name: "Pomorska, Łódź, Polska", lat: "51.7768", lon: "19.4569" }]);
  assert.equal(geocodingResultMatchesAddress(wrong, "Piotrkowska", "104"), false);
});

test("geocoder recognizes a result containing the street and building number", () => {
  const [matching] = parseNominatimResults([{ display_name: "104, ulica Piotrkowska, Łódź, Polska", lat: "51.7592", lon: "19.455" }]);
  assert.equal(geocodingResultMatchesAddress(matching, "Piotrkowska", "104"), true);
});
