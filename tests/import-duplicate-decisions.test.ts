import assert from "node:assert/strict";
import test from "node:test";
import { activeImportIssueCodesForCandidate } from "../src/lib/imports/issue-labels.ts";
import { resolveEffectiveCategory } from "../src/lib/imports/category-decisions.ts";
import { canonicalizeDuplicatePair, getDuplicateDecisionState, getDuplicateDisposition, isOriginalDuplicateEdge, mapDuplicateDecision, reconcileCandidateAfterDuplicateDecision, type StoredDuplicateDecision } from "../src/lib/imports/duplicate-decisions.ts";

test("canonical duplicate pair is identical in either direction", () => {
  assert.deepEqual(canonicalizeDuplicatePair("candidate-a", "candidate-b"), { candidateAId: "candidate-a", candidateBId: "candidate-b" });
  assert.deepEqual(canonicalizeDuplicatePair("candidate-b", "candidate-a"), { candidateAId: "candidate-a", candidateBId: "candidate-b" });
});

test("canonical duplicate pair rejects a self relation", () => {
  assert.throws(() => canonicalizeDuplicatePair("candidate-a", "candidate-a"), /TWO_CANDIDATES/);
});

test("semantic decisions map to the canonical A/B sides", () => {
  assert.equal(mapDuplicateDecision("a", "b", "KEEP_CURRENT"), "KEEP_A");
  assert.equal(mapDuplicateDecision("b", "a", "KEEP_CURRENT"), "KEEP_B");
  assert.equal(mapDuplicateDecision("a", "b", "KEEP_OTHER"), "KEEP_B");
  assert.equal(mapDuplicateDecision("b", "a", "KEEP_OTHER"), "KEEP_A");
  assert.equal(mapDuplicateDecision("b", "a", "DIFFERENT_RECORDS"), "DIFFERENT_RECORDS");
});

test("read and write edge validation share the original row relation", () => {
  const first = { rowNumber: 87, proposedData: { analysis: { inFileDuplicates: [{ rowNumber: 2 }] } } };
  const second = { rowNumber: 2, proposedData: { analysis: { inFileDuplicates: [] } } };
  assert.equal(isOriginalDuplicateEdge(first, second), true);
  assert.equal(isOriginalDuplicateEdge(first, { rowNumber: 99, proposedData: { analysis: { inFileDuplicates: [] } } }), false);
});

test("unresolved, kept and loser state is derived from pair decisions", () => {
  const state = getDuplicateDecisionState("candidate-a", [{ rowNumber: 21 }, { rowNumber: 32 }], new Map([[21, "candidate-b"], [32, "candidate-c"]]), [
    { candidateAId: "candidate-a", candidateBId: "candidate-b", decision: "KEEP_A" },
  ]);
  assert.equal(state.isKept, true);
  assert.equal(state.isLoser, false);
  assert.equal(state.isUnresolved, true);
  assert.equal(state.unresolvedEdges.length, 1);
});

test("KEEP_B marks the current candidate as the loser", () => {
  const state = getDuplicateDecisionState("candidate-a", [{ rowNumber: 21 }], new Map([[21, "candidate-b"]]), [
    { candidateAId: "candidate-a", candidateBId: "candidate-b", decision: "KEEP_B" },
  ]);
  assert.equal(state.isKept, false);
  assert.equal(state.isLoser, true);
  assert.equal(state.isUnresolved, false);
});

test("all edges can be independently resolved as different records", () => {
  const state = getDuplicateDecisionState("candidate-b", [{ rowNumber: 8 }, { rowNumber: 32 }], new Map([[8, "candidate-a"], [32, "candidate-c"]]), [
    { candidateAId: "candidate-a", candidateBId: "candidate-b", decision: "DIFFERENT_RECORDS" },
    { candidateAId: "candidate-b", candidateBId: "candidate-c", decision: "DIFFERENT_RECORDS" },
  ]);
  assert.equal(state.isUnresolved, false);
  assert.equal(state.allEdgesResolvedAsDifferent, true);
  assert.equal(state.isKept, false);
  assert.equal(state.isLoser, false);
});

