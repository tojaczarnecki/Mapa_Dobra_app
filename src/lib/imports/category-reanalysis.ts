import { Prisma } from "../../generated/prisma/client.ts";
import { ImportCandidateStatus } from "../../generated/prisma/enums.ts";
import { matchCategories, type ImportCategoryReference, type MultiCategoryMatch } from "./matching.ts";
import { duplicateRowNumbers, getDuplicateDecisionState, getDuplicateDisposition, reconcileCandidateAfterDuplicateDecision, type StoredDuplicateDecision } from "./duplicate-decisions.ts";
import { isSpreadsheetBatchMetadata } from "./spreadsheet-place-review.ts";
import { parseOrganizationDecision, resolveEffectiveOrganization, type PersistedOrganizationAnalysis } from "./organization-decisions.ts";
import { resolveEffectiveCategory, type CategoryReanalysis } from "./category-decisions.ts";

type CandidateSnapshot = {
  id: string;
  importBatchId: string;
  candidateKey: string;
  status: string;
  resolution: string | null;
  queueStatus: string | null;
  createdPlaceId: string | null;
  categorySlugs: string[];
  primaryCategorySlug: string | null;
  reviewReasons: string[];
  proposedData: Prisma.JsonValue;
  importBatch: { metadata: Prisma.JsonValue | null };
  organizationDecision: { decision: string; organizationId: string | null } | null;
  categoryDecision: { primaryCategoryId: string; categories: Array<{ categoryId: string; sortOrder: number }> } | null;
};

type BatchCandidate = Pick<CandidateSnapshot, "id" | "candidateKey" | "status" | "resolution" | "createdPlaceId" | "queueStatus" | "proposedData">;

export type CategoryReanalysisTransaction = {
  $queryRaw<T>(query: Prisma.Sql): Promise<T[]>;
  importCandidate: {
    findUnique(args: Prisma.ImportCandidateFindUniqueArgs): Promise<CandidateSnapshot | null>;
    findMany(args: Prisma.ImportCandidateFindManyArgs): Promise<BatchCandidate[]>;
    update(args: Prisma.ImportCandidateUpdateArgs): Promise<{ id: string }>;
  };
  importCandidateDuplicateDecision: {
    findMany(args: Prisma.ImportCandidateDuplicateDecisionFindManyArgs): Promise<Array<{ candidateAId: string; candidateBId: string; decision: string }>>;
  };
  category: {
    findMany(args: Prisma.CategoryFindManyArgs): Promise<ImportCategoryReference[]>;
  };
  organization: {
    findUnique(args: Prisma.OrganizationFindUniqueArgs): Promise<{ id: string; active: boolean } | null>;
  };
  auditLog: {
    create(args: Prisma.AuditLogCreateArgs): Promise<unknown>;
  };
};

export type CategoryReanalysisDatabase = {
  $transaction<T>(callback: (transaction: CategoryReanalysisTransaction) => Promise<T>): Promise<T>;
};

export type ReanalyseImportCandidateCategoryInput = {
  candidateId: string;
  resolvedByAdminUserId: string;
};

export type ReanalyseImportCandidateCategoryResult =
  | { status: "REANALYZED"; candidateStatus: "IMPORT_READY" | "REQUIRES_REVIEW"; queueStatus: "PENDING" | null; reanalysis: CategoryReanalysis }
  | { status: "NO_OP"; candidateStatus: string; queueStatus: string | null; reanalysis: CategoryReanalysis }
  | { status: "INVALID_CANDIDATE" | "CATEGORY_REVIEW_REQUIRED" | "SOURCE_VALUE_MISSING" | "CATEGORY_NOT_FOUND" | "CATEGORY_INACTIVE" };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const categoryReviewCodes = new Set(["UNRESOLVED_CATEGORY", "PRIMARY_CATEGORY_DECISION_REQUIRED", "INACTIVE_CATEGORY"]);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function candidateRowNumber(candidateKey: string): number | null {
  const match = /^row-(\d+)$/.exec(candidateKey);
  if (!match) return null;
  const rowNumber = Number(match[1]);
  return Number.isSafeInteger(rowNumber) && rowNumber > 0 ? rowNumber : null;
}

function sourceCategoryValue(proposedData: unknown): string | null {
  const mappedValues = record(record(proposedData)?.mappedValues);
  const value = mappedValues?.primaryCategory;
  return typeof value === "string" && value.trim() ? value : null;
}

function originalCategoryStatus(proposedData: unknown): string | null {
  const analysis = record(record(proposedData)?.analysis);
  const category = record(analysis?.category);
  const status = category?.status ?? analysis?.categoryStatus;
  return typeof status === "string" ? status : null;
}

