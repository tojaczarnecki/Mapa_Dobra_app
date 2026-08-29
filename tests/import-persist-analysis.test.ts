import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client.ts";
import { ImportBatchStatus } from "../src/generated/prisma/enums.ts";
import type { ImportBatchStatus as ImportBatchStatusValue } from "../src/generated/prisma/enums.ts";
import type { CanonicalImportValues, MappedImportRow } from "../src/lib/imports/column-mapping.ts";
import { persistImportAnalysis, type ImportAnalysisDatabase, type ImportAnalysisTransaction, type PersistImportAnalysisInput } from "../src/lib/imports/persist-analysis.ts";
import { matchCategories } from "../src/lib/imports/matching.ts";
import type { ImportCategoryReference, MatchingAnalysisRow } from "../src/lib/imports/matching.ts";

const fileHash = "a".repeat(64);

function input(overrides: Partial<PersistImportAnalysisInput> = {}): PersistImportAnalysisInput {
  return {
    title: "Import testowy",
    originalFileName: "miejsca.xlsx",
    fileHash,
    sourceUrl: "",
    publisher: "Mapa Dobra",
    edition: "2026-08-29",
    importDate: new Date("2026-08-29T00:00:00.000Z"),
    sheetName: "Miejsca",
    headerRowNumber: 3,
    mapping: { name: 0, addressLine: 1, primaryCategory: 2 },
    rows: [row(4, { name: "Punkt A", addressLine: "Adres A", primaryCategory: "Jedzenie" })],
    ...overrides,
  };
}

function row(rowNumber: number, values: CanonicalImportValues, status: "READY" | "REVIEW" | "ERROR" = "READY"): MatchingAnalysisRow & { source: Pick<MappedImportRow, "rawValues" | "values"> } {
  return {
    rowNumber,
    source: { rawValues: [String(values.name ?? ""), String(values.addressLine ?? "")], values },
    organizationMatch: { status: "NONE" as const, method: null, organizationId: null, candidateIds: [], reasons: [], warnings: [] },
    categoryMatch: { status: "MATCHED" as const, method: "SLUG" as const, categoryId: "category-1", categorySlug: "jedzenie", reasons: ["MATCHED_BY_SLUG"], warnings: [] },
    placeMatch: { classification: "NEW" as const, candidates: [], reasons: [], conflict: false },
    inFileDuplicates: [],
    errors: status === "ERROR" ? ["MISSING_REQUIRED_FIELD"] : [],
    warnings: status === "REVIEW" ? ["SOURCE_ROW_DUPLICATE"] : [],
    status,
  };
}

const categoryReferences: ImportCategoryReference[] = [
  { id: "legal", slug: "pomoc-prawna", name: "Pomoc prawna", active: true },
  { id: "social", slug: "pomoc-socjalna", name: "Pomoc socjalna", active: true },
  { id: "hygiene", slug: "higiena", name: "Higiena", active: true },
  { id: "inactive", slug: "pomoc-prawna-archiwalna", name: "Pomoc prawna archiwalna", active: false },
];

class FakeDatabase implements ImportAnalysisDatabase {
  readonly batches: Array<Prisma.ImportBatchCreateArgs["data"]> = [];
  readonly sources: Array<Prisma.ImportSourceEntryCreateArgs["data"]> = [];
  readonly candidates: Array<Prisma.ImportCandidateCreateArgs["data"]> = [];
  readonly candidateSources: Array<Prisma.ImportCandidateSourceCreateArgs["data"]> = [];
  readonly batchUpdates: Array<Prisma.ImportBatchUpdateArgs["data"]> = [];
  duplicateId: string | null = null;
  duplicateStatus: ImportBatchStatusValue = ImportBatchStatus.STAGED;
  raceBatch: { id: string; status: ImportBatchStatusValue } | null = null;
  uniqueViolationOnCreate = false;
  failOn: "source" | "candidate" | "finalize" | null = null;
  private findCalls = 0;
  private nextId = 1;

