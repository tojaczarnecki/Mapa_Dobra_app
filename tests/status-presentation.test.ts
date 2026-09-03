import assert from "node:assert/strict";
import test from "node:test";
import {
  detailToneToPublicStatus,
  publicStatusForLabel,
  publicStatusSymbol,
} from "../src/lib/public/status-presentation.ts";
import { getResultPrimaryAction } from "../src/lib/places/result-presentation.ts";
import { demoPlaces } from "../src/data/demo-places.ts";

test("public status symbols are distinct and stable", () => {
  assert.deepEqual(publicStatusSymbol, {
    confirmed: "✓",
    absent: "×",
    unknown: "?",
    condition: "!",
  });
});

test("detail tones map to the public semantic status contract", () => {
  assert.equal(detailToneToPublicStatus("positive"), "confirmed");
  assert.equal(detailToneToPublicStatus("neutral"), "absent");
  assert.equal(detailToneToPublicStatus("unknown"), "unknown");
  assert.equal(detailToneToPublicStatus("warning"), "condition");
});

test("common condition labels never render unknown information as confirmed", () => {
  assert.equal(publicStatusForLabel("Bez skierowania"), "confirmed");
  assert.equal(publicStatusForLabel("Bez wymogu ostatniego meldunku"), "confirmed");
  assert.equal(publicStatusForLabel("Wymagane skierowanie"), "condition");
  assert.equal(publicStatusForLabel("Brak potwierdzonych godzin"), "unknown");
  assert.equal(publicStatusForLabel("Nie przyjmuje zwierząt"), "absent");
});

test("result CTA prefers confirmation calls for uncertain opening data", () => {
  const uncertain = demoPlaces.find((place) => place.status === "needsConfirmation");
  const confirmed = demoPlaces.find((place) => place.status === "open");
  assert.equal(getResultPrimaryAction({ ...uncertain!, phone: "+48123123123" })?.label, "Zadzwoń i potwierdź");
  assert.equal(getResultPrimaryAction(confirmed!)?.label, "Trasa");
});

test("result CTA avoids travel when availability is uncertain or closed", () => {
  const detailsHref = "/lodz/jedzenie/niepewny-punkt";
  const uncertain = demoPlaces.find((place) => place.status === "unknownHours");
  const closed = demoPlaces.find((place) => place.status === "closed");
  const laterToday = demoPlaces.find((place) => place.status === "openToday");

  assert.deepEqual(getResultPrimaryAction({ ...uncertain!, phone: undefined }, detailsHref), {
    href: detailsHref,
    label: "Sprawdź szczegóły",
    kind: "details",
  });
  assert.equal(getResultPrimaryAction({ ...closed! }, detailsHref)?.label, "Zobacz godziny");
  assert.equal(getResultPrimaryAction({ ...laterToday! }, detailsHref)?.label, "Zobacz godziny");
});
