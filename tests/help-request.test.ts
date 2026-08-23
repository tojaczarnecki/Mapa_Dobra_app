import test from "node:test";
import assert from "node:assert/strict";
import { helpRequestNeedLabels, validateHelpRequest } from "../src/lib/help-requests/validation.ts";

const base = {
  emergencyAnswer: "UNKNOWN",
  needs: ["OLDER_PERSON_SUPPORT", "NO_SUPPORT_NETWORK"],
  description: "Od kilku godzin nie widzę sąsiadki i martwię się, czy ma potrzebne wsparcie.",
  addressText: "okolice ulicy Piotrkowskiej",
};

test("help request accepts anonymous reports with multiple needs", () => {
  const result = validateHelpRequest(base);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.anonymous, true);
    assert.deepEqual(result.data.needs, ["OLDER_PERSON_SUPPORT", "NO_SUPPORT_NETWORK"]);
  }
});

test("help request preserves immediate danger and location coordinates", () => {
  const result = validateHelpRequest({
    ...base,
    emergencyAnswer: "YES",
    latitude: 51.759,
    longitude: 19.456,
    locationAccuracy: 30,
    reporterEmail: "osoba@example.com",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.urgency, "IMMEDIATE");
    assert.equal(result.data.latitude, 51.759);
    assert.equal(result.data.anonymous, false);
  }
});

test("help request rejects invalid contact, coordinates and honeypot", () => {
  assert.equal(validateHelpRequest({ ...base, reporterEmail: "not-an-email" }).ok, false);
  assert.equal(validateHelpRequest({ ...base, latitude: 120 }).ok, false);
  assert.equal(validateHelpRequest({ ...base, honeypot: "filled" }).ok, false);
});

test("help request needs remain observable situation labels", () => {
  assert.equal(helpRequestNeedLabels.OLDER_PERSON_SUPPORT, "Starsza osoba może potrzebować wsparcia");
  assert.equal(helpRequestNeedLabels.SAFETY_WELLBEING, "Niepokój o bezpieczeństwo lub dobrostan");
});