  private transaction(): ImportAnalysisTransaction {
    return {
      importBatch: {
        findFirst: async () => {
          this.findCalls += 1;
          if (this.raceBatch && this.findCalls > 1) return this.raceBatch;
          return this.duplicateId ? { id: this.duplicateId, status: this.duplicateStatus } : null;
        },
        create: async (args) => {
          if (this.uniqueViolationOnCreate) throw { code: "P2002" };
          this.batches.push(args.data);
          return { id: `batch-${this.nextId++}` };
        },
        update: async (args) => {
          if (this.failOn === "finalize" && args.data.status === ImportBatchStatus.STAGED) throw new Error("finalization failed");
          this.batchUpdates.push(args.data);
          return { id: String(args.where.id) };
        },
      },
      importSourceEntry: {
        create: async (args) => {
          if (this.failOn === "source") throw new Error("source persistence failed");
          this.sources.push(args.data);
          return { id: `source-${this.nextId++}` };
        },
      },
      importCandidate: {
        create: async (args) => {
          if (this.failOn === "candidate") throw new Error("candidate persistence failed");
          this.candidates.push(args.data);
          return { id: `candidate-${this.nextId++}` };
        },
      },
      importCandidateSource: {
        create: async (args) => {
          this.candidateSources.push(args.data);
          return args.data;
        },
      },
    };
  }

  async $transaction<T>(callback: (transaction: ImportAnalysisTransaction) => Promise<T>): Promise<T> {
    return callback(this.transaction());
  }
}

test("persists batch provenance, source row and analysis candidate without creating domain records", async () => {
  const db = new FakeDatabase();
  const result = await persistImportAnalysis(db, input());

  assert.equal(result.status, "CREATED");
  assert.equal(db.batches[0]?.sourceDocumentHash, fileHash);
  assert.deepEqual(db.batches[0]?.metadata, {
    kind: "SPREADSHEET",
    originalFileName: "miejsca.xlsx",
    fileHash,
    sheetName: "Miejsca",
    headerRowNumber: 3,
    mapping: { name: 0, addressLine: 1, primaryCategory: 2 },
    analysisCounters: { ready: 1, matched: 0, review: 0, error: 0, skipped: 0 },
  });
  assert.match(db.sources[0]?.sourceKey ?? "", /^sheet:[a-f0-9]{16}:row:4:file:a{16}$/u);
  assert.equal(db.sources[0]?.rawName, "Punkt A");
  assert.equal(db.candidates[0]?.proposedName, "Punkt A");
  assert.equal(db.candidates[0]?.createdPlace, undefined);
  assert.equal(db.candidates[0]?.matchedPlace, undefined);
  assert.deepEqual(db.candidateSources, [{ importCandidateId: "candidate-3", sourceEntryId: "source-2" }]);
});

test("keeps error source rows and does not create candidates without a name", async () => {
  const db = new FakeDatabase();
  const result = await persistImportAnalysis(db, input({ rows: [row(18, { addressLine: "Adres" }, "ERROR")] }));

  assert.equal(result.status, "CREATED");
  assert.equal(db.sources.length, 1);
  assert.equal(db.sources[0]?.sourceKey.includes(":row:18:"), true);
  assert.equal(db.candidates.length, 0);
  assert.equal(result.counters.error, 1);
});

test("returns duplicate upload without creating another batch", async () => {
  const db = new FakeDatabase();
  db.duplicateId = "existing-batch";
  const result = await persistImportAnalysis(db, input());

  assert.deepEqual(result, { status: "DUPLICATE_IMPORT", batchId: "existing-batch" });
  assert.equal(db.batches.length, 0);
});

test("starts persistence in PROCESSING and finalizes it as STAGED", async () => {
  const db = new FakeDatabase();
  const result = await persistImportAnalysis(db, input());

  assert.equal(result.status, "CREATED");
  assert.equal(db.batches[0]?.status, ImportBatchStatus.PROCESSING);
  assert.equal(db.batchUpdates.at(-1)?.status, ImportBatchStatus.STAGED);
});

test("marks a batch FAILED when persistence fails after creation", async () => {
  const db = new FakeDatabase();
  db.failOn = "source";

  await assert.rejects(() => persistImportAnalysis(db, input()), { code: "PERSISTENCE_ERROR" });
  assert.equal(db.batches[0]?.status, ImportBatchStatus.PROCESSING);
  assert.equal(db.batchUpdates.at(-1)?.status, ImportBatchStatus.FAILED);
});

test("recognizes PROCESSING as an incomplete import", async () => {
  const db = new FakeDatabase();
  db.duplicateId = "processing-batch";
  db.duplicateStatus = ImportBatchStatus.PROCESSING;

  assert.deepEqual(await persistImportAnalysis(db, input()), { status: "EXISTING_INCOMPLETE_IMPORT", batchId: "processing-batch" });
});

test("recognizes FAILED as an incomplete failed import", async () => {
  const db = new FakeDatabase();
  db.duplicateId = "failed-batch";
  db.duplicateStatus = ImportBatchStatus.FAILED;

  assert.deepEqual(await persistImportAnalysis(db, input()), { status: "EXISTING_FAILED_IMPORT", batchId: "failed-batch" });
});

