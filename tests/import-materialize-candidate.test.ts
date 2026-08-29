import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client.ts";
import { ImportBatchStatus, ImportCandidateStatus } from "../src/generated/prisma/enums.ts";
import type { ImportBatchStatus as ImportBatchStatusValue } from "../src/generated/prisma/enums.ts";
import { materializeImportCandidate, type MaterializeCandidateDatabase, type MaterializeCandidateTransaction } from "../src/lib/imports/materialize-candidate.ts";
import type { ImportPlaceReference } from "../src/lib/imports/matching.ts";

const candidateId = "11111111-1111-4111-8111-111111111111";
const secondCandidateId = "55555555-5555-4555-8555-555555555555";
const adminUserId = "22222222-2222-4222-8222-222222222222";

function proposedData(overrides: Record<string, unknown> = {}): Prisma.JsonValue {
  return {
    mappedValues: {
      name: "Punkt pomocy",
      addressLine: "Piotrkowska 10, Łódź",
      street: "Piotrkowska",
      buildingNumber: "10",
      postalCode: "90-001",
      city: "Łódź",
      phone: "42 000 00 00",
      email: "kontakt@example.pl",
      website: "https://example.pl",
      description: "Opis",
      audience: ["Osoby potrzebujące"],
      services: ["Posiłki"],
    },
    analysis: {
      category: { status: "MATCHED", categorySlug: "jedzenie" },
      organization: { status: "NONE", organizationId: null },
      place: { classification: "NEW", candidates: [] },
      inFileDuplicates: [],
    },
    ...overrides,
  } as Prisma.JsonValue;
}

function persistedCategoryData(category: { status: string; categorySlug: string | null; categories: Record<string, unknown> }): Prisma.JsonValue {
  return proposedData({
    analysis: {
      categoryStatus: category.status,
      categorySlug: category.categorySlug,
      organizationStatus: "NONE",
      organizationId: null,
      placeClassification: "NEW",
      placeCandidateIds: [],
      inFileDuplicate: false,
      category: { status: category.status, categorySlug: category.categorySlug },
      categories: category.categories,
      organization: { status: "NONE", organizationId: null },
      place: { classification: "NEW", candidates: [] },
      inFileDuplicates: [],
    },
  });
}

function snapshot(overrides: Partial<{
  status: ImportCandidateStatus;
  createdPlaceId: string | null;
  matchedPlaceId: string | null;
  proposedPhone: string | null;
  proposedEmail: string | null;
  proposedWebsite: string | null;
  proposedData: Prisma.JsonValue;
  organizationDecision?: { decision: string; organizationId: string | null } | null;
}> = {}) {
  return {
    id: candidateId,
    status: ImportCandidateStatus.IMPORT_READY as ImportCandidateStatus,
    createdPlaceId: null,
    matchedPlaceId: null,
    proposedName: "Punkt pomocy",
    proposedAddress: "Piotrkowska 10, Łódź",
    proposedPhone: null,
    proposedEmail: null,
    proposedWebsite: null,
    proposedData: proposedData(),
    importBatch: { id: "33333333-3333-4333-8333-333333333333", key: "spreadsheet-hash", status: ImportBatchStatus.STAGED as ImportBatchStatusValue },
    sources: [{ sourceEntry: { id: "44444444-4444-4444-8444-444444444444", parsedData: null } }],
    organizationDecision: null,
    categoryDecision: null,
    ...overrides,
  };
}

class FakeDatabase implements MaterializeCandidateDatabase {
  candidate = snapshot();
  category: { id: string; slug: string; active: boolean } | null = { id: "category-1", slug: "jedzenie", active: true };
  categoryDecision: { id: string; primaryCategoryId: string; categories: Array<{ categoryId: string; sortOrder: number }> } | null = null;
  organization: { id: string; active: boolean } | null = null;
  createdPlaceId = "place-1";
  createdPlaceData: Prisma.PlaceCreateArgs["data"] | null = null;
  candidateUpdate: Prisma.ImportCandidateUpdateArgs["data"] | null = null;
  auditData: Prisma.AuditLogCreateArgs["data"] | null = null;
  lockQuery: Prisma.Sql | null = null;
  readonly slugs: Set<string>;
  forceSlugRace = false;
  private forcedSlugRace = false;
  failAudit = false;
  livePlaces: ImportPlaceReference[] = [];
  inactiveCategoryIds = new Set<string>();

