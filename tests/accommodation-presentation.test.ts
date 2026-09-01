import assert from "node:assert/strict";
import test from "node:test";
import { demoAccommodations } from "../src/data/demo-accommodations.ts";
import {
  getAccommodationAvailabilityPresentation,
  getAccommodationPetPresentation,
  getAccommodationPrimaryAction,
  getAccommodationResultHeading,
  getAccommodationSobrietyLabel,
} from "../src/lib/accommodations/presentation.ts";
import {
  ACCOMMODATION_FRESHNESS_LIMIT_MS,
  resolveAvailabilityFreshness,
  resolveAvailabilityState,
  staleAvailabilityNote,
} from "../src/lib/accommodations/freshness.ts";

const now = new Date("2026-08-18T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

test("availability presentation distinguishes free, no places, stale and unknown", () => {
  assert.equal(getAccommodationAvailabilityPresentation("fresh").status, "confirmed");
  assert.equal(getAccommodationAvailabilityPresentation("few").status, "condition");
  assert.equal(getAccommodationAvailabilityPresentation("none").status, "absent");
  assert.equal(getAccommodationAvailabilityPresentation("stale").status, "unknown");
  assert.equal(getAccommodationAvailabilityPresentation("unknown").status, "unknown");
});

test("freshness derives stale state from an old report and keeps explicit unknown", () => {
  assert.equal(resolveAvailabilityState("AVAILABLE", ago(30 * 60_000), now), "AVAILABLE");
  assert.equal(resolveAvailabilityState("FULL", ago(5 * 60_000), now), "FULL");
  assert.equal(resolveAvailabilityState("AVAILABLE", ago(ACCOMMODATION_FRESHNESS_LIMIT_MS + 1), now), "STALE");
  assert.equal(resolveAvailabilityState("UNKNOWN", ago(5 * 60_000), now), "UNKNOWN");
  assert.equal(resolveAvailabilityFreshness("AVAILABLE", null, now), "UNKNOWN");
});

test("stale availability explains the last report without implying admission", () => {
  assert.match(staleAvailabilityNote("AVAILABLE", 6), /Ostatnio zgłoszono 6 wolne miejsca/);
  assert.match(staleAvailabilityNote("FULL"), /Ostatnio zgłoszono brak miejsc/);
  assert.match(staleAvailabilityNote("STALE"), /Brak aktualnego potwierdzenia/);
  assert.doesNotMatch(staleAvailabilityNote("AVAILABLE", 6), /gwarancj|zapewn/iu);
});

test("accommodation CTA prioritizes phone confirmation, then safe search, then route", () => {
  assert.equal(getAccommodationPrimaryAction({ phoneHref: "tel:+48123", routeHref: "https://maps.example", closedNow: false, needsConfirmation: true })?.label, "Zadzwoń i sprawdź miejsce");
  assert.equal(getAccommodationPrimaryAction({ routeHref: "https://maps.example", closedNow: false, needsConfirmation: true })?.label, "Zobacz inne miejsca");
  assert.equal(getAccommodationPrimaryAction({ routeHref: "https://maps.example", closedNow: true, needsConfirmation: false })?.label, "Znajdź miejsce otwarte teraz");
  assert.equal(getAccommodationPrimaryAction({ routeHref: "https://maps.example", closedNow: false, needsConfirmation: false })?.label, "Wyznacz trasę");
  assert.equal(getAccommodationPrimaryAction({ phoneHref: "tel:+48123", routeHref: "https://maps.example", closedNow: false, needsConfirmation: false, hasMismatch: true })?.label, "Zobacz inne możliwości");
  assert.equal(getAccommodationPrimaryAction({ routeHref: "https://maps.example", closedNow: false, needsConfirmation: false })?.kind, "route");
});

test("result heading distinguishes exact, confirmation and mismatch results", () => {
  assert.equal(getAccommodationResultHeading([], []), "Najlepsza dostępna opcja");
  assert.equal(getAccommodationResultHeading([], ["Wymaga potwierdzenia"]), "Miejsce, które warto potwierdzić");
  assert.equal(getAccommodationResultHeading(["Nie przyjmuje psa."], []), "Najbliższa alternatywa");
});

test("sobriety enum values have natural public labels", () => {
  assert.equal(getAccommodationSobrietyLabel("SOBRIETY_REQUIRED"), "Wymagana trzeźwość");
  assert.equal(getAccommodationSobrietyLabel("ZERO_TOLERANCE"), "Obowiązuje pełna trzeźwość");
  assert.equal(getAccommodationSobrietyLabel("INDIVIDUAL_ASSESSMENT"), "Przyjęcie po indywidualnej ocenie");
  assert.doesNotMatch(getAccommodationSobrietyLabel("ZERO_TOLERANCE"), /0,0/);
});

test("audience, admission hours and availability are separate accommodation facts", () => {
  const place = demoAccommodations.find((item) => item.id === "schronisko-nowy-poczatek");
  assert.equal(place?.audienceLabel, "dla mężczyzn");
  assert.equal(place?.admissionsToday, "Przyjęcia dzisiaj do 22:00");
  assert.equal(place?.availability.freePlaces, 4);
  assert.notEqual(place?.admissionsToday, "");
});

test("pet policies preserve YES, NO, UNKNOWN and conditional semantics", () => {
  assert.equal(getAccommodationPetPresentation("ACCEPTED").status, "confirmed");
  assert.equal(getAccommodationPetPresentation("NOT_ACCEPTED").status, "absent");
  assert.equal(getAccommodationPetPresentation("UNKNOWN").status, "unknown");
  assert.equal(getAccommodationPetPresentation("BY_ARRANGEMENT").status, "condition");
  assert.match(getAccommodationPetPresentation("NOT_ACCEPTED").label, /Nie można przyjść/);
  assert.match(getAccommodationPetPresentation("UNKNOWN").label, /Brak potwierdzonych informacji/);
});

test("demo accommodation set covers current, zero, stale and missing availability reports", () => {
  assert.equal(demoAccommodations.find((item) => item.id === "schronisko-nowy-poczatek")?.availability.state, "fresh");
  assert.equal(demoAccommodations.find((item) => item.id === "nocleg-koedukacyjny-przystan")?.availability.state, "none");
  assert.equal(demoAccommodations.find((item) => item.id === "wspolny-dom-rodzin")?.availability.state, "stale");
  assert.equal(demoAccommodations.find((item) => item.id === "punkt-noclegowy-polaczenie")?.availability.state, "unknown");
});
