import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client.ts";
import { ImportBatchStatus, ImportCandidateStatus } from "../src/generated/prisma/enums.ts";
import type { ImportBatchStatus as ImportBatchStatusValue } from "../src/generated/prisma/enums.ts";
import { materializeImportCandidate, type MaterializeCandidateDatabase, type MaterializeCandidateTransaction } from "../src/lib/imports/materialize-candidate.ts";

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

function snapshot(overrides: Partial<{
  status: ImportCandidateStatus;
  createdPlaceId: string | null;
  matchedPlaceId: string | null;
  proposedData: Prisma.JsonValue;
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
    ...overrides,
  };
}

class FakeDatabase implements MaterializeCandidateDatabase {
  candidate = snapshot();
  category: { id: string; slug: string; active: boolean } | null = { id: "category-1", slug: "jedzenie", active: true };
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

  constructor(slugs = new Set<string>()) {
    this.slugs = slugs;
  }

  private transaction(): MaterializeCandidateTransaction {
    return {
      $queryRaw: async <T>(query: Prisma.Sql) => {
        this.lockQuery = query;
        return [{ id: this.candidate.id }] as T[];
      },
      importCandidate: {
        findUnique: async () => this.candidate,
        update: async (args) => {
          this.candidateUpdate = args.data;
          return { id: candidateId };
        },
      },
      category: {
        findFirst: async () => this.category,
      },
      organization: {
        findUnique: async () => this.organization,
      },
      place: {
        findUnique: async (args) => this.slugs.has(String(args.where.slug)) ? { id: "existing-place" } : null,
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