  constructor(slugs = new Set<string>()) {
    this.slugs = slugs;
  }

  private transaction(): MaterializeCandidateTransaction {
    return {
      $queryRaw: async <T>(query: Prisma.Sql) => {
        if (/FOR UPDATE/u.test(JSON.stringify(query))) this.lockQuery = query;
        return [{ id: this.candidate.id }] as T[];
      },
      $executeRaw: async () => 1,
      importCandidate: {
        findUnique: async () => ({ ...this.candidate, categoryDecision: this.categoryDecision }),
        update: async (args) => {
          this.candidateUpdate = args.data;
          return { id: candidateId };
        },
      },
      category: {
        findFirst: async () => this.category,
        findMany: async (args) => {
          const ids = (args.where as { id: { in: string[] } }).id.in;
          return ids.map((id) => ({ id, active: !this.inactiveCategoryIds.has(id) }));
        },
      },
      organization: {
        findUnique: async () => this.organization,
      },
      place: {
        findUnique: async (args) => this.slugs.has(String(args.where.slug)) ? { id: "existing-place" } : null,
        findMany: async () => this.livePlaces,
        create: async (args) => {
          const slug = String(args.data.slug);
          if (this.forceSlugRace && !this.forcedSlugRace) {
            this.forcedSlugRace = true;
            this.slugs.add(slug);
            throw { code: "P2002" };
          }
          this.slugs.add(slug);
          this.createdPlaceData = args.data;
          return { id: this.createdPlaceId };
        },
      },
      auditLog: {
        create: async (args) => {
          if (this.failAudit) throw new Error("audit failed");
          this.auditData = args.data;
          return { id: "audit-1" };
        },
      },
    };
  }

  async $transaction<T>(callback: (transaction: MaterializeCandidateTransaction) => Promise<T>): Promise<T> {
    return callback(this.transaction());
  }
}

function materialize(db: FakeDatabase, id = candidateId) {
  return materializeImportCandidate(db, { candidateId: id, adminUserId, action: "CREATE_NEW_PLACE" });
}

test("materializes only a NEW candidate as an unpublished draft", async () => {
  const db = new FakeDatabase();
  const result = await materialize(db);

  assert.deepEqual(result, { status: "CREATED", placeId: "place-1" });
  assert.equal(db.createdPlaceData?.publicationStatus, "DRAFT");
  assert.equal(db.createdPlaceData?.verificationStatus, "NEEDS_CONFIRMATION");
  assert.equal(db.createdPlaceData?.operationalStatus, "UNKNOWN");
  assert.equal(db.createdPlaceData?.verificationQueueStatus, "PENDING");
  assert.equal(db.createdPlaceData?.latitude, null);
  assert.equal(db.createdPlaceData?.longitude, null);
  assert.equal(db.candidateUpdate?.status, ImportCandidateStatus.IMPORTED);
  assert.equal(db.candidateUpdate?.createdPlaceId, "place-1");
  assert.equal(db.auditData?.action, "PLACE_IMPORTED");
  assert.equal(db.auditData?.entityType, "PLACE");
});

test("bounds legacy proposed contact values to Place column limits", async () => {
  const db = new FakeDatabase();
  db.candidate = snapshot({ proposedPhone: "9".repeat(341), proposedEmail: "a".repeat(501) + "@example.pl", proposedWebsite: "https://example.pl/" + "x".repeat(2100) });
  const result = await materializeImportCandidate(db, { candidateId, adminUserId, action: "CREATE_NEW_PLACE" });
  assert.equal(result.status, "CREATED");
  assert.equal((db.createdPlaceData as { phone?: string }).phone?.length, 50);
  assert.equal((db.createdPlaceData as { email?: string }).email?.length, 320);
  assert.equal((db.createdPlaceData as { website?: string }).website?.length, 2048);
});

