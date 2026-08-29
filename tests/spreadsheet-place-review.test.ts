import assert from "node:assert/strict";
import test from "node:test";
import { canUndoCandidateResolution, hasSpreadsheetSourceRowDuplicate, isAllowedSpreadsheetPlaceId, isSpreadsheetBatchMetadata, isSpreadsheetPlaceReviewCandidate, restoreMatcherMatchedPlaceId } from "../src/lib/imports/spreadsheet-place-review.ts";

const metadata = { kind: "SPREADSHEET" };

function candidate(classification: string, overrides: Record<string, unknown> = {}): { batchMetadata: unknown; status: string; proposedData: unknown; resolution?: string | null } {
  return {
    batchMetadata: metadata,
    status: "REQUIRES_REVIEW",
    proposedData: { analysis: { place: { classification } } },
    ...overrides,
  };
}

test("recognizes spreadsheet metadata without relying on display fields", () => {
  assert.equal(isSpreadsheetBatchMetadata(metadata), true);
  assert.equal(isSpreadsheetBatchMetadata({ kind: "CARITAS" }), false);
  assert.equal(isSpreadsheetBatchMetadata({ title: "SPREADSHEET" }), false);
});

test("recognizes only unresolved spreadsheet exact/possible place reviews", () => {
  assert.equal(isSpreadsheetPlaceReviewCandidate(candidate("EXACT_MATCH")), true);
  assert.equal(isSpreadsheetPlaceReviewCandidate(candidate("POSSIBLE_MATCH")), true);
  assert.equal(isSpreadsheetPlaceReviewCandidate(candidate("NEW")), false);
  assert.equal(isSpreadsheetPlaceReviewCandidate(candidate("EXACT_MATCH", { status: "IMPORT_READY" })), false);
  assert.equal(isSpreadsheetPlaceReviewCandidate(candidate("EXACT_MATCH", { resolution: "SAME_PLACE" })), false);
  assert.equal(isSpreadsheetPlaceReviewCandidate({ ...candidate("EXACT_MATCH"), batchMetadata: { kind: "CARITAS" } }), false);
});

test("multiple exact candidates are handled as possible place review without selecting a place", () => {
  const value = candidate("POSSIBLE_MATCH");
  value.proposedData = { analysis: { place: { classification: "POSSIBLE_MATCH", conflict: true, reasons: ["MULTIPLE_EXACT_CANDIDATES"], candidates: [{ placeId: "place-1" }, { placeId: "place-2" }] }, inFileDuplicates: [] } };
  assert.equal(isSpreadsheetPlaceReviewCandidate(value), true);
});

test("mixed place match and source duplicate stays outside place review", () => {
  const value = candidate("EXACT_MATCH");
  value.proposedData = { analysis: { place: { classification: "EXACT_MATCH" }, inFileDuplicates: [{ rowNumber: 21, reasons: ["SAME_NAME_AND_ADDRESS"] }] } };
  assert.equal(hasSpreadsheetSourceRowDuplicate(value), true);
  assert.equal(isSpreadsheetPlaceReviewCandidate(value), false);
});

test("spreadsheet same-place guard accepts only server-side options", () => {
  assert.equal(isAllowedSpreadsheetPlaceId(["place-1", "place-2"], "place-2"), true);
  assert.equal(isAllowedSpreadsheetPlaceId(["place-1", "place-2"], "arbitrary-place"), false);
  assert.equal(isSpreadsheetPlaceReviewCandidate(candidate("EXACT_MATCH")), true);
  assert.equal(isSpreadsheetPlaceReviewCandidate({ ...candidate("EXACT_MATCH"), batchMetadata: { kind: "CARITAS" } }), false);
});

test("only SAME_PLACE and SKIPPED without a created place can be undone", () => {
  assert.equal(canUndoCandidateResolution({ resolution: "SAME_PLACE", createdPlaceId: null }), true);
  assert.equal(canUndoCandidateResolution({ resolution: "SKIPPED", createdPlaceId: null }), true);
  assert.equal(canUndoCandidateResolution({ resolution: "DIFFERENT_PLACE", createdPlaceId: "place-1" }), false);
  assert.equal(canUndoCandidateResolution({ resolution: null, createdPlaceId: null }), false);
});

test("restores only a single original exact matcher result", () => {
  const exact = { analysis: { place: { classification: "EXACT_MATCH", candidates: [{ placeId: "place-1" }] } } };
  const possible = { analysis: { place: { classification: "POSSIBLE_MATCH", candidates: [{ placeId: "place-1" }] } } };
  const multiple = { analysis: { place: { classification: "POSSIBLE_MATCH", candidates: [{ placeId: "place-1" }, { placeId: "place-2" }] } } };
  assert.equal(restoreMatcherMatchedPlaceId(exact), "place-1");
  assert.equal(restoreMatcherMatchedPlaceId(possible), null);
  assert.equal(restoreMatcherMatchedPlaceId(multiple), null);
  assert.equal(restoreMatcherMatchedPlaceId({}), null);
});
