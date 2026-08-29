import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeDuplicatePair, getDuplicateDecisionState } from "../src/lib/imports/duplicate-decisions.ts";

test("canonical duplicate pair is identical in either direction", () => {
  assert.deepEqual(canonicalizeDuplicatePair("candidate-a", "candidate-b"), { candidateAId: "candidate-a", candidateBId: "candidate-b" });
  assert.deepEqual(canonicalizeDuplicatePair("candidate-b", "candidate-a"), { candidateAId: "candidate-a", candidateBId: "candidate-b" });
});

test("canonical duplicate pair rejects a self relation", () => {
  assert.throws(() => canonicalizeDuplicatePair("candidate-a", "candidate-a"), /TWO_CANDIDATES/);
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
