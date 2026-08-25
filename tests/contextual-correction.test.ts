import assert from "node:assert/strict";
import test from "node:test";
import {
  contextualCorrectionLabels,
  decodeContextualCorrection,
  encodeContextualCorrection,
} from "../src/lib/submissions/contextual-correction.ts";

test("contextual correction envelope preserves an explicit old/new diff", () => {
  const encoded = encodeContextualCorrection({
    kind: "contextual-place-correction",
    field: "phone",
    label: contextualCorrectionLabels.phone,
    oldValue: "48123123123",
    proposedValue: "48555111222",
    comment: "Numer z aktualnej wizytówki.",
  });
  assert.deepEqual(decodeContextualCorrection(encoded), {
    kind: "contextual-place-correction",
    field: "phone",
    label: "Numer telefonu",
    oldValue: "48123123123",
    proposedValue: "48555111222",
    comment: "Numer z aktualnej wizytówki.",
  });
});

test("contextual correction decoder rejects arbitrary payloads", () => {
  assert.equal(decodeContextualCorrection("{\"field\":\"redirect\"}"), null);
  assert.equal(decodeContextualCorrection("not-json"), null);
});
