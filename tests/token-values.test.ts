import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTokenValues, splitTokenInput } from "../src/lib/token-values.ts";

test("token values trim, ignore empty entries and deduplicate case-insensitively", () => {
  assert.deepEqual(normalizeTokenValues(["  Kobiety ", "", "kobiety", " Mężczyźni "]), ["Kobiety", "Mężczyźni"]);
});

test("token values preserve order and enforce item and length limits", () => {
  assert.equal(normalizeTokenValues(Array.from({ length: 31 }, (_, index) => String(index))).length, 30);
  assert.deepEqual(normalizeTokenValues(["a".repeat(241), "valid"]), ["valid"]);
});

test("token input splits pasted values by comma and newline", () => {
  assert.deepEqual(splitTokenInput("kobiety\nmężczyźni, osoby starsze"), ["kobiety", "mężczyźni", " osoby starsze"]);
});
