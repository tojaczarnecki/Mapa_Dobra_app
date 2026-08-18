import assert from "node:assert/strict";
import test from "node:test";
import { geocodingResultMatchesAddress, normalizeGeocodingQuery, parseNominatimResults, scoreGeocodingSuggestion } from "../src/lib/geocoding/results.ts";
import { buildGeocodingAttempts, prepareGeocodingAddress } from "../src/lib/geocoding/query.ts";
import { getVerificationCompleteness } from "../src/lib/verification/completeness.ts";
import { contactReasonsBlockingPublication, parseVerificationContactMethod, parseVerificationContactReasons } from "../src/lib/verification/contact.ts";
import { resolveLocationSource } from "../src/lib/verification/location.ts";

function completeInput() {
  return {
    name: "TEST Punkt pomocy",
    addressLine: "ul. Testowa 1, Łódź",
    latitude: 51.7592,
    longitude: 19.455,
    locationSource: "GEOCODER" as const,
    phone: null,
    email: null,
    website: null,
    recordKind: "PRODUCTION" as const,
    publicationStatus: "DRAFT" as const,
    verificationStatus: "VERIFIED" as const,
    verifiedAt: new Date(),
    verificationSource: "OFFICIAL_WEBSITE",
    primaryCategoryActive: true,
    categoryCount: 1,
    hasKnownOpeningHours: false,
    hasKnownRequirements: false,
    hasImportSource: true,
    hasUnresolvedConflict: false,
    blockingContactReasons: [] as string[],
    accommodation: false,
    accommodationTargetGroupCount: 0,
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

test("coordinates without administrator-approved provenance do not make a place ready", () => {
  const result = getVerificationCompleteness({ ...completeInput(), locationSource: null });
  assert.equal(result.readyToPublish, false);
});

test("critical CONTACT_REQUIRED reasons block readiness without discarding verified fields", () => {
  const result = getVerificationCompleteness({ ...completeInput(), blockingContactReasons: ["UNCERTAIN_ADDRESS"] });
  assert.equal(result.readyToPublish, false);
  assert.equal(result.checks.find((item) => item.key === "verification")?.state, "complete");
  assert.equal(result.checks.find((item) => item.key === "critical-contact")?.state, "missing");
});

test("optional UNKNOWN data and unknown accommodation availability do not block readiness", () => {
  const result = getVerificationCompleteness({
    ...completeInput(),
    accommodation: true,
    accommodationTargetGroupCount: 1,
    hasKnownOpeningHours: false,
    hasKnownRequirements: false,
  });
  assert.equal(result.readyToPublish, true);
  assert.equal(result.checks.find((item) => item.key === "hours")?.state, "unknown");
});

test("accommodation without a target group is not ready", () => {
  const result = getVerificationCompleteness({ ...completeInput(), accommodation: true, accommodationTargetGroupCount: 0 });
  assert.equal(result.readyToPublish, false);
});

test("unresolved import conflict blocks readiness", () => {
  assert.equal(getVerificationCompleteness({ ...completeInput(), hasUnresolvedConflict: true }).readyToPublish, false);
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

test("geocoding query removes only technical street prefixes and adds city and country", () => {
  const input = { name: "TEST Punkt", addressLine: "ul. Wólczańska 108, Łódź", street: "ul. Wólczańska", buildingNumber: "108", postalCode: "90-522", city: "Łódź" };
  const prepared = prepareGeocodingAddress(input);
  assert.equal(prepared.street, "Wólczańska");
  assert.equal(prepared.buildingNumber, "108");
  const attempts = buildGeocodingAttempts(input);
  assert.deepEqual(attempts[0].params, { street: "Wólczańska 108", city: "Łódź", postalcode: "90-522", country: "Polska" });
  assert.equal(attempts[1].query, "Wólczańska 108, Łódź, Polska");
});

test("geocoding query removes floor text without inventing a missing building number", () => {
  const withFloor = prepareGeocodingAddress({ name: "TEST", addressLine: "al. A. Mickiewicza 15a, IV p, Łódź", street: "al. A. Mickiewicza 15a, IV p", buildingNumber: null, postalCode: null, city: "Łódź" });
  assert.equal(withFloor.street, "A. Mickiewicza");
  assert.equal(withFloor.simplifiedStreet, "Mickiewicza");
  assert.equal(withFloor.buildingNumber, "15a");
  const withoutNumber = prepareGeocodingAddress({ name: "TEST", addressLine: "ul. Piotrkowska, Łódź", street: "ul. Piotrkowska", buildingNumber: null, postalCode: null, city: "Łódź" });
  assert.equal(withoutNumber.buildingNumber, "");
});

test("quality scoring distinguishes a Lodz match from an out-of-city result", () => {
  const [lodz] = parseNominatimResults([{ place_id: 1, display_name: "108, Wólczańska, Łódź, Polska", lat: "51.752", lon: "19.451", address: { city: "Łódź", road: "Wólczańska", house_number: "108", postcode: "90-522", country_code: "pl" } }]);
  const [outside] = parseNominatimResults([{ place_id: 2, display_name: "Wólczańska 108, Pabianice", lat: "51.665", lon: "19.35", address: { city: "Pabianice", road: "Wólczańska", house_number: "108", country_code: "pl" } }]);
  assert.equal(scoreGeocodingSuggestion(lodz, { street: "Wólczańska", buildingNumber: "108", postalCode: "90-522", city: "Łódź" }).quality, "HIGH");
  assert.equal(scoreGeocodingSuggestion(outside, { street: "Wólczańska", buildingNumber: "108", postalCode: "", city: "Łódź" }).quality, "IMPROBABLE");
});

test("missing number remains reviewable rather than a high-confidence match", () => {
  const [suggestion] = parseNominatimResults([{ place_id: 1, display_name: "Wólczańska, Łódź, Polska", lat: "51.752", lon: "19.451", address: { city: "Łódź", road: "Wólczańska" } }]);
  const result = scoreGeocodingSuggestion(suggestion, { street: "Wólczańska", buildingNumber: "108", postalCode: "", city: "Łódź" });
  assert.equal(result.quality, "REVIEW");
  assert.match(result.reasons.join(" "), /numeru budynku/iu);
});

test("location provenance requires an explicit geocoder confirmation or manual choice", () => {
  assert.equal(resolveLocationSource("GEOCODER_CONFIRMED"), "GEOCODER");
  assert.equal(resolveLocationSource("MANUAL"), "MANUAL");
  assert.equal(resolveLocationSource(""), null);
});

test("contact workflow validates controlled reasons and methods", () => {
  assert.deepEqual(parseVerificationContactReasons(["UNCERTAIN_ADDRESS", "INVALID", "UNCERTAIN_ADDRESS"]), ["UNCERTAIN_ADDRESS"]);
  assert.equal(parseVerificationContactMethod("PHONE"), "PHONE");
  assert.equal(parseVerificationContactMethod("SMS"), null);
});

test("contact blockers distinguish optional contact gaps from critical facts", () => {
  assert.deepEqual(contactReasonsBlockingPublication(["OUTDATED_PHONE"], false), []);
  assert.deepEqual(contactReasonsBlockingPublication(["MISSING_CURRENT_HOURS"], false), []);
  assert.deepEqual(contactReasonsBlockingPublication(["MISSING_CURRENT_HOURS"], true), ["MISSING_CURRENT_HOURS"]);
  assert.deepEqual(contactReasonsBlockingPublication(["REQUIREMENTS_CONFIRMATION"], false), ["REQUIREMENTS_CONFIRMATION"]);
});
