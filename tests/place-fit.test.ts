import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePlaceFit, placeFitSummary } from "../src/lib/places/fit-check.ts";

const requirements = [
  { label: "Bez skierowania", status: "positive" as const },
  { label: "Dokument niewymagany", status: "positive" as const },
  { label: "Bezpłatnie", status: "positive" as const },
  { label: "Ostatni meldunek w Łodzi niewymagany", status: "positive" as const },
];

test("fit check confirms practical access when requirements are explicit", () => {
  const result = evaluatePlaceFit(requirements, ["no-referral", "no-document", "no-registration", "free"]);
  assert.equal(placeFitSummary(result), "ok");
  assert.deepEqual(result.map((item) => item.state), ["ok", "ok", "ok", "ok"]);
});

test("fit check flags a known conflict", () => {
  const result = evaluatePlaceFit([
    { label: "Wymagany dokument tożsamości", status: "warning" as const },
  ], ["no-document"]);
  assert.equal(placeFitSummary(result), "conflict");
  assert.equal(result[0]?.state, "conflict");
});

test("fit check stays cautious when data is missing or unknown", () => {
  const result = evaluatePlaceFit([
    { label: "Skierowanie: brak potwierdzonych danych", status: "unknown" as const },
  ], ["no-referral", "free"]);
  assert.equal(placeFitSummary(result), "unknown");
  assert.deepEqual(result.map((item) => item.state), ["unknown", "unknown"]);
});
