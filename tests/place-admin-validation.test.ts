import assert from "node:assert/strict";
import test from "node:test";
import { validatePlaceAdminPayload } from "../src/lib/places/admin-validation.ts";

const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

type TestOpeningDay = {
  weekday: string;
  status: string;
  periods: Array<{ opensAt: string; closesAt: string }>;
  note: string;
};

function validPayload() {
  const unknownDays: TestOpeningDay[] = weekdays.map((weekday) => ({ weekday, status: "UNKNOWN", periods: [], note: "Brak danych" }));
  return {
    name: "TEST Miejsce",
    slug: "test-miejsce",
    organizationName: "TEST Organizacja",
    primaryCategorySlug: "jedzenie",
    categorySlugs: ["jedzenie"],
    typeLabel: "Punkt pomocy",
    description: "Opis testowy",
    street: "Testowa",
    buildingNumber: "1",
    addressLine: "ul. Testowa 1, Łódź",
    postalCode: "90-001",
    city: "Łódź",
    district: "Śródmieście",
    latitude: 51.75,
    longitude: 19.45,
    phone: "+48123123123",
    email: "miejsce@example.com",
    website: "https://example.com",
    socialMedia: "",
    operationalStatus: "UNKNOWN",
    todayHoursLabel: "Brak danych",
    audience: ["osoby potrzebujące pomocy"],
    services: ["posiłek"],
    openingHours: { operation: unknownDays, admission: unknownDays },
    requirements: [{ kind: "REFERRAL", state: "UNKNOWN", label: "Skierowanie", note: "" }],
    accessibility: [{ feature: "RAMP", state: "UNKNOWN", label: "Podjazd", note: "" }],
    isAccommodation: false,
    markVerified: false,
    internalNote: "",
  };
}

test("admin place validation preserves UNKNOWN independently from NO", () => {
  const result = validatePlaceAdminPayload(validPayload());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.requirements[0].state, "UNKNOWN");
    assert.equal(result.data.accessibility[0].state, "UNKNOWN");
  }
});

test("admin place validation accepts multiple opening intervals", () => {
  const payload = validPayload();
  payload.openingHours.operation[0] = {
    weekday: "MONDAY",
    status: "OPEN",
    periods: [
      { opensAt: "08:00", closesAt: "12:00" },
      { opensAt: "14:00", closesAt: "18:00" },
    ],
    note: "",
  };
  const result = validatePlaceAdminPayload(payload);
  assert.equal(result.ok, true);
});

test("admin place validation rejects invalid URLs", () => {
  const payload = validPayload();
  payload.website = "javascript:alert(1)";
  assert.equal(validatePlaceAdminPayload(payload).ok, false);
});