test("re-reads a batch after a concurrent unique-key race", async () => {
  const db = new FakeDatabase();
  db.uniqueViolationOnCreate = true;
  db.raceBatch = { id: "raced-batch", status: ImportBatchStatus.PROCESSING };

  assert.deepEqual(await persistImportAnalysis(db, input()), { status: "EXISTING_INCOMPLETE_IMPORT", batchId: "raced-batch" });
});

test("persists exact place match and keeps review status", async () => {
  const db = new FakeDatabase();
  const analyzed = row(7, { name: "Punkt", addressLine: "Adres", primaryCategory: "Jedzenie" }, "REVIEW");
  analyzed.placeMatch = { classification: "EXACT_MATCH", candidates: [{ placeId: "place-1", reasons: ["SAME_NAME_AND_ADDRESS"] }], reasons: ["SAME_NAME_AND_ADDRESS"], conflict: false };
  analyzed.organizationMatch = { status: "MATCHED", method: "NIP", organizationId: "org-1", candidateIds: ["org-1"], reasons: ["MATCHED_BY_NIP"], warnings: [] };
  const result = await persistImportAnalysis(db, input({ rows: [analyzed] }));

  assert.equal(result.status, "CREATED");
  assert.equal(db.candidates[0]?.matchedPlaceId, "place-1");
  assert.equal(db.candidates[0]?.status, "REQUIRES_REVIEW");
  assert.equal(db.candidates[0]?.queueStatus, "PENDING");
  assert.equal(db.candidates[0]?.createdPlace, undefined);
  assert.deepEqual(db.candidates[0]?.proposedData, {
    mappedValues: { name: "Punkt", addressLine: "Adres", primaryCategory: "Jedzenie" },
    analysis: {
      status: "REVIEW",
      errors: [],
      warnings: ["SOURCE_ROW_DUPLICATE"],
      organization: { status: "MATCHED", method: "NIP", organizationId: "org-1", candidateIds: ["org-1"], reasons: ["MATCHED_BY_NIP"], warnings: [] },
      categoryStatus: "MATCHED",
      categorySlug: "jedzenie",
      organizationStatus: "MATCHED",
      organizationId: "org-1",
      placeClassification: "EXACT_MATCH",
      placeCandidateIds: ["place-1"],
      inFileDuplicate: false,
      category: { status: "MATCHED", method: "SLUG", categoryId: "category-1", categorySlug: "jedzenie", reasons: ["MATCHED_BY_SLUG"], warnings: [] },
      place: { classification: "EXACT_MATCH", candidates: [{ placeId: "place-1", reasons: ["SAME_NAME_AND_ADDRESS"] }], reasons: ["SAME_NAME_AND_ADDRESS"], conflict: false },
      inFileDuplicates: [],
    },
  });
});

test("does not queue non-place spreadsheet reviews", async () => {
  const db = new FakeDatabase();
  const reviewed = row(8, { name: "Punkt", addressLine: "Adres", primaryCategory: "Jedzenie" }, "REVIEW");
  reviewed.placeMatch = { classification: "NEW", candidates: [], reasons: [], conflict: false };
  const result = await persistImportAnalysis(db, input({ rows: [reviewed] }));

  assert.equal(result.status, "CREATED");
  assert.equal(db.candidates[0]?.queueStatus, undefined);
});

test("does not queue a mixed place match with an in-file duplicate", async () => {
  const db = new FakeDatabase();
  const mixed = row(9, { name: "Punkt", addressLine: "Adres", primaryCategory: "Jedzenie" }, "REVIEW");
  mixed.placeMatch = { classification: "EXACT_MATCH", candidates: [{ placeId: "place-1", reasons: ["SAME_NAME_AND_ADDRESS"] }], reasons: ["SAME_NAME_AND_ADDRESS"], conflict: false };
  mixed.inFileDuplicates = [{ rowNumber: 21, reasons: ["SAME_NAME_AND_ADDRESS"] }];
  const result = await persistImportAnalysis(db, input({ rows: [mixed] }));

  assert.equal(result.status, "CREATED");
  assert.equal(db.candidates[0]?.queueStatus, undefined);
});

