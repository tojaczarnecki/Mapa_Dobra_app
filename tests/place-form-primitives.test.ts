import assert from "node:assert/strict";
import test from "node:test";
import { addressFieldsFromSuggestion } from "../src/lib/places/address-form.ts";
import { normalizeTokenValues } from "../src/lib/token-values.ts";
import { normalizeHttpUrl } from "../src/lib/urls.ts";

test("normalizes safe website values without accepting other protocols", () => {
  assert.equal(normalizeHttpUrl(" example.pl "), "https://example.pl");
  assert.equal(normalizeHttpUrl("http://example.pl"), "http://example.pl");
  assert.equal(normalizeHttpUrl("https://example.pl"), "https://example.pl");
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHttpUrl("ftp://example.pl"), null);
  assert.equal(normalizeHttpUrl("   "), null);
});

test("normalizes token values by trimming and case-insensitive deduplication", () => {
  assert.deepEqual(normalizeTokenValues([" Osoby starsze ", "osoby STARSZE", "", "Kobiety"]), ["Osoby starsze", "Kobiety"]);
});

test("maps an address suggestion to the existing structured place fields", () => {
  assert.deepEqual(addressFieldsFromSuggestion({
    id: "1", displayName: "Piotrkowska 10, Łódź", latitude: 51.75, longitude: 19.45,
    city: "Łódź", district: "Śródmieście", importance: 1, road: "Piotrkowska", houseNumber: "10",
    postalCode: "90-001", countryCode: "pl", resultType: "address", precision: "address", quality: "HIGH", qualityScore: 1, qualityReasons: [],
  }), {
    addressLine: "Piotrkowska 10", street: "Piotrkowska", buildingNumber: "10", postalCode: "90-001",
    city: "Łódź", district: "Śródmieście", latitude: 51.75, longitude: 19.45,
  });
});