test("a partially resolved group remains unresolved", () => {
  const state = getDuplicateDecisionState("candidate-c", [{ rowNumber: 8 }, { rowNumber: 21 }], new Map([[8, "candidate-a"], [21, "candidate-b"]]), [
    { candidateAId: "candidate-a", candidateBId: "candidate-c", decision: "DIFFERENT_RECORDS" },
  ]);
  assert.equal(state.isUnresolved, true);
  assert.equal(state.allEdgesResolvedAsDifferent, false);
});

test("KEEP_A and KEEP_B always refer to the canonical pair order", () => {
  assert.deepEqual(canonicalizeDuplicatePair("b", "a"), { candidateAId: "a", candidateBId: "b" });
  const keepA = getDuplicateDecisionState("a", [{ rowNumber: 2 }], new Map([[2, "b"]]), [
    { candidateAId: "a", candidateBId: "b", decision: "KEEP_A" },
  ]);
  const keepB = getDuplicateDecisionState("b", [{ rowNumber: 1 }], new Map([[1, "a"]]), [
    { candidateAId: "a", candidateBId: "b", decision: "KEEP_B" },
  ]);
  assert.equal(keepA.isKept, true);
  assert.equal(keepA.isLoser, false);
  assert.equal(keepB.isKept, true);
  assert.equal(keepB.isLoser, false);
});

test("a candidate kept in one edge and lost in another reports a conflict", () => {
  const state = getDuplicateDecisionState("a", [{ rowNumber: 2 }, { rowNumber: 3 }], new Map([[2, "b"], [3, "c"]]), [
    { candidateAId: "a", candidateBId: "b", decision: "KEEP_A" },
    { candidateAId: "a", candidateBId: "c", decision: "KEEP_B" },
  ]);
  assert.equal(state.isKept, true);
  assert.equal(state.isLoser, true);
  assert.equal(state.hasConflictingKeepOutcome, true);
});

test("duplicate disposition distinguishes unresolved, loser, kept and different", () => {
  const refs = new Map([[2, "b"], [3, "c"]]);
  const data = { analysis: { category: { status: "MATCHED" }, organization: { status: "NONE" }, place: { classification: "NEW" }, errors: [] } };
  const state = (decisions: StoredDuplicateDecision[]) => getDuplicateDecisionState("a", [{ rowNumber: 2 }, { rowNumber: 3 }], refs, decisions);
  assert.equal(getDuplicateDisposition(state([])), "UNRESOLVED");
  assert.equal(getDuplicateDisposition(state([{ candidateAId: "a", candidateBId: "b", decision: "KEEP_B" }, { candidateAId: "a", candidateBId: "c", decision: "DIFFERENT_RECORDS" }])), "LOSER");
  assert.equal(getDuplicateDisposition(state([{ candidateAId: "a", candidateBId: "b", decision: "KEEP_A" }, { candidateAId: "a", candidateBId: "c", decision: "DIFFERENT_RECORDS" }])), "KEPT");
  assert.equal(getDuplicateDisposition(getDuplicateDecisionState("a", [{ rowNumber: 2 }], refs, [{ candidateAId: "a", candidateBId: "b", decision: "DIFFERENT_RECORDS" }])), "RESOLVED_DIFFERENT");
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision({ status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, proposedData: data }, "RESOLVED_DIFFERENT"), { status: "IMPORT_READY", queueStatus: null });
});

test("resolved duplicate resumes place review and loser remains derived review", () => {
  const placeData = { analysis: { category: { status: "MATCHED" }, organization: { status: "NONE" }, place: { classification: "POSSIBLE_MATCH" }, errors: [] } };
  const candidate = { status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, proposedData: placeData };
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision(candidate, "KEPT"), { status: "REQUIRES_REVIEW", queueStatus: "PENDING" });
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision(candidate, "LOSER"), { status: "REQUIRES_REVIEW", queueStatus: null });
});

