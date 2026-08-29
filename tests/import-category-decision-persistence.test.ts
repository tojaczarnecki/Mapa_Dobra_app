import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client.ts";
import { ImportCandidateStatus } from "../src/generated/prisma/enums.ts";
import { saveImportCandidateCategoryDecision, type CategoryDecisionPersistenceDatabase, type CategoryDecisionPersistenceTransaction, type SaveCategoryDecisionInput } from "../src/lib/imports/category-decision-persistence.ts";

const candidateId = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";
const categoryA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const categoryB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const categoryC = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

type FakeCandidate = {
  id: string;
  status: string;
  resolution: string | null;
  createdPlaceId: string | null;
  proposedData: Prisma.JsonValue;
  importBatch: { metadata: Prisma.JsonValue };
  sources: Array<{ sourceEntryId: string }>;
};

type FakeDecision = {
  id: string;
  candidateId: string;
  primaryCategoryId: string;
  resolvedByAdminUserId: string;
  resolvedAt: Date;
  note: string | null;
};

type FakeJoin = { decisionId: string; categoryId: string; sortOrder: number };

function makeCandidate(overrides: Partial<FakeCandidate> = {}): FakeCandidate {
  return {
    id: candidateId,
    status: ImportCandidateStatus.REQUIRES_REVIEW,
    resolution: null,
    createdPlaceId: null,
    proposedData: { mappedValues: { name: "Punkt" }, analysis: { category: { status: "UNRESOLVED" } } },
    importBatch: { metadata: { kind: "SPREADSHEET" } },
    sources: [{ sourceEntryId: "source-1" }],
    ...overrides,
  };
}

class FakeDatabase implements CategoryDecisionPersistenceDatabase {
  candidate: FakeCandidate;
  categories = new Map<string, { id: string; active: boolean }>([
    [categoryA, { id: categoryA, active: true }],
    [categoryB, { id: categoryB, active: true }],
    [categoryC, { id: categoryC, active: true }],
  ]);
  decision: FakeDecision | null = null;
  joins: FakeJoin[] = [];
  audits: Array<Record<string, unknown>> = [];
  parentWrites = 0;
  failAfterParent = false;
  lockPresent = true;

  constructor(candidate: FakeCandidate = makeCandidate()) {
    this.candidate = candidate;
  }

  private snapshot(): { decision: FakeDecision | null; joins: FakeJoin[]; audits: Array<Record<string, unknown>> } {
    return { decision: this.decision && { ...this.decision }, joins: this.joins.map((join) => ({ ...join })), audits: [...this.audits] };
  }

  private transaction(): CategoryDecisionPersistenceTransaction {
    const readDecision = async (): Promise<FakeDecision & { categories: Array<{ categoryId: string; sortOrder: number }> } | null> => {
      if (!this.decision) return null;
      return { ...this.decision, categories: this.joins.filter((join) => join.decisionId === this.decision!.id).map(({ categoryId, sortOrder }) => ({ categoryId, sortOrder })) };
    };
    return {
      $queryRaw: async <T>() => (this.lockPresent ? [{ id: this.candidate.id }] : []) as T[],
      importCandidate: { findUnique: async () => this.candidate },
      category: {
        findMany: async (args) => {
          const ids = (args.where as { id: { in: string[] } }).id.in;
          return ids.flatMap((id) => {
            const category = this.categories.get(id);
            return category ? [category] : [];
          });
        },
      },
      importCandidateCategoryDecision: {
        findUnique: async () => readDecision(),
        upsert: async (args) => {
          const data = (this.decision ? args.update : args.create) as Record<string, unknown>;
          if (!this.decision) this.decision = { id: "decision-1", candidateId, primaryCategoryId: String(data.primaryCategoryId), resolvedByAdminUserId: String(data.resolvedByAdminUserId), resolvedAt: data.resolvedAt as Date, note: (data.note as string | null) ?? null };
          else this.decision = { ...this.decision, primaryCategoryId: String(data.primaryCategoryId), resolvedByAdminUserId: String(data.resolvedByAdminUserId), resolvedAt: data.resolvedAt as Date, note: (data.note as string | null) ?? null };
          this.parentWrites += 1;
          if (this.failAfterParent) throw new Error("join failure");
          return { id: this.decision.id };
        },
      },
      importCandidateCategoryDecisionCategory: {
        deleteMany: async () => { this.joins = this.joins.filter((join) => join.decisionId !== this.decision?.id); },
        createMany: async (args) => { this.joins = (args.data as Array<FakeJoin>).map((join) => ({ ...join })); },
      },
      auditLog: { create: async (args) => { this.audits.push(args.data as Record<string, unknown>); } },
    };
  }

  async $transaction<T>(callback: (transaction: CategoryDecisionPersistenceTransaction) => Promise<T>): Promise<T> {
    const before = this.snapshot();
    try {
      return await callback(this.transaction());
    } catch (error) {
      this.decision = before.decision;
      this.joins = before.joins;
      this.audits = before.audits;
      throw error;
    }
  }
}

