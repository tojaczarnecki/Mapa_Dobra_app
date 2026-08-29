import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client.ts";
import { ImportCandidateStatus } from "../src/generated/prisma/enums.ts";
import { saveImportCandidateOrganizationDecision, type OrganizationDecisionPersistenceDatabase, type OrganizationDecisionPersistenceTransaction, type SaveOrganizationDecisionInput } from "../src/lib/imports/organization-decision-persistence.ts";

type FakeCandidate = {
  id: string;
  importBatchId: string;
  candidateKey: string;
  status: string;
  resolution: string | null;
  createdPlaceId: string | null;
  queueStatus: string | null;
  proposedData: Prisma.JsonValue;
  importBatch: { metadata: Prisma.JsonValue };
  sources: Array<{ sourceEntryId: string }>;
};

function proposed(overrides: Record<string, unknown> = {}): Prisma.JsonValue {
  return {
    mappedValues: { name: "Punkt", addressLine: "Adres", primaryCategory: "Jedzenie" },
    analysis: {
      status: "REVIEW",
      organization: { status: "NEW_CANDIDATE", organizationId: null },
      category: { status: "MATCHED", categorySlug: "jedzenie" },
      place: { classification: "NEW", candidates: [] },
      inFileDuplicates: [],
      ...overrides,
    },
  };
}

function candidate(overrides: Partial<FakeCandidate> = {}): FakeCandidate {
  return {
    id: "candidate-1",
    importBatchId: "batch-1",
    candidateKey: "row-4",
    status: ImportCandidateStatus.REQUIRES_REVIEW,
    resolution: null,
    createdPlaceId: null,
    queueStatus: null,
    proposedData: proposed(),
    importBatch: { metadata: { kind: "SPREADSHEET" } },
    sources: [{ sourceEntryId: "source-1" }],
    ...overrides,
  };
}

class FakeDatabase implements OrganizationDecisionPersistenceDatabase {
  current: FakeCandidate;
  batchCandidates: FakeCandidate[];
  organization: { id: string; active: boolean } | null = null;
  decision: { decision: string; organizationId: string | null } | null = null;
  duplicateDecisions: Array<{ candidateAId: string; candidateBId: string; decision: string }> = [];
  updates: Array<Record<string, unknown>> = [];
  upserts: Array<Record<string, unknown>> = [];
  audits: Array<Record<string, unknown>> = [];
  constructor(initial: FakeCandidate = candidate()) {
    this.current = initial;
    this.batchCandidates = [initial];
  }
  private transaction(): OrganizationDecisionPersistenceTransaction {
    return {
      $queryRaw: async <T>() => [{ id: this.current.id }] as T[],
      importCandidate: {
        findUnique: async () => this.current,
        findMany: async () => this.batchCandidates,
        update: async (args) => {
          this.updates.push(args.data as Record<string, unknown>);
          this.current = { ...this.current, ...args.data } as FakeCandidate;
          return { id: this.current.id };
        },
      },
      importCandidateOrganizationDecision: {
        findUnique: async () => this.decision,
        upsert: async (args) => {
          this.upserts.push(args.create as Record<string, unknown>);
          this.decision = { decision: String(args.create.decision), organizationId: (args.create.organizationId as string | null) ?? null };
        },
      },
      organization: { findUnique: async () => this.organization },
      importCandidateDuplicateDecision: { findMany: async () => this.duplicateDecisions },
      auditLog: { create: async (args) => { this.audits.push(args.data as Record<string, unknown>); } },
    };
  }
  async $transaction<T>(callback: (transaction: OrganizationDecisionPersistenceTransaction) => Promise<T>): Promise<T> {
    return callback(this.transaction());
  }
}

function input(overrides: Partial<SaveOrganizationDecisionInput> = {}): SaveOrganizationDecisionInput {
  return { candidateId: "candidate-1", adminUserId: "admin-1", decision: "NO_ORGANIZATION", organizationId: null, ...overrides };
}

test("NEW_CANDIDATE with NO_ORGANIZATION becomes IMPORT_READY", async () => {
  const db = new FakeDatabase();
  const result = await saveImportCandidateOrganizationDecision(db, input());
  assert.deepEqual(result, { status: "SAVED", changed: true, candidateStatus: "IMPORT_READY", queueStatus: null });
  assert.equal(db.current.status, ImportCandidateStatus.IMPORT_READY);
  assert.equal(db.audits.length, 1);
});

test("selected active organization resolves NEW_CANDIDATE and POSSIBLE", async () => {
  for (const organizationStatus of ["NEW_CANDIDATE", "POSSIBLE"] as const) {
    const db = new FakeDatabase(candidate({ proposedData: proposed({ organization: { status: organizationStatus, organizationId: null } }) }));
    db.organization = { id: "org-other", active: true };
    const result = await saveImportCandidateOrganizationDecision(db, input({ decision: "SELECTED_ORGANIZATION", organizationId: "org-other" }));
    assert.equal(result.status, "SAVED");
    assert.equal(db.current.status, ImportCandidateStatus.IMPORT_READY);
  }
});