test("place review takes priority over remaining organization or category blockers", () => {
  const placeMatch = { analysis: { category: { status: "MATCHED" }, organization: { status: "POSSIBLE" }, place: { classification: "EXACT_MATCH" }, errors: [] } };
  const categoryMatch = { analysis: { category: { status: "UNRESOLVED" }, organization: { status: "NONE" }, place: { classification: "POSSIBLE_MATCH" }, errors: [] } };
  const organizationOnly = { analysis: { category: { status: "MATCHED" }, organization: { status: "POSSIBLE" }, place: { classification: "NEW" }, errors: [] } };
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision({ status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, proposedData: placeMatch }, "RESOLVED_DIFFERENT"), { status: "REQUIRES_REVIEW", queueStatus: "PENDING" });
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision({ status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, proposedData: categoryMatch }, "RESOLVED_DIFFERENT"), { status: "REQUIRES_REVIEW", queueStatus: "PENDING" });
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision({ status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, proposedData: organizationOnly }, "RESOLVED_DIFFERENT"), { status: "REQUIRES_REVIEW", queueStatus: null });
});

test("reapplying an existing different-records decision repairs a stale place-review consequence", () => {
  const exactMatchWithOrganizationReview = { analysis: { category: { status: "MATCHED" }, organization: { status: "POSSIBLE" }, place: { classification: "EXACT_MATCH" }, errors: [] } };
  const result = reconcileCandidateAfterDuplicateDecision({ status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, proposedData: exactMatchWithOrganizationReview }, "RESOLVED_DIFFERENT");
  assert.deepEqual(result, { status: "REQUIRES_REVIEW", queueStatus: "PENDING" });
});

test("reapplying a resolved decision restores ready flow or keeps an unresolved group blocked", () => {
  const ready = { analysis: { category: { status: "MATCHED" }, organization: { status: "NONE" }, place: { classification: "NEW" }, errors: [] } };
  const review = { analysis: { category: { status: "MATCHED" }, organization: { status: "NONE" }, place: { classification: "NEW" }, errors: [] } };
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision({ status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, proposedData: ready }, "RESOLVED_DIFFERENT"), { status: "IMPORT_READY", queueStatus: null });
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision({ status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, proposedData: review }, "UNRESOLVED"), { status: "REQUIRES_REVIEW", queueStatus: null });
});

test("duplicate reconciliation keeps a valid persisted category decision resolved", () => {
  const candidate = {
    status: "REQUIRES_REVIEW",
    resolution: null,
    createdPlaceId: null,
    proposedData: { analysis: { category: { status: "UNRESOLVED" }, organization: { status: "NONE" }, place: { classification: "NEW" }, errors: [] } },
  };
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision(candidate, "RESOLVED_DIFFERENT", false, true), { status: "IMPORT_READY", queueStatus: null });
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision(candidate, "RESOLVED_DIFFERENT", false, false), { status: "REQUIRES_REVIEW", queueStatus: null });
});

test("duplicate reconciliation blocks an invalid or inactive persisted category decision", () => {
  const candidate = {
    status: "REQUIRES_REVIEW",
    resolution: null,
    createdPlaceId: null,
    proposedData: { analysis: { category: { status: "UNRESOLVED" }, organization: { status: "NONE" }, place: { classification: "NEW" }, errors: [] } },
  };
  const effective = resolveEffectiveCategory(
    { categoryIds: ["category-a"], requiresReview: false, unresolvedTokens: [], warnings: [] },
    { primaryCategoryId: "category-a", categories: [{ categoryId: "category-a", sortOrder: 0 }] },
    [{ id: "category-a", active: false }],
  );
  assert.equal(effective.status, "REQUIRES_REVIEW");
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision(candidate, "RESOLVED_DIFFERENT", false, effective.status !== "REQUIRES_REVIEW"), { status: "REQUIRES_REVIEW", queueStatus: null });
});

test("unresolved duplicate remains an explicit blocker after category resolution", () => {
  const candidate = {
    status: "REQUIRES_REVIEW",
    resolution: null,
    createdPlaceId: null,
    reviewReasons: [],
    proposedData: { analysis: { category: { status: "UNRESOLVED" }, organization: { status: "NONE" }, place: { classification: "NEW" }, errors: [] } },
  };
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision(candidate, "UNRESOLVED", true, true), {
    status: "REQUIRES_REVIEW",
    queueStatus: null,
    reviewReasons: ["SOURCE_ROW_DUPLICATE"],
  });
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision({ ...candidate, reviewReasons: ["NEW_ORGANIZATION_CANDIDATE"] }, "UNRESOLVED", false, true), {
    status: "REQUIRES_REVIEW",
    queueStatus: null,
    reviewReasons: ["SOURCE_ROW_DUPLICATE", "NEW_ORGANIZATION_CANDIDATE"],
  });
});