function input(overrides: Partial<SaveCategoryDecisionInput> = {}): SaveCategoryDecisionInput {
  return { candidateId, primaryCategoryId: categoryA, selectedCategoryIds: [categoryA, categoryB], resolvedByAdminUserId: adminId, ...overrides };
}

test("creates a decision and persists primary first", async () => {
  const db = new FakeDatabase();
  const result = await saveImportCandidateCategoryDecision(db, input());
  assert.equal(result.status, "SAVED");
  assert.deepEqual(db.joins.map(({ categoryId, sortOrder }) => [categoryId, sortOrder]), [[categoryA, 0], [categoryB, 1]]);
  assert.equal(db.candidate.status, ImportCandidateStatus.REQUIRES_REVIEW);
  assert.equal(db.audits.length, 1);
});

test("orders the primary first without sorting secondary input alphabetically", async () => {
  const db = new FakeDatabase();
  await saveImportCandidateCategoryDecision(db, input({ primaryCategoryId: categoryA, selectedCategoryIds: [categoryB, categoryA, categoryC] }));
  assert.deepEqual(db.joins.map(({ categoryId }) => categoryId), [categoryA, categoryB, categoryC]);
});

test("updates one parent and replaces its join set", async () => {
  const db = new FakeDatabase();
  await saveImportCandidateCategoryDecision(db, input());
  await saveImportCandidateCategoryDecision(db, input({ primaryCategoryId: categoryB, selectedCategoryIds: [categoryA, categoryB, categoryC], note: "updated" }));
  assert.equal(db.parentWrites, 2);
  assert.equal(db.joins.length, 3);
  assert.equal(db.decision?.primaryCategoryId, categoryB);
  assert.equal(db.audits.length, 2);
  const audit = db.audits[1]!;
  assert.deepEqual((audit.previousValues as { previousCategoryIds: string[] }).previousCategoryIds, [categoryA, categoryB]);
  assert.deepEqual((audit.newValues as { newCategoryIds: string[] }).newCategoryIds, [categoryB, categoryA, categoryC]);
});

test("same semantic decision still persists but does not create a change audit", async () => {
  const db = new FakeDatabase();
  await saveImportCandidateCategoryDecision(db, input());
  const result = await saveImportCandidateCategoryDecision(db, input());
  assert.equal(result.status, "SAVED");
  assert.equal(result.changed, false);
  assert.equal(db.audits.length, 1);
  assert.equal(db.parentWrites, 2);
});

test("rejects malformed decision input without writes", async () => {
  for (const invalid of [
    input({ selectedCategoryIds: [] }),
    input({ primaryCategoryId: categoryC, selectedCategoryIds: [categoryA, categoryB] }),
    input({ selectedCategoryIds: [categoryA, categoryA] }),
    input({ note: "x".repeat(1001) }),
  ]) {
    const db = new FakeDatabase();
    const result = await saveImportCandidateCategoryDecision(db, invalid);
    assert.equal(result.status, invalid.note ? "NOTE_TOO_LONG" : "INVALID_DECISION");
    assert.equal(db.parentWrites, 0);
  }
});

test("rejects missing or inactive categories", async () => {
  const missing = await saveImportCandidateCategoryDecision(new FakeDatabase(), input({ selectedCategoryIds: [categoryA, "dddddddd-dddd-4ddd-8ddd-dddddddddddd"] }));
  assert.deepEqual(missing, { status: "CATEGORY_NOT_FOUND" });
  const db = new FakeDatabase();
  db.categories.set(categoryB, { id: categoryB, active: false });
  assert.deepEqual(await saveImportCandidateCategoryDecision(db, input()), { status: "CATEGORY_INACTIVE" });
  assert.equal(db.parentWrites, 0);
});

test("rejects missing and terminal candidates", async () => {
  const missing = new FakeDatabase();
  missing.lockPresent = false;
  assert.deepEqual(await saveImportCandidateCategoryDecision(missing, input()), { status: "INVALID_CANDIDATE" });
  for (const status of [ImportCandidateStatus.IMPORTED, ImportCandidateStatus.SKIPPED, ImportCandidateStatus.MATCH_EXISTING]) {
    const db = new FakeDatabase(makeCandidate({ status }));
    assert.deepEqual(await saveImportCandidateCategoryDecision(db, input()), { status: "INVALID_CANDIDATE" });
  }
});

test("rolls back parent and joins if transaction fails", async () => {
  const db = new FakeDatabase();
  db.failAfterParent = true;
  await assert.rejects(saveImportCandidateCategoryDecision(db, input()), /join failure/);
  assert.equal(db.decision, null);
  assert.deepEqual(db.joins, []);
  assert.deepEqual(db.audits, []);
});
