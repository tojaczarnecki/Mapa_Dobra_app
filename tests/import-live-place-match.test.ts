import assert from "node:assert/strict";
import test from "node:test";
import { findLivePlaceMatch, livePlaceLockKeys } from "../src/lib/imports/live-place-match.ts";

const values = { name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: "42 000 00 00", website: null };

test("excludes only the reviewed place from a live match", () => {
  const places = [
    { id: "reviewed", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: "42 000 00 00", organizationId: null },
    { id: "new-conflict", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: "42 000 00 00", organizationId: null },
  ];

  const result = findLivePlaceMatch(values, places, null, ["reviewed"]);
  assert.equal(result.classification, "EXACT_MATCH");
  assert.deepEqual(result.candidates.map((item) => item.placeId), ["new-conflict"]);
});

test("serializes candidates sharing an address under the same transaction lock", () => {
  assert.deepEqual(livePlaceLockKeys(values, null), ["address:piotrkowska 10 lodz"]);
});

test("returns the single live exact candidate for historical NEW analysis", () => {
  const result = findLivePlaceMatch(
    { name: "Nowe miejsce", addressLine: "Piotrkowska 10, Łódź", phone: null, website: null },
    [{ id: "exact", name: "Nowe miejsce", addressLine: "Piotrkowska 10, Łódź", phone: null, organizationId: null }],
    null,
  );
  assert.equal(result.classification, "EXACT_MATCH");
  assert.deepEqual(result.candidates.map((item) => item.placeId), ["exact"]);
  assert.deepEqual(result.candidates[0]?.reasons, ["SAME_NAME_AND_ADDRESS"]);
});

test("returns every live candidate for multiple exact matches", () => {
  const result = findLivePlaceMatch(
    values,
    [
      { id: "first", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: "42 000 00 00", organizationId: null },
      { id: "second", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: "42 000 00 00", organizationId: null },
      { id: "third", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: "42 000 00 00", organizationId: null },
    ],
    null,
  );
  assert.equal(result.classification, "POSSIBLE_MATCH");
  assert.equal(result.conflict, true);
  assert.deepEqual(result.reasons, ["MULTIPLE_EXACT_CANDIDATES"]);
  assert.deepEqual(result.candidates.map((item) => item.placeId), ["first", "second", "third"]);
});

test("keeps a phone-only possible match that heuristic name scoring could omit", () => {
  const result = findLivePlaceMatch(
    { name: "Zupełnie inna nazwa", addressLine: null, phone: "42 000 00 00", website: null },
    [{ id: "phone-match", name: "Inny punkt", addressLine: "Piotrkowska 99, Łódź", phone: "42 000 00 00", organizationId: null }],
    null,
  );
  assert.equal(result.classification, "POSSIBLE_MATCH");
  assert.deepEqual(result.candidates.map((item) => item.placeId), ["phone-match"]);
  assert.deepEqual(result.candidates[0]?.reasons, ["SAME_PHONE"]);
});

test("excluding the reviewed place leaves no conflict when it is the only match", () => {
  const places = [{ id: "reviewed", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: null, website: null, organizationId: null, primaryCategoryId: "category-1" }];
  assert.equal(findLivePlaceMatch(values, places, null, ["reviewed"]).classification, "NO_MATCH");
});

test("excluding one reviewed place does not suppress a second live conflict", () => {
  const places = [
    { id: "reviewed", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: null, website: null, organizationId: null, primaryCategoryId: "category-1" },
    { id: "remaining", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: null, website: null, organizationId: null, primaryCategoryId: "category-1" },
  ];
  const result = findLivePlaceMatch(values, places, null, ["reviewed"]);
  assert.equal(result.classification, "EXACT_MATCH");
  assert.deepEqual(result.candidates.map((item) => item.placeId), ["remaining"]);
});
