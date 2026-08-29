import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client.ts";
import { reanalyseImportCandidateCategory, type CategoryReanalysisDatabase, type CategoryReanalysisTransaction } from "../src/lib/imports/category-reanalysis.ts";
import { resolveEffectiveCategory } from "../src/lib/imports/category-decisions.ts";

const candidateId = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";

const originalAnalysis = {
  status: "REVIEW",
  category: { status: "UNRESOLVED", categorySlug: null },
  organization: { status: "NONE", organizationId: null },
  place: { classification: "NEW", candidates: [] },
};

class FakeDatabase implements CategoryReanalysisDatabase {
  candidate = {
    id: candidateId,
    importBatchId: "33333333-3333-4333-8333-333333333333",
    candidateKey: "row-12",
    status: "REQUIRES_REVIEW",
    resolution: null,
    queueStatus: null,
    createdPlaceId: null,
    categorySlugs: [] as string[],
    primaryCategorySlug: null as string | null,
    reviewReasons: ["UNRESOLVED_CATEGORY"],
    proposedData: { mappedValues: { primaryCategory: "pomoc-socjalna" }, analysis: originalAnalysis },
    importBatch: { metadata: { kind: "SPREADSHEET" } as Prisma.JsonValue },
    organizationDecision: { decision: "NO_ORGANIZATION", organizationId: null } as { decision: string; organizationId: string | null } | null,
    categoryDecision: null,
  };
  categories = [{ id: "category-social", slug: "pomoc-socjalna", name: "Pomoc socjalna", active: true }];
  updates: Prisma.ImportCandidateUpdateArgs["data"][] = [];
  audits: Prisma.AuditLogCreateArgs["data"][] = [];
  duplicateCandidate: { id: string; candidateKey: string; proposedData: Prisma.JsonValue } | null = null;

  private transaction(): CategoryReanalysisTransaction {
    return {
      $queryRaw: async <T>() => [{ id: candidateId }] as T[],
      importCandidate: {
        findUnique: async () => this.candidate,
        findMany: async () => [this.candidate, ...(this.duplicateCandidate ? [{ ...this.candidate, ...this.duplicateCandidate, status: "REQUIRES_REVIEW", resolution: null, createdPlaceId: null, queueStatus: null, reviewReasons: [] }] : [])],
        update: async (args) => { this.updates.push(args.data); this.candidate = { ...this.candidate, ...args.data } as typeof this.candidate; return { id: candidateId }; },
      },
      importCandidateDuplicateDecision: { findMany: async () => [] },
      category: { findMany: async () => this.categories },
      organization: { findUnique: async () => null },
      auditLog: { create: async (args) => { this.audits.push(args.data); return {}; } },
    };
  }

  async $transaction<T>(callback: (transaction: CategoryReanalysisTransaction) => Promise<T>): Promise<T> {
    return callback(this.transaction());
  }
}

test("controlled reanalysis stores an additive snapshot and reconciles a singleton", async () => {
  const db = new FakeDatabase();
  const before = structuredClone(db.candidate.proposedData);
  const result = await reanalyseImportCandidateCategory(db, { candidateId, resolvedByAdminUserId: adminId });

  assert.equal(result.status, "REANALYZED");
  assert.equal(db.candidate.status, "IMPORT_READY");
  assert.deepEqual(db.candidate.categorySlugs, ["pomoc-socjalna"]);
  assert.equal(db.candidate.primaryCategorySlug, "pomoc-socjalna");
  const updated = db.candidate.proposedData as unknown as { analysis: typeof originalAnalysis; reanalysis: { category: { result: { matchedCategorySlugs: string[] } } } };
  assert.deepEqual(updated.analysis, before.analysis);
  assert.deepEqual(updated.reanalysis.category.result.matchedCategorySlugs, ["pomoc-socjalna"]);
  assert.equal(db.audits.length, 1);
});

