import { Prisma } from "../../generated/prisma/client.ts";
import { ImportCandidateStatus } from "../../generated/prisma/enums.ts";
import { duplicateRowNumbers, getDuplicateDecisionState, getDuplicateDisposition, reconcileCandidateAfterDuplicateDecision, type StoredDuplicateDecision } from "./duplicate-decisions.ts";
import { isSpreadsheetBatchMetadata } from "./spreadsheet-place-review.ts";
import { resolveEffectiveOrganization, type OrganizationDecision, type PersistedOrganizationAnalysis } from "./organization-decisions.ts";
import { resolveEffectiveCategory } from "./category-decisions.ts";

type CandidateSnapshot = {
  id: string;
  importBatchId: string;
  candidateKey: string;
  status: string;
  resolution: string | null;
  createdPlaceId: string | null;
  queueStatus: string | null;
  reviewReasons?: string[];
  proposedData: Prisma.JsonValue;
  importBatch: { metadata: Prisma.JsonValue | null };
  sources: Array<{ sourceEntryId: string }>;
  categoryDecision?: { primaryCategoryId: string; categories: Array<{ categoryId: string; sortOrder: number }> } | null;
};

type BatchCandidate = Pick<CandidateSnapshot, "id" | "candidateKey" | "status" | "resolution" | "createdPlaceId" | "queueStatus" | "reviewReasons" | "proposedData">;

export type OrganizationDecisionPersistenceTransaction = {
  $queryRaw<T>(query: Prisma.Sql): Promise<T[]>;
  importCandidate: {
    findUnique(args: Prisma.ImportCandidateFindUniqueArgs): Promise<CandidateSnapshot | null>;
    findMany(args: Prisma.ImportCandidateFindManyArgs): Promise<BatchCandidate[]>;
    update(args: Prisma.ImportCandidateUpdateArgs): Promise<{ id: string }>;
  };
  importCandidateOrganizationDecision: {
    findUnique(args: Prisma.ImportCandidateOrganizationDecisionFindUniqueArgs): Promise<{ decision: string; organizationId: string | null } | null>;
    upsert(args: Prisma.ImportCandidateOrganizationDecisionUpsertArgs): Promise<unknown>;
  };
  organization: {
    findUnique(args: Prisma.OrganizationFindUniqueArgs): Promise<{ id: string; active: boolean } | null>;
  };
  category?: {
    findMany(args: Prisma.CategoryFindManyArgs): Promise<Array<{ id: string; active: boolean }>>;
  };
  importCandidateDuplicateDecision: {
    findMany(args: Prisma.ImportCandidateDuplicateDecisionFindManyArgs): Promise<Array<{ candidateAId: string; candidateBId: string; decision: string }>>;
  };
  auditLog: {
    create(args: Prisma.AuditLogCreateArgs): Promise<unknown>;
  };
};

export type OrganizationDecisionPersistenceDatabase = {
  $transaction<T>(callback: (transaction: OrganizationDecisionPersistenceTransaction) => Promise<T>): Promise<T>;
};

export type SaveOrganizationDecisionInput = {
  candidateId: string;
  adminUserId: string;
  decision: OrganizationDecision["decision"];
  organizationId: string | null;
  note?: string | null;
};

export type SaveOrganizationDecisionResult =
  | { status: "SAVED"; changed: boolean; candidateStatus: "IMPORT_READY" | "REQUIRES_REVIEW"; queueStatus: "PENDING" | null }
  | { status: "INVALID_CANDIDATE" | "ORGANIZATION_NOT_FOUND" | "ORGANIZATION_INACTIVE" | "INVALID_DECISION" };

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function organizationAnalysis(value: unknown): PersistedOrganizationAnalysis | null {
  const root = record(value);
  const analysis = record(root?.analysis);
  const organization = record(analysis?.organization);
  const status = organization?.status;
  const organizationId = organization?.organizationId;
  if ((status !== "NONE" && status !== "MATCHED" && status !== "POSSIBLE" && status !== "CONFLICT" && status !== "NEW_CANDIDATE") || (organizationId !== null && typeof organizationId !== "string")) return null;
  return { status, organizationId: organizationId as string | null };
}

