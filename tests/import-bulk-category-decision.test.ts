import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client.ts";
import { ImportCandidateStatus } from "../src/generated/prisma/enums.ts";
import { deriveBulkCategoryGroups } from "../src/lib/imports/bulk-category-decision.ts";
import { saveBulkImportCandidateCategoryDecision, type CategoryDecisionPersistenceDatabase, type CategoryDecisionPersistenceTransaction } from "../src/lib/imports/category-decision-persistence.ts";

const batchId = "33333333-3333-4333-8333-333333333333";
const adminId = "22222222-2222-4222-8222-222222222222";
const categoryA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const categoryB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const categoryC = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function reanalysis(categoryIds: string[], sourceValue = "pomoc-prawna; pomoc-socjalna"): Prisma.JsonValue {
  return { version: 1, sourceValue, analyzedAt: "2026-01-01T00:00:00.000Z", analyzedByAdminUserId: adminId, result: { sourceValue, tokens: [], matchedCategoryIds: categoryIds, matchedCategorySlugs: categoryIds.map((id) => id === categoryA ? "pomoc-prawna" : id === categoryB ? "pomoc-socjalna" : "pomoc-psychologiczna"), unresolvedTokens: [], warnings: [], status: "FULLY_MATCHED", requiresReview: false } };
}

type Candidate = {
  id: string; importBatchId: string; candidateKey: string; status: string; resolution: string | null; queueStatus: string | null; reviewReasons: string[]; categorySlugs: string[]; primaryCategorySlug: string | null; createdPlaceId: string | null; proposedData: Prisma.JsonValue; importBatch: { metadata: Prisma.JsonValue }; sources: Array<{ sourceEntryId: string }>; organizationDecision: { decision: string; organizationId: string | null } | null; categoryDecision: null;
};

function candidate(id: string, row: number, categoryIds = [categoryA, categoryB], overrides: Partial<Candidate> = {}): Candidate {
  return { id, importBatchId: batchId, candidateKey: `row-${row}`, status: ImportCandidateStatus.REQUIRES_REVIEW, resolution: null, queueStatus: null, reviewReasons: ["PRIMARY_CATEGORY_DECISION_REQUIRED"], categorySlugs: categoryIds.map((id) => id === categoryA ? "pomoc-prawna" : id === categoryB ? "pomoc-socjalna" : "pomoc-psychologiczna"), primaryCategorySlug: null, createdPlaceId: null, proposedData: { mappedValues: { name: `Miejsce ${row}`, addressLine: "Piotrkowska 10, Łódź", phone: null, website: null, primaryCategory: "pomoc-prawna; pomoc-socjalna" }, analysis: { category: { status: "UNRESOLVED" }, organization: { status: "NONE", organizationId: null }, place: { classification: "NEW" }, inFileDuplicates: [] }, reanalysis: { category: reanalysis(categoryIds) } }, importBatch: { metadata: { kind: "SPREADSHEET" } }, sources: [{ sourceEntryId: `source-${row}` }], organizationDecision: { decision: "NO_ORGANIZATION", organizationId: null }, categoryDecision: null, ...overrides };
}

class BulkFakeDatabase {
  candidates: Candidate[];
  categories = new Map([[categoryA, { id: categoryA, active: true }], [categoryB, { id: categoryB, active: true }], [categoryC, { id: categoryC, active: true }]]);
  decisions = new Map<string, { id: string; candidateId: string; primaryCategoryId: string; resolvedByAdminUserId: string; resolvedAt: Date; note: string | null }>();
  joins: Array<{ decisionId: string; categoryId: string; sortOrder: number }> = [];
  audits: unknown[] = [];
  places: Array<{ id: string; name: string; addressLine: string | null; phone: string | null; organizationId: string | null }> = [];

  constructor(candidates: Candidate[]) { this.candidates = candidates; }

  async $transaction<T>(callback: (transaction: CategoryDecisionPersistenceTransaction) => Promise<T>): Promise<T> {
    const snapshot = structuredClone({ candidates: this.candidates, decisions: this.decisions, joins: this.joins, audits: this.audits });
    try { return await callback(this.transaction() as CategoryDecisionPersistenceTransaction); } catch (error) { this.candidates = snapshot.candidates; this.decisions = snapshot.decisions; this.joins = snapshot.joins; this.audits = snapshot.audits; throw error; }
  }

