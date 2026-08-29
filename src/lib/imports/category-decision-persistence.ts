import { Prisma } from "../../generated/prisma/client.ts";
import { ImportCandidateStatus } from "../../generated/prisma/enums.ts";
import { isSpreadsheetBatchMetadata } from "./spreadsheet-place-review.ts";

type CandidateSnapshot = {
  id: string;
  status: string;
  resolution: string | null;
  createdPlaceId: string | null;
  proposedData: Prisma.JsonValue;
  importBatch: { metadata: Prisma.JsonValue | null };
  sources: Array<{ sourceEntryId: string }>;
};

type PersistedDecision = {
  id: string;
  candidateId: string;
  primaryCategoryId: string;
  resolvedByAdminUserId: string;
  resolvedAt: Date;
  note: string | null;
  categories: Array<{ categoryId: string; sortOrder: number }>;
};

export type CategoryDecisionPersistenceTransaction = {
  $queryRaw<T>(query: Prisma.Sql): Promise<T[]>;
  importCandidate: {
    findUnique(args: Prisma.ImportCandidateFindUniqueArgs): Promise<CandidateSnapshot | null>;
  };
  category: {
    findMany(args: Prisma.CategoryFindManyArgs): Promise<Array<{ id: string; active: boolean }>>;
  };
  importCandidateCategoryDecision: {
    findUnique(args: Prisma.ImportCandidateCategoryDecisionFindUniqueArgs): Promise<PersistedDecision | null>;
    upsert(args: Prisma.ImportCandidateCategoryDecisionUpsertArgs): Promise<{ id: string }>;
  };
  importCandidateCategoryDecisionCategory: {
    deleteMany(args: Prisma.ImportCandidateCategoryDecisionCategoryDeleteManyArgs): Promise<unknown>;
    createMany(args: Prisma.ImportCandidateCategoryDecisionCategoryCreateManyArgs): Promise<unknown>;
  };
  auditLog: {
    create(args: Prisma.AuditLogCreateArgs): Promise<unknown>;
  };
};

export type CategoryDecisionPersistenceDatabase = {
  $transaction<T>(callback: (transaction: CategoryDecisionPersistenceTransaction) => Promise<T>): Promise<T>;
};

export type SaveCategoryDecisionInput = {
  candidateId: string;
  primaryCategoryId: string;
  selectedCategoryIds: string[];
  resolvedByAdminUserId: string;
  note?: string | null;
};

export type SaveCategoryDecisionResult =
  | { status: "SAVED"; changed: boolean; decision: PersistedDecision }
  | { status: "INVALID_CANDIDATE" | "INVALID_DECISION" | "CATEGORY_NOT_FOUND" | "CATEGORY_INACTIVE" | "NOTE_TOO_LONG" };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function sameArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function decisionCategoryIds(decision: PersistedDecision | null): string[] {
  if (!decision) return [];
  return [...decision.categories]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.categoryId.localeCompare(right.categoryId))
    .map((item) => item.categoryId);
}

function snapshotArgs(candidateId: string): Prisma.ImportCandidateCategoryDecisionFindUniqueArgs {
  return {
    where: { candidateId },
    include: { categories: { select: { categoryId: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { categoryId: "asc" }] } },
  };
}

export async function getImportCandidateCategoryDecision(
  database: CategoryDecisionPersistenceDatabase,
  candidateId: string,
): Promise<PersistedDecision | null> {
  if (!isUuid(candidateId)) return null;
  return database.$transaction((transaction) => transaction.importCandidateCategoryDecision.findUnique(snapshotArgs(candidateId)));
}