test("locks the candidate row before re-reading it", async () => {
  const db = new FakeDatabase();
  await materialize(db);

  assert.ok(db.lockQuery);
  assert.match(JSON.stringify(db.lockQuery), /FOR UPDATE/u);
});

test("returns ALREADY_CREATED without creating another place", async () => {
  const db = new FakeDatabase();
  db.candidate = snapshot({ createdPlaceId: "existing-place" });

  assert.deepEqual(await materialize(db), { status: "ALREADY_CREATED", placeId: "existing-place" });
  assert.equal(db.createdPlaceData, null);
});

test("blocks a historical NEW candidate when the live matcher finds an exact place", async () => {
  const db = new FakeDatabase();
  db.livePlaces = [{ id: "live-place", name: "Punkt pomocy", addressLine: "Piotrkowska 10, Łódź", phone: "42 000 00 00", website: null, organizationId: null, primaryCategoryId: "category-1", latitude: null, longitude: null, publicationStatus: "DRAFT" }];
  const before = JSON.stringify(db.candidate.proposedData);

  assert.deepEqual(await materialize(db), { status: "EXISTING_PLACE_REVIEW_REQUIRED" });
  assert.equal(db.createdPlaceData, null);
  assert.deepEqual(db.candidateUpdate, { status: ImportCandidateStatus.REQUIRES_REVIEW, queueStatus: "PENDING", matchedPlaceId: "live-place" });
  assert.equal(JSON.stringify(db.candidate.proposedData), before);
});

test("blocks a historical NEW candidate when the live matcher finds a possible place", async () => {
  const db = new FakeDatabase();
  db.livePlaces = [{ id: "possible-place", name: "Inna placówka", addressLine: "Piotrkowska 11, Łódź", phone: "42 000 00 00", website: null, organizationId: null, primaryCategoryId: "category-1", latitude: null, longitude: null, publicationStatus: "DRAFT" }];

  assert.deepEqual(await materialize(db), { status: "PLACE_MATCH_REVIEW_REQUIRED" });
  assert.equal(db.createdPlaceData, null);
  assert.deepEqual(db.candidateUpdate, { status: ImportCandidateStatus.REQUIRES_REVIEW, queueStatus: "PENDING", matchedPlaceId: null });
});

test("does not treat a slug collision as a live domain match", async () => {
  const db = new FakeDatabase(new Set(["punkt-pomocy"]));

  assert.deepEqual(await materialize(db), { status: "CREATED", placeId: "place-1" });
  assert.equal(db.createdPlaceData?.slug, "punkt-pomocy-111111");
});

test("blocks batches that are still processing or failed", async () => {
  for (const status of [ImportBatchStatus.PROCESSING, ImportBatchStatus.FAILED]) {
    const db = new FakeDatabase();
    db.candidate = snapshot({});
    db.candidate.importBatch.status = status;

    assert.deepEqual(await materialize(db), { status: "BATCH_NOT_READY" });
    assert.equal(db.createdPlaceData, null);
  }
});