test("inactive selected organization is rejected server-side", async () => {
  const db = new FakeDatabase();
  db.organization = { id: "org-1", active: false };
  assert.deepEqual(await saveImportCandidateOrganizationDecision(db, input({ decision: "SELECTED_ORGANIZATION", organizationId: "org-1" })), { status: "ORGANIZATION_INACTIVE" });
  assert.equal(db.upserts.length, 0);
});

test("place review keeps priority after organization resolution", async () => {
  const db = new FakeDatabase(candidate({ proposedData: proposed({ place: { classification: "EXACT_MATCH", candidates: [] } }) }));
  const result = await saveImportCandidateOrganizationDecision(db, input());
  assert.deepEqual(result, { status: "SAVED", changed: true, candidateStatus: "REQUIRES_REVIEW", queueStatus: "PENDING" });
});

test("unresolved duplicate, loser and unresolved category remain blocked", async () => {
  const unresolved = candidate({ proposedData: proposed({ inFileDuplicates: [{ rowNumber: 8 }] }) });
  const unresolvedDb = new FakeDatabase(unresolved);
  unresolvedDb.batchCandidates.push(candidate({ id: "candidate-2", candidateKey: "row-8" }));
  assert.deepEqual(await saveImportCandidateOrganizationDecision(unresolvedDb, input()), { status: "SAVED", changed: true, candidateStatus: "REQUIRES_REVIEW", queueStatus: null });

  const loserDb = new FakeDatabase(candidate({ proposedData: proposed({ inFileDuplicates: [{ rowNumber: 8 }] }) }));
  loserDb.batchCandidates.push(candidate({ id: "candidate-2", candidateKey: "row-8" }));
  loserDb.duplicateDecisions = [{ candidateAId: "candidate-1", candidateBId: "candidate-2", decision: "KEEP_B" }];
  assert.deepEqual(await saveImportCandidateOrganizationDecision(loserDb, input()), { status: "SAVED", changed: true, candidateStatus: "REQUIRES_REVIEW", queueStatus: null });

  const categoryDb = new FakeDatabase(candidate({ proposedData: proposed({ category: { status: "UNRESOLVED" } }) }));
  assert.deepEqual(await saveImportCandidateOrganizationDecision(categoryDb, input()), { status: "SAVED", changed: true, candidateStatus: "REQUIRES_REVIEW", queueStatus: null });
});

test("same-value decision still reconciles but does not create a second audit", async () => {
  const db = new FakeDatabase();
  db.decision = { decision: "NO_ORGANIZATION", organizationId: null };
  const result = await saveImportCandidateOrganizationDecision(db, input());
  assert.deepEqual(result, { status: "SAVED", changed: false, candidateStatus: "IMPORT_READY", queueStatus: null });
  assert.equal(db.audits.length, 0);
  assert.equal(db.updates.length, 1);
});

test("decision updates support SELECTED to NO and NO to SELECTED", async () => {
  const db = new FakeDatabase();
  db.organization = { id: "org-1", active: true };
  await saveImportCandidateOrganizationDecision(db, input({ decision: "SELECTED_ORGANIZATION", organizationId: "org-1" }));
  await saveImportCandidateOrganizationDecision(db, input());
  assert.deepEqual(db.decision, { decision: "NO_ORGANIZATION", organizationId: null });
  assert.equal(db.audits.length, 2);
});

test("decision updates support replacing one selected organization with another", async () => {
  const db = new FakeDatabase();
  db.organization = { id: "org-a", active: true };
  await saveImportCandidateOrganizationDecision(db, input({ decision: "SELECTED_ORGANIZATION", organizationId: "org-a" }));
  db.organization = { id: "org-b", active: true };
  await saveImportCandidateOrganizationDecision(db, input({ decision: "SELECTED_ORGANIZATION", organizationId: "org-b" }));
  assert.deepEqual(db.decision, { decision: "SELECTED_ORGANIZATION", organizationId: "org-b" });
  assert.equal(db.audits.length, 2);
});

test("terminal candidates and invalid decision combinations are rejected", async () => {
  for (const terminal of [
    candidate({ status: ImportCandidateStatus.SKIPPED }),
    candidate({ status: ImportCandidateStatus.IMPORTED }),
    candidate({ status: ImportCandidateStatus.MATCH_EXISTING, resolution: "SAME_PLACE" }),
  ]) {
    assert.deepEqual(await saveImportCandidateOrganizationDecision(new FakeDatabase(terminal), input()), { status: "INVALID_CANDIDATE" });
  }
  assert.deepEqual(await saveImportCandidateOrganizationDecision(new FakeDatabase(), input({ decision: "NO_ORGANIZATION", organizationId: "org-1" })), { status: "INVALID_DECISION" });
});
