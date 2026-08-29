import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectiveCategory, type CategoryAnalysisState, type CategoryDecisionCategory, type PersistedCategoryDecision } from "../src/lib/imports/category-decisions.ts";

const categories: CategoryDecisionCategory[] = [
  { id: "food", active: true },
  { id: "legal", active: true },
  { id: "social", active: true },
  { id: "inactive", active: false },
];

function analysis(overrides: Partial<CategoryAnalysisState> = {}): CategoryAnalysisState {
  return { categoryIds: ["food"], requiresReview: false, unresolvedTokens: [], warnings: [], ...overrides };
}

function decision(primaryCategoryId: string, categoryIds: string[], sortOrders = categoryIds.map((_, index) => index)): PersistedCategoryDecision {
  return { primaryCategoryId, categories: categoryIds.map((categoryId, index) => ({ categoryId, sortOrder: sortOrders[index] ?? index })) };
}

test("resolves an active singleton automatically", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis(), null, categories), { status: "AUTO_SINGLE", primaryCategoryId: "food", categoryIds: ["food"] });
});

test("keeps multi, partial and unresolved analysis in review", () => {
  assert.equal(resolveEffectiveCategory(analysis({ categoryIds: ["legal", "social"] }), null, categories).status, "REQUIRES_REVIEW");
  assert.equal(resolveEffectiveCategory(analysis({ categoryIds: ["social"], requiresReview: true, unresolvedTokens: ["inne"] }), null, categories).status, "REQUIRES_REVIEW");
  assert.equal(resolveEffectiveCategory(analysis({ categoryIds: [], requiresReview: true }), null, categories).status, "REQUIRES_REVIEW");
});

test("accepts a valid admin decision and puts primary first", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis({ categoryIds: ["food"] }), decision("legal", ["social", "legal"], [0, 1]), categories), { status: "ADMIN_DECISION", primaryCategoryId: "legal", categoryIds: ["legal", "social"] });
});

test("admin decision overrides an auto-single analysis", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis(), decision("social", ["social", "food"]), categories), { status: "ADMIN_DECISION", primaryCategoryId: "social", categoryIds: ["social", "food"] });
});

test("rejects a primary category outside the selected set", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis(), decision("legal", ["food"]), categories), { status: "REQUIRES_REVIEW", reason: "INVALID_ADMIN_DECISION" });
});

test("rejects an empty selected set", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis(), decision("food", []), categories), { status: "REQUIRES_REVIEW", reason: "INVALID_ADMIN_DECISION" });
});

test("rejects inactive primary and secondary categories", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis(), decision("inactive", ["inactive"]), categories), { status: "REQUIRES_REVIEW", reason: "INACTIVE_CATEGORY" });
  assert.deepEqual(resolveEffectiveCategory(analysis(), decision("food", ["food", "inactive"]), categories), { status: "REQUIRES_REVIEW", reason: "INACTIVE_CATEGORY" });
});

test("does not silently fall back after an invalid admin decision", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis(), decision("food", ["missing"]), categories), { status: "REQUIRES_REVIEW", reason: "INVALID_ADMIN_DECISION" });
});

test("rejects duplicate selected category IDs", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis(), decision("food", ["food", "food"]), categories), { status: "REQUIRES_REVIEW", reason: "INVALID_ADMIN_DECISION" });
});

test("supports legacy singleton analysis without multi-category provenance", () => {
  assert.deepEqual(resolveEffectiveCategory(analysis({ categoryIds: ["food"] }), null, categories), { status: "AUTO_SINGLE", primaryCategoryId: "food", categoryIds: ["food"] });
});
