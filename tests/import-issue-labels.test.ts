import assert from "node:assert/strict";
import test from "node:test";
import { importIssueLabel } from "../src/lib/imports/issue-labels.ts";

test("translates known import issue codes and safely falls back for unknown codes", () => {
  assert.equal(importIssueLabel("SOURCE_ROW_DUPLICATE"), "Możliwy duplikat innego wiersza w tym pliku");
  assert.equal(importIssueLabel("MATCHED_BY_SLUG"), "Dopasowano po identyfikatorze kategorii");
  assert.equal(importIssueLabel("SIMILAR_NAME"), "Podobna nazwa organizacji lub miejsca");
  assert.equal(importIssueLabel("UNKNOWN_CODE"), "Wymaga ręcznego sprawdzenia");
});