test("persists the complete multi-category analysis without inventing a primary category", async () => {
  const db = new FakeDatabase();
  const analyzed = row(10, { name: "Punkt pomocy", addressLine: "Adres", primaryCategory: "pomoc-prawna; pomoc-socjalna" });
  analyzed.categoryMatches = matchCategories(analyzed.source.values.primaryCategory, categoryReferences);

  await persistImportAnalysis(db, input({ rows: [analyzed] }));

  assert.deepEqual(db.candidates[0]?.categorySlugs, ["pomoc-prawna", "pomoc-socjalna"]);
  assert.equal(db.candidates[0]?.primaryCategorySlug, null);
  assert.equal(db.candidates[0]?.status, "REQUIRES_REVIEW");
  assert.ok((db.candidates[0]?.reviewReasons as string[]).includes("PRIMARY_CATEGORY_DECISION_REQUIRED"));
  const proposedData = db.candidates[0]?.proposedData as { analysis: { categories: typeof analyzed.categoryMatches } };
  assert.deepEqual(proposedData.analysis.categories, analyzed.categoryMatches);
  assert.equal((proposedData.analysis.categories as NonNullable<typeof analyzed.categoryMatches>).requiresReview, false);
});

test("persists one effective category from multiple source tokens", async () => {
  const db = new FakeDatabase();
  const analyzed = row(11, { name: "Prysznic", addressLine: "Adres", primaryCategory: "prysznic; higiena" });
  analyzed.categoryMatches = matchCategories(analyzed.source.values.primaryCategory, categoryReferences);

  await persistImportAnalysis(db, input({ rows: [analyzed] }));

  assert.deepEqual(db.candidates[0]?.categorySlugs, ["higiena"]);
  assert.equal(db.candidates[0]?.primaryCategorySlug, "higiena");
  assert.equal(db.candidates[0]?.status, "IMPORT_READY");
  assert.deepEqual((db.candidates[0]?.proposedData as { analysis: { categories: { matchedCategorySlugs: string[] } } }).analysis.categories.matchedCategorySlugs, ["higiena"]);
});

test("keeps partial multi-category analysis blocked and preserves unresolved tokens", async () => {
  const db = new FakeDatabase();
  const analyzed = row(12, { name: "Punkt", addressLine: "Adres", primaryCategory: "pomoc-socjalna; inne" });
  analyzed.categoryMatches = matchCategories(analyzed.source.values.primaryCategory, categoryReferences);

  await persistImportAnalysis(db, input({ rows: [analyzed] }));

  assert.deepEqual(db.candidates[0]?.categorySlugs, ["pomoc-socjalna"]);
  assert.equal(db.candidates[0]?.primaryCategorySlug, null);
  assert.equal(db.candidates[0]?.status, "REQUIRES_REVIEW");
  assert.ok((db.candidates[0]?.reviewReasons as string[]).includes("UNRESOLVED_CATEGORY"));
  assert.deepEqual((db.candidates[0]?.proposedData as { analysis: { categories: { unresolvedTokens: string[] } } }).analysis.categories.unresolvedTokens, ["inne"]);
});

test("persists empty and whitespace categories as unresolved review", async () => {
  for (const primaryCategory of ["", "   "]) {
    const db = new FakeDatabase();
    const analyzed = row(13, { name: "Punkt", addressLine: "Adres", primaryCategory });
    analyzed.categoryMatches = matchCategories(primaryCategory, categoryReferences);

    await persistImportAnalysis(db, input({ rows: [analyzed] }));

    assert.equal(db.candidates[0]?.status, "REQUIRES_REVIEW");
    assert.equal(db.candidates[0]?.queueStatus, undefined);
    assert.deepEqual(db.candidates[0]?.reviewReasons, ["UNRESOLVED_CATEGORY"]);
    assert.equal((db.candidates[0]?.proposedData as { analysis: { categoryStatus: string; categorySlug: string | null } }).analysis.categoryStatus, "UNRESOLVED");
    assert.equal((db.candidates[0]?.proposedData as { analysis: { categoryStatus: string; categorySlug: string | null } }).analysis.categorySlug, null);
  }
});

test("persists an inactive singleton category as a blocker", async () => {
  const db = new FakeDatabase();
  const analyzed = row(14, { name: "Punkt prawny", addressLine: "Adres", primaryCategory: "pomoc-prawna-archiwalna" });
  analyzed.categoryMatches = matchCategories(analyzed.source.values.primaryCategory, categoryReferences);

  await persistImportAnalysis(db, input({ rows: [analyzed] }));

  assert.deepEqual(db.candidates[0]?.categorySlugs, ["pomoc-prawna-archiwalna"]);
  assert.equal(db.candidates[0]?.primaryCategorySlug, null);
  assert.equal(db.candidates[0]?.status, "REQUIRES_REVIEW");
  assert.deepEqual(db.candidates[0]?.reviewReasons, ["INACTIVE_CATEGORY"]);
});