test("blocks exact, possible and source-duplicate candidates", async () => {
  const exact = new FakeDatabase();
  exact.candidate = snapshot({ matchedPlaceId: "existing-place" });
  assert.deepEqual(await materialize(exact), { status: "EXISTING_PLACE_REVIEW_REQUIRED" });

  const possible = new FakeDatabase();
  possible.candidate.proposedData = proposedData({ analysis: { place: { classification: "POSSIBLE_MATCH", candidates: [{ placeId: "possible-place" }] }, category: { status: "MATCHED", categorySlug: "jedzenie" }, organization: { status: "NONE", organizationId: null }, inFileDuplicates: [] } });
  assert.deepEqual(await materialize(possible), { status: "PLACE_MATCH_REVIEW_REQUIRED" });

  const duplicate = new FakeDatabase();
  duplicate.candidate.proposedData = proposedData({ analysis: { place: { classification: "NEW", candidates: [] }, category: { status: "MATCHED", categorySlug: "jedzenie" }, organization: { status: "NONE", organizationId: null }, inFileDuplicates: [{ rowNumber: 4 }] } });
  assert.deepEqual(await materialize(duplicate), { status: "SOURCE_DUPLICATE_REVIEW_REQUIRED" });
});

test("requires active category and resolved organization", async () => {
  const category = new FakeDatabase();
  category.category = null;
  assert.deepEqual(await materialize(category), { status: "CATEGORY_REVIEW_REQUIRED" });

  const organization = new FakeDatabase();
  organization.candidate.proposedData = proposedData({ analysis: { category: { status: "MATCHED", categorySlug: "jedzenie" }, organization: { status: "MATCHED", organizationId: "org-1" }, place: { classification: "NEW", candidates: [] }, inFileDuplicates: [] } });
  organization.organization = { id: "org-1", active: false };
  assert.deepEqual(await materialize(organization), { status: "ORGANIZATION_REVIEW_REQUIRED" });
});

test("accepts the new persisted singleton category shape", async () => {
  const db = new FakeDatabase();
  db.candidate.proposedData = persistedCategoryData({ status: "MATCHED", categorySlug: "jedzenie", categories: { status: "FULLY_MATCHED", matchedCategorySlugs: ["jedzenie"] } });

  const result = await materializeImportCandidate(db, { candidateId, adminUserId, action: "CREATE_NEW_PLACE" });

  assert.notEqual(result.status, "INVALID_CANDIDATE");
});

test("uses the top-level accepted category reanalysis snapshot", async () => {
  const db = new FakeDatabase();
  db.candidate = snapshot({
    proposedData: proposedData({
      analysis: {
        category: { status: "ERROR", categorySlug: null },
        organization: { status: "NONE", organizationId: null },
        place: { classification: "NEW", candidates: [] },
        inFileDuplicates: [],
      },
      reanalysis: {
        category: {
          version: 1,
          sourceValue: "historyczna wartość",
          analyzedAt: "2026-01-01T00:00:00.000Z",
          analyzedByAdminUserId: adminUserId,
          result: {
            sourceValue: "historyczna wartość",
            tokens: [],
            matchedCategoryIds: ["category-1"],
            matchedCategorySlugs: ["jedzenie"],
            unresolvedTokens: [],
            warnings: [],
            status: "FULLY_MATCHED",
            requiresReview: false,
          },
        },
      },
    }),
  });
  const result = await materializeImportCandidate(db, { candidateId, adminUserId, action: "CREATE_NEW_PLACE" });
  assert.equal(result.status, "CREATED");
  assert.equal((db.createdPlaceData as { primaryCategoryId?: string }).primaryCategoryId, "category-1");
});

test("uses an admin category decision for the primary and complete selected set", async () => {
  const db = new FakeDatabase();
  db.candidate = snapshot({
    proposedData: persistedCategoryData({ status: "UNRESOLVED", categorySlug: null, categories: { status: "FULLY_MATCHED", matchedCategoryIds: ["category-a", "category-b", "category-c"], matchedCategorySlugs: ["a", "b", "c"] } }),
  });
  db.categoryDecision = { id: "decision-1", primaryCategoryId: "category-b", categories: [{ categoryId: "category-a", sortOrder: 1 }, { categoryId: "category-b", sortOrder: 0 }, { categoryId: "category-c", sortOrder: 2 }] };

  assert.deepEqual(await materialize(db), { status: "CREATED", placeId: "place-1" });
  assert.equal(db.createdPlaceData?.primaryCategoryId, "category-b");
  assert.deepEqual(db.createdPlaceData?.categories, { create: [{ categoryId: "category-b", sortOrder: 0 }, { categoryId: "category-a", sortOrder: 1 }, { categoryId: "category-c", sortOrder: 2 }] });
});