export async function saveImportCandidateCategoryDecision(
  database: CategoryDecisionPersistenceDatabase,
  input: SaveCategoryDecisionInput,
): Promise<SaveCategoryDecisionResult> {
  if (!isUuid(input.candidateId) || !isUuid(input.primaryCategoryId) || !isUuid(input.resolvedByAdminUserId)) return { status: "INVALID_DECISION" };
  if (!Array.isArray(input.selectedCategoryIds) || input.selectedCategoryIds.length === 0) return { status: "INVALID_DECISION" };
  if (input.selectedCategoryIds.some((id) => !isUuid(id))) return { status: "INVALID_DECISION" };
  if (new Set(input.selectedCategoryIds).size !== input.selectedCategoryIds.length || !input.selectedCategoryIds.includes(input.primaryCategoryId)) return { status: "INVALID_DECISION" };
  if (input.note !== undefined && input.note !== null && input.note.length > 1000) return { status: "NOTE_TOO_LONG" };

  return database.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "import_candidates" WHERE "id" = ${input.candidateId}::uuid FOR UPDATE`,
    );
    if (!locked.length) return { status: "INVALID_CANDIDATE" };

    const candidate = await transaction.importCandidate.findUnique({
      where: { id: input.candidateId },
      include: { importBatch: { select: { metadata: true } }, sources: { select: { sourceEntryId: true } } },
    });
    if (!candidate || !isSpreadsheetBatchMetadata(candidate.importBatch.metadata) || candidate.resolution || candidate.createdPlaceId || candidate.status === ImportCandidateStatus.IMPORTED || candidate.status === ImportCandidateStatus.SKIPPED || candidate.status === ImportCandidateStatus.MATCH_EXISTING) {
      return { status: "INVALID_CANDIDATE" };
    }

    const categories = await transaction.category.findMany({
      where: { id: { in: input.selectedCategoryIds } },
      select: { id: true, active: true },
    });
    if (categories.length !== input.selectedCategoryIds.length) return { status: "CATEGORY_NOT_FOUND" };
    if (categories.some((category) => !category.active)) return { status: "CATEGORY_INACTIVE" };

    const previous = await transaction.importCandidateCategoryDecision.findUnique(snapshotArgs(candidate.id));
    const selectedCategoryIds = [input.primaryCategoryId, ...input.selectedCategoryIds.filter((id) => id !== input.primaryCategoryId)];
    const changed = previous?.primaryCategoryId !== input.primaryCategoryId || !sameArray(decisionCategoryIds(previous), selectedCategoryIds);
    const now = new Date();
    const parent = await transaction.importCandidateCategoryDecision.upsert({
      where: { candidateId: candidate.id },
      create: { candidateId: candidate.id, primaryCategoryId: input.primaryCategoryId, resolvedByAdminUserId: input.resolvedByAdminUserId, resolvedAt: now, note: input.note ?? null },
      update: { primaryCategoryId: input.primaryCategoryId, resolvedByAdminUserId: input.resolvedByAdminUserId, resolvedAt: now, note: input.note ?? null },
    });
    await transaction.importCandidateCategoryDecisionCategory.deleteMany({ where: { decisionId: parent.id } });
    await transaction.importCandidateCategoryDecisionCategory.createMany({
      data: selectedCategoryIds.map((categoryId, sortOrder) => ({ decisionId: parent.id, categoryId, sortOrder })),
    });
    const persisted = await transaction.importCandidateCategoryDecision.findUnique(snapshotArgs(candidate.id));
    if (!persisted) return { status: "INVALID_DECISION" };

    if (changed) {
      await transaction.auditLog.create({
        data: {
          adminUserId: input.resolvedByAdminUserId,
          action: "IMPORT_CONFLICT_RESOLVED",
          entityType: "IMPORT_CANDIDATE",
          entityId: candidate.id,
          changedFields: ["categoryDecision"],
          previousValues: { candidateId: candidate.id, sourceEntryId: candidate.sources[0]?.sourceEntryId ?? null, kind: "CATEGORY_DECISION", previousPrimaryCategoryId: previous?.primaryCategoryId ?? null, previousCategoryIds: decisionCategoryIds(previous) },
          newValues: { candidateId: candidate.id, sourceEntryId: candidate.sources[0]?.sourceEntryId ?? null, kind: "CATEGORY_DECISION", newPrimaryCategoryId: input.primaryCategoryId, newCategoryIds: selectedCategoryIds },
          changeOrigin: "SOURCE_IMPORT",
          sourceReferenceId: candidate.id,
          note: "Zapisano decyzję kategorii kandydata.",
        },
      });
    }
    return { status: "SAVED", changed, decision: persisted };
  });
}