test("resolved duplicate removes its blocker and permits ready flow", () => {
  const candidate = {
    status: "REQUIRES_REVIEW",
    resolution: null,
    createdPlaceId: null,
    reviewReasons: ["SOURCE_ROW_DUPLICATE"],
    proposedData: { analysis: { category: { status: "UNRESOLVED" }, organization: { status: "NONE" }, place: { classification: "NEW" }, errors: [] } },
  };
  assert.deepEqual(reconcileCandidateAfterDuplicateDecision(candidate, "RESOLVED_DIFFERENT", true, true), {
    status: "IMPORT_READY",
    queueStatus: null,
    reviewReasons: [],
  });
});

test("manual terminal states are not changed by duplicate reconciliation", () => {
  const candidate = { status: "SKIPPED", resolution: "SKIPPED", createdPlaceId: null, proposedData: {} };
  assert.equal(reconcileCandidateAfterDuplicateDecision(candidate, "RESOLVED_DIFFERENT"), null);
  assert.equal(reconcileCandidateAfterDuplicateDecision({ ...candidate, status: "IMPORTED", resolution: null, createdPlaceId: "place-1" }, "RESOLVED_DIFFERENT"), null);
});

test("a group edge change is evaluated against all remaining edges", () => {
  const refs = new Map([[2, "a"], [3, "c"]]);
  const state = getDuplicateDecisionState("b", [{ rowNumber: 2 }, { rowNumber: 3 }], refs, [
    { candidateAId: "a", candidateBId: "b", decision: "DIFFERENT_RECORDS" },
  ]);
  assert.equal(getDuplicateDisposition(state), "UNRESOLVED");
});

test("resolved duplicate issues are removed only from active presentation", () => {
  const proposedData = { analysis: { place: { classification: "NEW", reasons: [] }, inFileDuplicates: [{ reasons: ["SAME_ADDRESS_AND_PHONE"] }] } };
  const reasons = ["SOURCE_ROW_DUPLICATE", "SAME_ADDRESS_AND_PHONE", "MATCHED_BY_SLUG", "NEW_ORGANIZATION_CANDIDATE"];
  assert.deepEqual(activeImportIssueCodesForCandidate(proposedData, reasons, "UNRESOLVED"), ["SOURCE_ROW_DUPLICATE", "SAME_ADDRESS_AND_PHONE", "NEW_ORGANIZATION_CANDIDATE"]);
  assert.deepEqual(activeImportIssueCodesForCandidate(proposedData, reasons, "RESOLVED_DIFFERENT"), ["NEW_ORGANIZATION_CANDIDATE"]);
  assert.deepEqual(reasons, ["SOURCE_ROW_DUPLICATE", "SAME_ADDRESS_AND_PHONE", "MATCHED_BY_SLUG", "NEW_ORGANIZATION_CANDIDATE"]);
});

test("a place reason is retained when the same code also appears in duplicate provenance", () => {
  const proposedData = { analysis: { place: { classification: "EXACT_MATCH", reasons: ["SAME_ADDRESS_AND_PHONE"] }, inFileDuplicates: [{ reasons: ["SAME_ADDRESS_AND_PHONE"] }] } };
  assert.deepEqual(activeImportIssueCodesForCandidate(proposedData, ["SAME_ADDRESS_AND_PHONE"], "RESOLVED_DIFFERENT"), ["SAME_ADDRESS_AND_PHONE"]);
});

test("resolved organization blockers are hidden without changing provenance", () => {
  const proposedData = { analysis: { place: { classification: "NEW", reasons: [] }, inFileDuplicates: [] } };
  const reasons = ["NEW_ORGANIZATION_CANDIDATE", "MATCHED_BY_IDENTIFIER", "UNRESOLVED_CATEGORY"];
  assert.deepEqual(activeImportIssueCodesForCandidate(proposedData, reasons, "NONE", true), ["UNRESOLVED_CATEGORY"]);
  assert.deepEqual(reasons, ["NEW_ORGANIZATION_CANDIDATE", "MATCHED_BY_IDENTIFIER", "UNRESOLVED_CATEGORY"]);
});
