import assert from "node:assert/strict";
import test from "node:test";
import { consumeSubmissionRateLimit } from "../src/lib/submissions/rate-limit.ts";
import {
  validateNewPlaceSubmission,
  validatePlaceUpdateSubmission,
} from "../src/lib/submissions/validation.ts";

function validPlaceUpdate() {
  return {
    requestId: "11111111-1111-4111-8111-111111111111",
    placeId: "punkt-dobrego-posilku",
    placeSlug: "punkt-dobrego-posilku",
    placeReference: "TEST Punkt Dobrego Posiłku",
    reportTypes: ["hours"],
    description: "TEST: prawidłowe godziny działania.",
    proposedData: {
      hours: "Poniedziałek 10:00-16:00",
      address: "",
      phone: "",
      closedSince: "",
    },
    source: { type: "visited", url: "https://example.com/source" },
    submitterContact: { name: "Tester", email: "test@example.com", phone: "" },
    protection: { contactWebsite: "" },
  };
}

function validNewPlace() {
  return {
    requestId: "22222222-2222-4222-8222-222222222222",
    proposedData: {
      name: "TEST Nowe miejsce",
      organizationName: "TEST Organizacja",
      helpCategories: ["food"],
      address: {
        street: "ul. Testowa 1",
        postalCode: "90-001",
        city: "Łódź",
        district: "Śródmieście",
      },
      placeContact: {
        phone: "+48123123123",
        email: "miejsce@example.com",
        website: "https://example.com",
      },
      openingHours: "Poniedziałek 10:00-16:00",
      description: "TESTOWY rekord walidacyjny.",
      conditions: ["Bez skierowania"],
    },
    source: { type: "recommendation", url: "" },
    submitterContact: { name: "Tester", email: "tester@example.com", phone: "" },
    protection: { contactWebsite: "" },
  };
}

test("accepts a valid place update submission", () => {
  const result = validatePlaceUpdateSubmission(validPlaceUpdate());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data.submissionTypes, ["hours"]);
    assert.equal(result.data.placeSlug, "punkt-dobrego-posilku");
  }
});

test("rejects invalid contact details and a filled honeypot", () => {
  const invalidEmail = validPlaceUpdate();
  invalidEmail.submitterContact.email = "niepoprawny-email";
  assert.equal(validatePlaceUpdateSubmission(invalidEmail).ok, false);

  const spam = validPlaceUpdate();
  spam.protection.contactWebsite = "https://spam.example";
  assert.equal(validatePlaceUpdateSubmission(spam).ok, false);
});

test("accepts a valid new place submission", () => {
  const result = validateNewPlaceSubmission(validNewPlace());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data.categories, ["food"]);
    assert.equal(result.data.city, "Łódź");
  }
});

test("keeps unknown accommodation information distinct from no", () => {
  const submission = validNewPlace();
  submission.proposedData.helpCategories = ["accommodation"];
  Object.assign(submission.proposedData, {
    accommodation: {
      facilityType: "Schronisko",
      audiences: ["Dla mężczyzn"],
      availabilityKnown: "unknown",
      freePlaces: "",
      availabilityUpdated: "",
      availabilityUpdatedOther: "",
      admissionHours: "Do 22:00",
      sobriety: "Nie wiem",
      animals: "Nie wiem",
      accessibility: ["Nie wiem"],
    },
  });

  const result = validateNewPlaceSubmission(submission);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.availabilityKnown, "UNKNOWN");
    assert.equal(result.data.availableBedsReported, undefined);
  }
});

test("rejects a negative number of reported beds", () => {
  const submission = validNewPlace();
  submission.proposedData.helpCategories = ["accommodation"];
  Object.assign(submission.proposedData, {
    accommodation: {
      facilityType: "Schronisko",
      audiences: ["Dla mężczyzn"],
      availabilityKnown: "yes",
      freePlaces: "-1",
      availabilityUpdated: "today",
      availabilityUpdatedOther: "",
      admissionHours: "Do 22:00",
      sobriety: "Wymagana trzeźwość",
      animals: "Nieprzyjmowane",
      accessibility: [],
    },
  });

  assert.equal(validateNewPlaceSubmission(submission).ok, false);
});

test("limits repeated submissions without an external service", () => {
  const key = `test-${crypto.randomUUID()}`;
  const now = Date.now();
  for (let index = 0; index < 5; index += 1) {
    assert.equal(consumeSubmissionRateLimit(key, now).allowed, true);
  }
  assert.equal(consumeSubmissionRateLimit(key, now).allowed, false);
});