test("create-new uses the persisted category decision instead of stale source category data", async () => {
  const db = new FakeDatabase();
  db.candidate = snapshot({
    proposedData: persistedCategoryData({ status: "MATCHED", categorySlug: "category-a", categories: { status: "FULLY_MATCHED", matchedCategoryIds: ["category-a", "category-b"], matchedCategorySlugs: ["a", "b"] } }),
  });
  db.categoryDecision = { id: "decision-1", primaryCategoryId: "category-b", categories: [{ categoryId: "category-b", sortOrder: 0 }, { categoryId: "category-a", sortOrder: 1 }] };

  const result = await materialize(db);

  assert.deepEqual(result, { status: "CREATED", placeId: "place-1" });
  assert.equal(db.createdPlaceData?.primaryCategoryId, "category-b");
  assert.deepEqual(db.createdPlaceData?.categories, { create: [{ categoryId: "category-b", sortOrder: 0 }, { categoryId: "category-a", sortOrder: 1 }] });
});

test("admin category decision overrides partial and unresolved analysis", async () => {
  for (const categories of [
    { status: "PARTIALLY_MATCHED", matchedCategoryIds: ["category-1"], unresolvedTokens: ["inne"] },
    { status: "UNRESOLVED", matchedCategoryIds: [], unresolvedTokens: ["inne"] },
  ]) {
    const db = new FakeDatabase();
    db.candidate = snapshot({ proposedData: persistedCategoryData({ status: "UNRESOLVED", categorySlug: null, categories }) });
    db.categoryDecision = { id: "decision-1", primaryCategoryId: "category-1", categories: [{ categoryId: "category-1", sortOrder: 0 }] };
    assert.deepEqual(await materialize(db), { status: "CREATED", placeId: "place-1" });
  }
});

test("blocks an inactive persisted category decision without creating a place", async () => {
  const db = new FakeDatabase();
  db.candidate = snapshot({ proposedData: persistedCategoryData({ status: "UNRESOLVED", categorySlug: null, categories: { status: "UNRESOLVED", matchedCategoryIds: [] } }) });
  db.categoryDecision = { id: "decision-1", primaryCategoryId: "category-1", categories: [{ categoryId: "category-1", sortOrder: 0 }] };
  db.inactiveCategoryIds.add("category-1");

  assert.deepEqual(await materialize(db), { status: "CATEGORY_REVIEW_REQUIRED" });
  assert.equal(db.createdPlaceData, null);
});

test("returns a category blocker for new persisted multi, partial and empty categories", async () => {
  for (const category of [
    { status: "UNRESOLVED", categorySlug: null, categories: { status: "FULLY_MATCHED", matchedCategorySlugs: ["pomoc-prawna", "pomoc-socjalna"] } },
    { status: "UNRESOLVED", categorySlug: null, categories: { status: "PARTIALLY_MATCHED", matchedCategorySlugs: ["pomoc-socjalna"], unresolvedTokens: ["inne"] } },
    { status: "UNRESOLVED", categorySlug: null, categories: { status: "UNRESOLVED", matchedCategorySlugs: [], unresolvedTokens: [] } },
  ]) {
    const db = new FakeDatabase();
    db.candidate.proposedData = persistedCategoryData(category);
    const result = await materializeImportCandidate(db, { candidateId, adminUserId, action: "CREATE_NEW_PLACE" });
    assert.deepEqual(result, { status: "CATEGORY_REVIEW_REQUIRED" });
    assert.equal(db.createdPlaceData, null);
  }
});