test("controlled reanalysis is idempotent and preserves its original timestamp", async () => {
  const db = new FakeDatabase();
  const first = await reanalyseImportCandidateCategory(db, { candidateId, resolvedByAdminUserId: adminId });
  const second = await reanalyseImportCandidateCategory(db, { candidateId, resolvedByAdminUserId: adminId });

  assert.equal(first.status, "REANALYZED");
  assert.equal(second.status, "NO_OP");
  assert.equal(db.updates.length, 1);
  assert.equal(db.audits.length, 1);
  if (first.status === "REANALYZED" && second.status === "NO_OP") assert.equal(second.reanalysis.analyzedAt, first.reanalysis.analyzedAt);
});

test("effective category resolver gives admin decision priority over reanalysis", () => {
  const result = resolveEffectiveCategory(
    { categoryIds: [], requiresReview: true, unresolvedTokens: ["inne"], warnings: [] },
    { primaryCategoryId: "category-b", categories: [{ categoryId: "category-b", sortOrder: 0 }, { categoryId: "category-a", sortOrder: 1 }] },
    [{ id: "category-a", active: true }, { id: "category-b", active: true }],
    { categoryIds: ["category-a"], requiresReview: false, unresolvedTokens: [], warnings: [] },
  );
  assert.deepEqual(result, { status: "ADMIN_DECISION", primaryCategoryId: "category-b", categoryIds: ["category-b", "category-a"] });
});

test("controlled reanalysis rejects multi-category and partial results", async () => {
  for (const source of ["pomoc-prawna; pomoc-socjalna", "pomoc-socjalna; inne"]) {
    const db = new FakeDatabase();
    db.candidate.proposedData = { mappedValues: { primaryCategory: source }, analysis: originalAnalysis };
    const result = await reanalyseImportCandidateCategory(db, { candidateId, resolvedByAdminUserId: adminId });
    assert.equal(result.status, "CATEGORY_REVIEW_REQUIRED");
    assert.equal(db.updates.length, 0);
    assert.equal(db.audits.length, 0);
  }
});

test("controlled reanalysis keeps other blockers and rejects inactive singleton", async () => {
  const organizationBlocked = new FakeDatabase();
  organizationBlocked.candidate.proposedData = {
    mappedValues: { primaryCategory: "pomoc-socjalna" },
    analysis: { ...originalAnalysis, organization: { status: "NEW_CANDIDATE", organizationId: null } },
  };
  organizationBlocked.candidate.organizationDecision = null;
  const blockedResult = await reanalyseImportCandidateCategory(organizationBlocked, { candidateId, resolvedByAdminUserId: adminId });
  assert.equal(blockedResult.status, "REANALYZED");
  assert.equal(organizationBlocked.candidate.status, "REQUIRES_REVIEW");
  assert.equal(organizationBlocked.candidate.queueStatus, null);

  const inactive = new FakeDatabase();
  inactive.categories[0] = { ...inactive.categories[0]!, active: false };
  const inactiveResult = await reanalyseImportCandidateCategory(inactive, { candidateId, resolvedByAdminUserId: adminId });
  assert.equal(inactiveResult.status, "CATEGORY_REVIEW_REQUIRED");
  assert.equal(inactive.updates.length, 0);
  assert.equal(inactive.audits.length, 0);
});

test("controlled reanalysis keeps an unresolved duplicate blocker visible", async () => {
  const db = new FakeDatabase();
  db.candidate.proposedData = {
    mappedValues: { primaryCategory: "pomoc-socjalna" },
    analysis: { ...originalAnalysis, inFileDuplicates: [{ rowNumber: 13, reasons: ["SAME_ADDRESS_AND_PHONE"] }] },
  } as typeof db.candidate.proposedData;
  db.duplicateCandidate = { id: "44444444-4444-4444-8444-444444444444", candidateKey: "row-13", proposedData: { analysis: { inFileDuplicates: [{ rowNumber: 12 }] } } };
  const result = await reanalyseImportCandidateCategory(db, { candidateId, resolvedByAdminUserId: adminId });
  assert.equal(result.status, "REANALYZED");
  assert.equal(db.candidate.status, "REQUIRES_REVIEW");
  assert.equal(db.candidate.queueStatus, null);
  assert.deepEqual(db.candidate.reviewReasons, ["SOURCE_ROW_DUPLICATE"]);
  assert.equal(db.candidate.reviewReasons.includes("UNRESOLVED_CATEGORY"), false);
});