  transaction() {
    const readDecision = (candidateId: string) => { const decision = this.decisions.get(candidateId); return decision ? { ...decision, categories: this.joins.filter((join) => join.decisionId === decision.id).map(({ categoryId, sortOrder }) => ({ categoryId, sortOrder })) } : null; };
    return {
      $queryRaw: async () => this.candidates.map(({ id }) => ({ id })),
      importCandidate: {
        findUnique: async ({ where }: { where: { id: string } }) => this.candidates.find((item) => item.id === where.id) ?? null,
        findMany: async ({ where }: { where: { id?: { in: string[] } } }) => where.id?.in ? this.candidates.filter((item) => where.id!.in.includes(item.id)) : this.candidates,
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const item = this.candidates.find((candidate) => candidate.id === where.id)!; Object.assign(item, data); return { id: item.id }; },
      },
      importCandidateDuplicateDecision: { findMany: async () => [] },
      organization: { findUnique: async () => null },
      category: { findMany: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.flatMap((id: string) => this.categories.get(id) ? [this.categories.get(id)] : []) },
      place: { findMany: async () => this.places },
      importCandidateCategoryDecision: {
        findUnique: async ({ where }: { where: { candidateId: string } }) => readDecision(where.candidateId),
        upsert: async ({ where, create, update }: { where: { candidateId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => { const existing = this.decisions.get(where.candidateId); const data = existing ? update : create; const decision = existing ?? { id: `decision-${where.candidateId}`, candidateId: where.candidateId, primaryCategoryId: "", resolvedByAdminUserId: "", resolvedAt: new Date(), note: null }; Object.assign(decision, data); this.decisions.set(where.candidateId, decision); return { id: decision.id }; },
      },
      importCandidateCategoryDecisionCategory: {
        deleteMany: async ({ where }: { where: { decisionId: string } }) => { this.joins = this.joins.filter((join) => join.decisionId !== where.decisionId); },
        createMany: async ({ data }: { data: Array<{ decisionId: string; categoryId: string; sortOrder: number }> }) => { this.joins.push(...data); },
      },
      auditLog: { create: async ({ data }: { data: unknown }) => { this.audits.push(data); } },
    };
  }
}

function input(candidateIds: string[], primaryCategoryId = categoryA) {
  return { batchId, candidateIds, primaryCategoryId, selectedCategoryIds: [categoryA, categoryB], resolvedByAdminUserId: adminId };
}

test("groups only persisted eligible multi snapshots and excludes singleton groups", () => {
  const groups = deriveBulkCategoryGroups([
    { id: "1", name: "A", address: null, status: "REQUIRES_REVIEW", primaryCategorySlug: null, categoryDecision: null, reviewReasons: ["PRIMARY_CATEGORY_DECISION_REQUIRED"], reanalysisCategory: reanalysis([categoryA, categoryB]) },
    { id: "2", name: "B", address: null, status: "REQUIRES_REVIEW", primaryCategorySlug: null, categoryDecision: null, reviewReasons: ["PRIMARY_CATEGORY_DECISION_REQUIRED"], reanalysisCategory: reanalysis([categoryA, categoryB]) },
    { id: "3", name: "singleton", address: null, status: "REQUIRES_REVIEW", primaryCategorySlug: null, categoryDecision: null, reviewReasons: ["PRIMARY_CATEGORY_DECISION_REQUIRED"], reanalysisCategory: reanalysis([categoryA]) },
  ], [{ id: categoryA, name: "Pomoc prawna" }, { id: categoryB, name: "Pomoc socjalna" }]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0]?.categoryIds, [categoryA, categoryB]);
  assert.equal(groups[0]?.candidates.length, 2);
});

test("bulk decision writes ten ordinary decisions with primary first and audits each", async () => {
  const candidates = Array.from({ length: 10 }, (_, index) => candidate(`00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, index + 67));
  const db = new BulkFakeDatabase(candidates);
  const result = await saveBulkImportCandidateCategoryDecision(db as unknown as CategoryDecisionPersistenceDatabase, input(candidates.map(({ id }) => id), categoryA));
  assert.deepEqual(result, { status: "SAVED", count: 10 });
  assert.equal(db.decisions.size, 10);
  assert.equal(db.joins.length, 20);
  assert.equal(db.joins.filter((join) => join.sortOrder === 0).length, 10);
  assert.equal(db.audits.length, 10);
  assert.ok(candidates.every((item) => item.status === ImportCandidateStatus.IMPORT_READY));
  assert.ok(candidates.every((item) => item.reviewReasons.length === 0));
});

test("bulk rejects missing or outside primary before any transaction", async () => {
  const candidates = [candidate("00000000-0000-4000-8000-000000000001", 1), candidate("00000000-0000-4000-8000-000000000002", 2)];
  const db = new BulkFakeDatabase(candidates);
  assert.deepEqual(await saveBulkImportCandidateCategoryDecision(db as unknown as CategoryDecisionPersistenceDatabase, input(candidates.map(({ id }) => id), "")), { status: "INVALID_BULK" });
  assert.deepEqual(await saveBulkImportCandidateCategoryDecision(db as unknown as CategoryDecisionPersistenceDatabase, input(candidates.map(({ id }) => id), categoryC)), { status: "INVALID_BULK" });
  assert.equal(db.decisions.size, 0);
});

test("bulk rolls back every candidate when one candidate is no longer eligible", async () => {
  const candidates = Array.from({ length: 3 }, (_, index) => candidate(`00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, index + 1));
  candidates[2]!.status = ImportCandidateStatus.IMPORTED;
  const db = new BulkFakeDatabase(candidates);
  const result = await saveBulkImportCandidateCategoryDecision(db as unknown as CategoryDecisionPersistenceDatabase, input(candidates.map(({ id }) => id)));
  assert.deepEqual(result, { status: "INVALID_CANDIDATE" });
  assert.equal(db.decisions.size, 0);
  assert.equal(db.audits.length, 0);
  assert.ok(candidates.every((item) => item.status !== ImportCandidateStatus.IMPORT_READY));
});

test("bulk decision preserves a current live place blocker", async () => {
  const items = [candidate("00000000-0000-4000-8000-000000000011", 11), candidate("00000000-0000-4000-8000-000000000012", 12)];
  const db = new BulkFakeDatabase(items);
  db.places = [{ id: "place-1", name: "Inny punkt", addressLine: "Piotrkowska 10, Łódź", phone: null, organizationId: null }];
  const result = await saveBulkImportCandidateCategoryDecision(db as unknown as CategoryDecisionPersistenceDatabase, input(items.map(({ id }) => id)));
  assert.equal(result.status, "SAVED");
  assert.equal(items[0]?.status, ImportCandidateStatus.REQUIRES_REVIEW);
  assert.equal(items[0]?.queueStatus, "PENDING");
  assert.ok(items[0]?.reviewReasons.includes("SAME_NORMALIZED_ADDRESS"));
});