test("uses a persisted NO_ORGANIZATION decision for a NEW candidate", async () => {
  const db = new FakeDatabase();
  db.candidate.proposedData = proposedData({ analysis: { category: { status: "MATCHED", categorySlug: "jedzenie" }, organization: { status: "NEW_CANDIDATE", organizationId: null }, place: { classification: "NEW", candidates: [] }, inFileDuplicates: [] } });
  db.candidate.organizationDecision = { decision: "NO_ORGANIZATION", organizationId: null };

  assert.deepEqual(await materialize(db), { status: "CREATED", placeId: "place-1" });
  assert.equal(db.createdPlaceData?.organizationId, null);
});

test("uses an active persisted organization decision instead of matcher data", async () => {
  const db = new FakeDatabase();
  db.candidate.proposedData = proposedData({ analysis: { category: { status: "MATCHED", categorySlug: "jedzenie" }, organization: { status: "POSSIBLE", organizationId: null }, place: { classification: "NEW", candidates: [] }, inFileDuplicates: [] } });
  db.candidate.organizationDecision = { decision: "SELECTED_ORGANIZATION", organizationId: "org-selected" };
  db.organization = { id: "org-selected", active: true };

  assert.deepEqual(await materialize(db), { status: "CREATED", placeId: "place-1" });
  assert.equal(db.createdPlaceData?.organizationId, "org-selected");
});

test("blocks a selected organization that is no longer active or present", async () => {
  for (const organization of [{ id: "org-selected", active: false }, null]) {
    const db = new FakeDatabase();
    db.candidate.proposedData = proposedData({ analysis: { category: { status: "MATCHED", categorySlug: "jedzenie" }, organization: { status: "NEW_CANDIDATE", organizationId: null }, place: { classification: "NEW", candidates: [] }, inFileDuplicates: [] } });
    db.candidate.organizationDecision = { decision: "SELECTED_ORGANIZATION", organizationId: "org-selected" };
    db.organization = organization;
    assert.deepEqual(await materialize(db), { status: "ORGANIZATION_REVIEW_REQUIRED" });
    assert.equal(db.createdPlaceData, null);
  }
});

test("does not create a place for invalid candidate data or skipped candidates", async () => {
  const invalid = new FakeDatabase();
  invalid.candidate.proposedData = {};
  assert.deepEqual(await materialize(invalid), { status: "INVALID_CANDIDATE" });

  const skipped = new FakeDatabase();
  skipped.candidate.status = ImportCandidateStatus.SKIPPED;
  assert.deepEqual(await materialize(skipped), { status: "INVALID_CANDIDATE" });
});

test("keeps place creation, candidate update and audit in one transaction", async () => {
  const db = new FakeDatabase();
  db.failAudit = true;

  await assert.rejects(() => materialize(db), { name: "ImportCandidateMaterializationError" });
  assert.ok(db.createdPlaceData);
  assert.equal(db.auditData, null);
});

test("uses the existing slug helper and suffixes a second place with the same name", async () => {
  const slugs = new Set<string>();
  const first = new FakeDatabase(slugs);
  const firstResult = await materialize(first);
  assert.deepEqual(firstResult, { status: "CREATED", placeId: "place-1" });
  assert.equal(first.createdPlaceData?.slug, "punkt-pomocy");

  const second = new FakeDatabase(slugs);
  second.candidate.id = secondCandidateId;
  const secondResult = await materialize(second, secondCandidateId);
  assert.deepEqual(secondResult, { status: "CREATED", placeId: "place-1" });
  assert.equal(second.createdPlaceData?.slug, `punkt-pomocy-${secondCandidateId.slice(0, 6)}`);
  assert.equal(second.auditData?.action, "PLACE_IMPORTED");
});

test("retries a concurrent slug P2002 and keeps the operation transactional", async () => {
  const db = new FakeDatabase();
  db.forceSlugRace = true;

  assert.deepEqual(await materialize(db), { status: "CREATED", placeId: "place-1" });
  assert.equal(db.createdPlaceData?.slug, `punkt-pomocy-${candidateId.slice(0, 6)}`);
  assert.equal(db.auditData?.action, "PLACE_IMPORTED");
});