function organizationAnalysis(proposedData: unknown): PersistedOrganizationAnalysis | null {
  const organization = record(record(record(proposedData)?.analysis)?.organization);
  const status = organization?.status;
  const organizationId = organization?.organizationId;
  if (!["NONE", "MATCHED", "POSSIBLE", "CONFLICT", "NEW_CANDIDATE"].includes(String(status)) || (organizationId !== null && typeof organizationId !== "string")) return null;
  return { status: status as PersistedOrganizationAnalysis["status"], organizationId: organizationId as string | null };
}

function analysisCategoryState(proposedData: unknown) {
  const analysis = record(record(proposedData)?.analysis);
  const category = record(analysis?.category);
  return {
    categoryIds: [],
    requiresReview: (category?.status ?? analysis?.categoryStatus) !== "MATCHED",
    unresolvedTokens: [],
    warnings: [],
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameReanalysisResult(left: unknown, right: CategoryReanalysis): boolean {
  const previous = record(left);
  if (!previous) return false;
  return previous.version === 1
    && previous.sourceValue === right.sourceValue
    && sameJson(previous.result, right.result);
}

function nextReviewReasons(current: string[]): string[] {
  return current.filter((reason) => !categoryReviewCodes.has(reason));
}

export async function reanalyseImportCandidateCategory(
  database: CategoryReanalysisDatabase,
  input: ReanalyseImportCandidateCategoryInput,
): Promise<ReanalyseImportCandidateCategoryResult> {
  if (!uuidPattern.test(input.candidateId) || !uuidPattern.test(input.resolvedByAdminUserId)) return { status: "INVALID_CANDIDATE" };

  return database.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "import_candidates" WHERE "id" = ${input.candidateId}::uuid FOR UPDATE`,
    );
    if (!locked.length) return { status: "INVALID_CANDIDATE" };

    const candidate = await transaction.importCandidate.findUnique({
      where: { id: input.candidateId },
      include: {
        importBatch: { select: { metadata: true } },
        organizationDecision: { select: { decision: true, organizationId: true } },
        categoryDecision: { select: { primaryCategoryId: true, categories: { select: { categoryId: true, sortOrder: true } } } },
      },
    });
    if (!candidate || !isSpreadsheetBatchMetadata(candidate.importBatch.metadata) || candidate.createdPlaceId || candidate.resolution || candidate.categoryDecision || new Set<string>([ImportCandidateStatus.IMPORTED, ImportCandidateStatus.SKIPPED, ImportCandidateStatus.MATCH_EXISTING]).has(candidate.status)) return { status: "INVALID_CANDIDATE" };
    if (originalCategoryStatus(candidate.proposedData) === "MATCHED") return { status: "INVALID_CANDIDATE" };

    const sourceValue = sourceCategoryValue(candidate.proposedData);
    if (!sourceValue) return { status: "SOURCE_VALUE_MISSING" };
    const catalog = await transaction.category.findMany({ select: { id: true, slug: true, name: true, active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    const result: MultiCategoryMatch = matchCategories(sourceValue, catalog);
    if (result.status !== "FULLY_MATCHED" || result.matchedCategorySlugs.length !== 1 || result.unresolvedTokens.length > 0 || result.requiresReview) return { status: "CATEGORY_REVIEW_REQUIRED" };
    const matchedCategory = catalog.find((category) => category.slug === result.matchedCategorySlugs[0]);
    if (!matchedCategory) return { status: "CATEGORY_NOT_FOUND" };
    if (!matchedCategory.active || result.warnings.length > 0) return { status: "CATEGORY_INACTIVE" };

    const reanalysis: CategoryReanalysis = {
      version: 1,
      sourceValue,
      analyzedAt: new Date().toISOString(),
      analyzedByAdminUserId: input.resolvedByAdminUserId,
      result,
    };
    const proposedData = record(candidate.proposedData) ?? {};
    const previousReanalysis = record(record(proposedData.reanalysis)?.category);
    const persistedReanalysis = sameReanalysisResult(previousReanalysis, reanalysis) ? previousReanalysis as unknown as CategoryReanalysis : reanalysis;
    const nextProposedData = { ...proposedData, reanalysis: { ...(record(proposedData.reanalysis) ?? {}), category: persistedReanalysis } };

    const batchCandidates = await transaction.importCandidate.findMany({ where: { importBatchId: candidate.importBatchId }, select: { id: true, candidateKey: true, proposedData: true, status: true, resolution: true, createdPlaceId: true, queueStatus: true } });
    const rowMap = new Map<number, string>();
    for (const item of batchCandidates) {
      const rowNumber = candidateRowNumber(item.candidateKey);
      if (rowNumber !== null) rowMap.set(rowNumber, item.id);
    }
    const storedDecisions = await transaction.importCandidateDuplicateDecision.findMany({ where: { candidateA: { importBatchId: candidate.importBatchId } }, select: { candidateAId: true, candidateBId: true, decision: true } });
    const decisions = storedDecisions.map((item) => ({ ...item, decision: item.decision as StoredDuplicateDecision["decision"] }));
    const duplicateState = getDuplicateDecisionState(candidate.id, duplicateRowNumbers(candidate.proposedData).map((rowNumber) => ({ rowNumber })), rowMap, decisions);
    const duplicateDisposition = getDuplicateDisposition(duplicateState);
    const orgAnalysis = organizationAnalysis(candidate.proposedData);
    const orgDecision = parseOrganizationDecision(candidate.organizationDecision);
    const organizationId = orgDecision?.decision === "SELECTED_ORGANIZATION" ? orgDecision.organizationId : orgAnalysis?.organizationId ?? null;
    const organization = organizationId ? await transaction.organization.findUnique({ where: { id: organizationId }, select: { id: true, active: true } }) : null;
    const effectiveOrganization = orgAnalysis ? resolveEffectiveOrganization(orgAnalysis, orgDecision, organization) : { status: "UNRESOLVED" as const, organizationId: null };
    const effectiveCategory = resolveEffectiveCategory(analysisCategoryState(candidate.proposedData), null, [matchedCategory], { categoryIds: result.matchedCategoryIds, requiresReview: false, unresolvedTokens: [], warnings: [] });
    const reconciliation = reconcileCandidateAfterDuplicateDecision(candidate, duplicateDisposition, ["NO_ORGANIZATION", "USE_MATCHED_ORGANIZATION", "USE_SELECTED_ORGANIZATION"].includes(effectiveOrganization.status), effectiveCategory.status !== "REQUIRES_REVIEW");
    const reviewReasons = nextReviewReasons(candidate.reviewReasons);
    const derivedChanged = !sameJson(candidate.categorySlugs, result.matchedCategorySlugs) || candidate.primaryCategorySlug !== result.matchedCategorySlugs[0] || !sameJson(candidate.reviewReasons, reviewReasons) || !sameReanalysisResult(previousReanalysis, reanalysis);
    const reconciliationChanged = reconciliation && (candidate.status !== reconciliation.status || candidate.queueStatus !== reconciliation.queueStatus);
    if (derivedChanged || reconciliationChanged) {
      await transaction.importCandidate.update({ where: { id: candidate.id }, data: { ...(derivedChanged ? { proposedData: nextProposedData as Prisma.InputJsonValue, categorySlugs: result.matchedCategorySlugs, primaryCategorySlug: result.matchedCategorySlugs[0], reviewReasons } : {}), ...(reconciliationChanged ? reconciliation : {}) } });
    }
    if (!derivedChanged) return { status: "NO_OP", candidateStatus: reconciliation?.status ?? candidate.status, queueStatus: reconciliation?.queueStatus ?? candidate.queueStatus, reanalysis: persistedReanalysis };
    await transaction.auditLog.create({
      data: {
        adminUserId: input.resolvedByAdminUserId,
        action: "IMPORT_CONFLICT_RESOLVED",
        entityType: "IMPORT_CANDIDATE",
        entityId: candidate.id,
        changedFields: ["categoryReanalysis", "categorySlugs", "primaryCategorySlug", "reviewReasons"],
        previousValues: { kind: "CATEGORY_REANALYSIS", candidateId: candidate.id, sourceValue, previousCategorySlugs: candidate.categorySlugs, previousPrimaryCategorySlug: candidate.primaryCategorySlug },
        newValues: { kind: "CATEGORY_REANALYSIS", candidateId: candidate.id, sourceValue, newCategorySlugs: result.matchedCategorySlugs, newPrimaryCategorySlug: result.matchedCategorySlugs[0] },
        changeOrigin: "SOURCE_IMPORT",
        sourceReferenceId: candidate.id,
        note: "Kontrolowana reanaliza kategorii kandydata.",
      },
    });
    return { status: "REANALYZED", candidateStatus: (reconciliation?.status ?? candidate.status) as "IMPORT_READY" | "REQUIRES_REVIEW", queueStatus: (reconciliation?.queueStatus ?? candidate.queueStatus) as "PENDING" | null, reanalysis };
  });
}
