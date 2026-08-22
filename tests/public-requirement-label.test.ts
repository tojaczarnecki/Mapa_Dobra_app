import assert from "node:assert/strict";
import test from "node:test";
import { publicRequirementLabel } from "../src/lib/places/requirement-label.ts";

test("public requirement labels keep YES, NO and UNKNOWN distinct", () => {
  assert.equal(
    publicRequirementLabel({ kind: "REFERRAL", state: "YES", label: "Skierowanie" }),
    "Wymagane skierowanie",
  );
  assert.equal(
    publicRequirementLabel({ kind: "REFERRAL", state: "NO", label: "Skierowanie" }),
    "Bez skierowania",
  );
  assert.equal(
    publicRequirementLabel({ kind: "REFERRAL", state: "UNKNOWN", label: "Skierowanie" }),
    "Skierowanie: brak potwierdzonych danych",
  );
});