function candidateRowNumber(candidateKey: string): number | null {
  const match = /^row-(\d+)$/.exec(candidateKey);
  if (!match) return null;
  const rowNumber = Number(match[1]);
  return Number.isSafeInteger(rowNumber) && rowNumber > 0 ? rowNumber : null;
}

function currentOrganizationId(analysis: PersistedOrganizationAnalysis, decision: OrganizationDecision): string | null {
  return decision.decision === "SELECTED_ORGANIZATION" ? decision.organizationId : analysis.organizationId;
}

function analysisStatusForCandidate(value: unknown): string | null {
  const analysis = record(record(value)?.analysis);
  const category = record(analysis?.category);
  const status = category?.status ?? analysis?.categoryStatus;
  return typeof status === "string" ? status : null;
}

export async function saveImportCandidateOrganizationDecision(
  database: OrganizationDecisionPersistenceDatabase,
  input: SaveOrganizationDecisionInput,
): Promise<SaveOrganizationDecisionResult> {
  if (input.decision === "SELECTED_ORGANIZATION" && (typeof input.organizationId !== "string" || !input.organizationId.trim())) return { status: "INVALID_DECISION" };
  if (input.decision === "NO_ORGANIZATION" && input.organizationId !== null) return { status: "INVALID_DECISION" };
  let decision: OrganizationDecision;
  if (input.decision === "SELECTED_ORGANIZATION") {
    if (typeof input.organizationId !== "string") return { status: "INVALID_DECISION" };
    decision = { decision: input.decision, organizationId: input.organizationId };
  } else {
    decision = { decision: input.decision, organizationId: null };
  }

  return database.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "import_candidates" WHERE "id" = ${input.candidateId}::uuid FOR UPDATE`,
    );
    if (!locked.length) return { status: "INVALID_CANDIDATE" };

    const candidate = await transaction.importCandidate.findUnique({
      where: { id: input.candidateId },
      include: { importBatch: { select: { metadata: true } }, sources: { select: { sourceEntryId: true } }, categoryDecision: { select: { primaryCategoryId: true, categories: { select: { categoryId: true, sortOrder: true } } } } },
    });
    if (!candidate || !isSpreadsheetBatchMetadata(candidate.importBatch.metadata) || candidate.resolution || candidate.createdPlaceId || candidate.status === ImportCandidateStatus.IMPORTED || candidate.status === ImportCandidateStatus.SKIPPED || candidate.status === ImportCandidateStatus.MATCH_EXISTING) return { status: "INVALID_CANDIDATE" };

    const analysis = organizationAnalysis(candidate.proposedData);
    if (!analysis) return { status: "INVALID_CANDIDATE" };
    const organizationId = currentOrganizationId(analysis, decision);
    const currentOrganization = organizationId ? await transaction.organization.findUnique({ where: { id: organizationId }, select: { id: true, active: true } }) : null;
    if (input.decision === "SELECTED_ORGANIZATION" && !currentOrganization) return { status: "ORGANIZATION_NOT_FOUND" };
    if (input.decision === "SELECTED_ORGANIZATION" && !currentOrganization?.active) return { status: "ORGANIZATION_INACTIVE" };

    const previous = await transaction.importCandidateOrganizationDecision.findUnique({ where: { candidateId: candidate.id }, select: { decision: true, organizationId: true } });
    await transaction.importCandidateOrganizationDecision.upsert({
      where: { candidateId: candidate.id },
      create: { candidateId: candidate.id, decision: decision.decision, organizationId: decision.organizationId, resolvedByAdminUserId: input.adminUserId, note: input.note ?? null },
      update: { decision: decision.decision, organizationId: decision.organizationId, resolvedByAdminUserId: input.adminUserId, resolvedAt: new Date(), note: input.note ?? null },
    });

    const batchCandidates = await transaction.importCandidate.findMany({ where: { importBatchId: candidate.importBatchId }, select: { id: true, candidateKey: true, proposedData: true, status: true, resolution: true, createdPlaceId: true, queueStatus: true, reviewReasons: true } });
    const rowNumberToCandidateId = new Map<number, string>();
    for (const item of batchCandidates) {
      const rowNumber = candidateRowNumber(item.candidateKey);
      if (rowNumber !== null) rowNumberToCandidateId.set(rowNumber, item.id);
    }
    const storedDecisions = await transaction.importCandidateDuplicateDecision.findMany({ where: { candidateA: { importBatchId: candidate.importBatchId } }, select: { candidateAId: true, candidateBId: true, decision: true } });
    const decisions = storedDecisions.map((item) => ({ ...item, decision: item.decision as StoredDuplicateDecision["decision"] }));
    const duplicateDisposition = (item: BatchCandidate) => getDuplicateDisposition(getDuplicateDecisionState(item.id, duplicateRowNumbers(item.proposedData).map((rowNumber) => ({ rowNumber })), rowNumberToCandidateId, decisions));
    const disposition = duplicateDisposition(candidate);
    const effective = resolveEffectiveOrganization(analysis, decision, currentOrganization);
    let categoryResolved = analysisStatusForCandidate(candidate.proposedData) === "MATCHED";
    if (candidate.categoryDecision && transaction.category) {
      const categoryIds = candidate.categoryDecision.categories.map((item) => item.categoryId);
      const categorySnapshots = await transaction.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, active: true } });
      const categoryResult = resolveEffectiveCategory(
        { categoryIds, requiresReview: false, unresolvedTokens: [], warnings: [] },
        candidate.categoryDecision,
        categorySnapshots,
      );
      categoryResolved = categoryResult.status !== "REQUIRES_REVIEW";
    }
    const reconciliation = reconcileCandidateAfterDuplicateDecision(candidate, disposition, effective.status === "NO_ORGANIZATION" || effective.status === "USE_MATCHED_ORGANIZATION" || effective.status === "USE_SELECTED_ORGANIZATION", categoryResolved);
    if (reconciliation && (candidate.status !== reconciliation.status || candidate.queueStatus !== reconciliation.queueStatus || JSON.stringify(candidate.reviewReasons) !== JSON.stringify(reconciliation.reviewReasons))) {
      await transaction.importCandidate.update({ where: { id: candidate.id }, data: reconciliation });
    }

    const changed = previous?.decision !== decision.decision || previous.organizationId !== decision.organizationId;
    if (changed) {
      await transaction.auditLog.create({
        data: {
          adminUserId: input.adminUserId,
          action: "IMPORT_CONFLICT_RESOLVED",
          entityType: "IMPORT_CANDIDATE",
          entityId: candidate.id,
          changedFields: ["organizationDecision"],
          previousValues: { candidateId: candidate.id, sourceEntryId: candidate.sources[0]?.sourceEntryId ?? null, kind: "ORGANIZATION_DECISION", previousDecision: previous?.decision ?? null, previousOrganizationId: previous?.organizationId ?? null },
          newValues: { candidateId: candidate.id, sourceEntryId: candidate.sources[0]?.sourceEntryId ?? null, kind: "ORGANIZATION_DECISION", newDecision: decision.decision, newOrganizationId: decision.organizationId },
          changeOrigin: "SOURCE_IMPORT",
          sourceReferenceId: candidate.id,
          note: "Zapisano decyzję organizacyjną kandydata.",
        },
      });
    }
    const nextStatus = reconciliation?.status ?? candidate.status;
    const nextQueueStatus = reconciliation?.queueStatus ?? candidate.queueStatus;
    return { status: "SAVED", changed, candidateStatus: nextStatus as "IMPORT_READY" | "REQUIRES_REVIEW", queueStatus: nextQueueStatus as "PENDING" | null };
  });
}
