import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.ts";
import { ImportBatchStatus, ImportCandidateStatus } from "../../generated/prisma/enums.ts";
import type { ImportBatchStatus as ImportBatchStatusValue } from "../../generated/prisma/enums.ts";
import type { ColumnMapping, MappedImportRow } from "./column-mapping.ts";
import type { CategoryMatch, MatchingAnalysisRow, MultiCategoryMatch } from "./matching.ts";
import { isSpreadsheetPlaceReviewCandidate } from "./spreadsheet-place-review.ts";

const CHUNK_SIZE = 50;

/**
 * SERVER-ANALYZED DATA: this internal persistence input must only be produced
 * after parsing, mapping and matching have run on the server.
 */
export type PersistImportAnalysisInput = {
  title: string;
  originalFileName: string;
  fileHash: string;
  sourceUrl: string;
  publisher: string;
  edition: string;
  importDate: Date;
  sheetName: string;
  headerRowNumber: number;
  mapping: ColumnMapping;
  rows: Array<MatchingAnalysisRow & { source: Pick<MappedImportRow, "rawValues" | "values"> }>;
};

export type ImportAnalysisTransaction = {
  importBatch: {
    findFirst(args: Prisma.ImportBatchFindFirstArgs): Promise<{ id: string; status: ImportBatchStatusValue } | null>;
    create(args: Prisma.ImportBatchCreateArgs): Promise<{ id: string }>;
    update(args: Prisma.ImportBatchUpdateArgs): Promise<{ id: string }>;
  };
  importSourceEntry: { create(args: Prisma.ImportSourceEntryCreateArgs): Promise<{ id: string }> };
  importCandidate: { create(args: Prisma.ImportCandidateCreateArgs): Promise<{ id: string }> };
  importCandidateSource: { create(args: Prisma.ImportCandidateSourceCreateArgs): Promise<unknown> };
};
export type ImportAnalysisDatabase = {
  $transaction<T>(callback: (transaction: ImportAnalysisTransaction) => Promise<T>): Promise<T>;
};

export type PersistImportAnalysisResult =
  | { status: "CREATED"; batchId: string; sourceEntryCount: number; candidateCount: number; counters: ImportAnalysisCounters }
  | { status: "DUPLICATE_IMPORT"; batchId: string }
  | { status: "EXISTING_INCOMPLETE_IMPORT"; batchId: string }
  | { status: "EXISTING_FAILED_IMPORT"; batchId: string };

export type ImportAnalysisCounters = {
  ready: number;
  matched: number;
  review: number;
  error: number;
  skipped: number;
};

export class ImportAnalysisPersistenceError extends Error {
  readonly code: "INVALID_FILE_HASH" | "PERSISTENCE_ERROR";

  constructor(code: "INVALID_FILE_HASH" | "PERSISTENCE_ERROR", message: string = code) {
    super(message);
    this.name = "ImportAnalysisPersistenceError";
    this.code = code;
  }
}

function existingImportResult(batch: { id: string; status: ImportBatchStatusValue }): Exclude<PersistImportAnalysisResult, { status: "CREATED" }> {
  if (batch.status === ImportBatchStatus.PROCESSING) return { status: "EXISTING_INCOMPLETE_IMPORT", batchId: batch.id };
  if (batch.status === ImportBatchStatus.FAILED) return { status: "EXISTING_FAILED_IMPORT", batchId: batch.id };
  return { status: "DUPLICATE_IMPORT", batchId: batch.id };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function categoryAnalysis(row: MatchingAnalysisRow): MultiCategoryMatch | null {
  return row.categoryMatches ?? null;
}

function legacyCategoryMatch(row: MatchingAnalysisRow): CategoryMatch {
  const multi = categoryAnalysis(row);
  if (!multi) return row.categoryMatch;
  if (multi.matchedCategorySlugs.length === 1 && multi.unresolvedTokens.length === 0) {
    const matchedToken = multi.tokens.find((token) => token.status === "MATCHED" && token.categorySlug === multi.matchedCategorySlugs[0]);
    if (matchedToken) return matchedToken;
  }
  return {
    status: "UNRESOLVED",
    method: null,
    categoryId: null,
    categorySlug: null,
    reasons: [multi.matchedCategorySlugs.length > 1 ? "PRIMARY_CATEGORY_DECISION_REQUIRED" : "UNRESOLVED_CATEGORY"],
    warnings: multi.warnings,
  };
}

function categoryReviewReasons(row: MatchingAnalysisRow): string[] {
  const multi = categoryAnalysis(row);
  if (!multi) return row.categoryMatch.reasons;
  const reasons: string[] = [];
  if (multi.matchedCategorySlugs.length === 0 && multi.unresolvedTokens.length === 0) reasons.push("UNRESOLVED_CATEGORY");
  if (multi.unresolvedTokens.length > 0) reasons.push("UNRESOLVED_CATEGORY");
  if (multi.matchedCategorySlugs.length > 1) reasons.push("PRIMARY_CATEGORY_DECISION_REQUIRED");
  if (multi.warnings.length > 0) reasons.push("INACTIVE_CATEGORY");
  return reasons;
}

function categoryRequiresReview(row: MatchingAnalysisRow): boolean {
  const multi = categoryAnalysis(row);
  return multi ? multi.requiresReview || multi.matchedCategorySlugs.length !== 1 : false;
}

function sourceKey(fileHash: string, sheetName: string, rowNumber: number): string {
  const sheetHash = createHash("sha256").update(sheetName, "utf8").digest("hex").slice(0, 16);
  return `sheet:${sheetHash}:row:${rowNumber}:file:${fileHash.slice(0, 16)}`;
}

function candidateKey(rowNumber: number): string {
  return `row-${rowNumber}`;
}

function reviewReasons(row: MatchingAnalysisRow): string[] {
  return [...new Set([
    ...row.errors,
    ...row.warnings,
    ...row.organizationMatch.reasons,
    ...categoryReviewReasons(row),
    ...row.placeMatch.reasons,
    ...row.inFileDuplicates.flatMap((duplicate) => duplicate.reasons),
  ])];
}

function candidateStatus(row: MatchingAnalysisRow): ImportCandidateStatus {
  return row.status === "READY" && !categoryRequiresReview(row) ? ImportCandidateStatus.IMPORT_READY : ImportCandidateStatus.REQUIRES_REVIEW;
}

function sourceData(input: PersistImportAnalysisInput, row: PersistImportAnalysisInput["rows"][number]) {
  return {
    rowNumber: row.rowNumber,
    rawValues: row.source.rawValues,
    mappedValues: row.source.values,
    mappingErrors: row.errors,
    mappingWarnings: row.warnings,
    analysis: {
      status: row.status,
      organization: row.organizationMatch,
      category: legacyCategoryMatch(row),
      place: row.placeMatch,
      inFileDuplicates: row.inFileDuplicates,
    },
    file: { name: input.originalFileName, hash: input.fileHash },
    sheet: { name: input.sheetName, headerRowNumber: input.headerRowNumber },
  };
}

function batchMetadata(input: PersistImportAnalysisInput) {
  return jsonValue({
    kind: "SPREADSHEET",
    originalFileName: input.originalFileName,
    fileHash: input.fileHash,
    sheetName: input.sheetName,
    headerRowNumber: input.headerRowNumber,
    mapping: input.mapping,
    analysisCounters: countRows(input.rows),
  });
}

function candidateData(row: PersistImportAnalysisInput["rows"][number]) {
  const multi = categoryAnalysis(row);
  const category = legacyCategoryMatch(row);
  const organization = row.organizationMatch;
  const place = row.placeMatch;
  return jsonValue({
    mappedValues: row.source.values,
    analysis: {
      status: row.status,
      errors: row.errors,
      warnings: row.warnings,
      organization: row.organizationMatch,
      categoryStatus: category.status,
      categorySlug: category.categorySlug,
      organizationStatus: organization.status,
      organizationId: organization.organizationId,
      placeClassification: place.classification,
      placeCandidateIds: place.candidates.map((candidate) => candidate.placeId),
      inFileDuplicate: row.inFileDuplicates.length > 0,
      category,
      ...(multi ? { categories: multi } : {}),
      place: row.placeMatch,
      inFileDuplicates: row.inFileDuplicates,
    },
  });
}

function candidateQueueStatus(row: PersistImportAnalysisInput["rows"][number]) {
  return isSpreadsheetPlaceReviewCandidate({
    batchMetadata: { kind: "SPREADSHEET" },
    status: candidateStatus(row),
    proposedData: candidateData(row),
  }) ? "PENDING" as const : undefined;
}

function candidateName(row: PersistImportAnalysisInput["rows"][number]): string | null {
  return text(row.source.values.name);
}

function createSourceData(input: PersistImportAnalysisInput, row: PersistImportAnalysisInput["rows"][number]): Omit<Prisma.ImportSourceEntryUncheckedCreateInput, "importBatchId"> {
  const values = row.source.values;
  return {
    sourceKey: sourceKey(input.fileHash, input.sheetName, row.rowNumber),
    section: input.sheetName,
    sourcePages: [],
    rawName: candidateName(row) ?? `Wiersz ${row.rowNumber}`,
    rawAddress: text(values.addressLine),
    rawPhone: text(values.phone),
    rawEmail: text(values.email),
    rawWebsite: text(values.website),
    rawOpeningHours: text(values.openingHours),
    rawAdmissionHours: text(values.admissionHours),
    rawAssistanceDescription: text(values.description),
    rawText: row.source.rawValues.join("\t"),
    parsedData: jsonValue(sourceData(input, row)),
  };
}

function countRows(rows: PersistImportAnalysisInput["rows"]): ImportAnalysisCounters {
  return rows.reduce<ImportAnalysisCounters>((counters, row) => {
    if (row.status === "READY") counters.ready += 1;
    if (row.status === "REVIEW") counters.review += 1;
    if (row.status === "ERROR") counters.error += 1;
    if (row.placeMatch.classification === "EXACT_MATCH") counters.matched += 1;
    return counters;
  }, { ready: 0, matched: 0, review: 0, error: 0, skipped: 0 });
}

export async function persistImportAnalysis(db: ImportAnalysisDatabase, input: PersistImportAnalysisInput): Promise<PersistImportAnalysisResult> {
  if (!/^[a-f0-9]{64}$/iu.test(input.fileHash)) throw new ImportAnalysisPersistenceError("INVALID_FILE_HASH");
  const counters = countRows(input.rows);
  const batchKey = `spreadsheet-${input.fileHash}`;
  let initial: { status: "CREATED"; batchId: string } | Exclude<PersistImportAnalysisResult, { status: "CREATED" }>;
  try {
    initial = await db.$transaction(async (transaction) => {
      const duplicate = await transaction.importBatch.findFirst({ where: { key: batchKey }, select: { id: true, status: true } });
      if (duplicate) return existingImportResult(duplicate);
    const batch = await transaction.importBatch.create({
      data: {
        key: batchKey,
        title: input.title,
        sourceUrl: input.sourceUrl,
        publisher: input.publisher,
        edition: input.edition,
        sourceDocumentHash: input.fileHash,
        importDate: input.importDate,
        status: ImportBatchStatus.PROCESSING,
        rawEntryCount: input.rows.length,
        candidateCount: input.rows.filter((row) => candidateName(row) !== null).length,
        matchedCount: counters.matched,
        reviewCount: counters.review,
        skippedCount: counters.skipped,
        metadata: batchMetadata(input),
      },
      select: { id: true },
    });
    return { status: "CREATED" as const, batchId: batch.id };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw new ImportAnalysisPersistenceError("PERSISTENCE_ERROR", error instanceof Error ? error.message : "Persistence failed.");
    const duplicate = await db.$transaction((transaction) => transaction.importBatch.findFirst({ where: { key: batchKey }, select: { id: true, status: true } }));
    if (!duplicate) throw new ImportAnalysisPersistenceError("PERSISTENCE_ERROR", "Import batch could not be created.");
    initial = existingImportResult(duplicate);
  }
  if (initial.status === "DUPLICATE_IMPORT") return initial;
  if (initial.status === "EXISTING_INCOMPLETE_IMPORT" || initial.status === "EXISTING_FAILED_IMPORT") return initial;

  const sourceIds = new Map<number, string>();
  try {
    for (let start = 0; start < input.rows.length; start += CHUNK_SIZE) {
      const chunk = input.rows.slice(start, start + CHUNK_SIZE);
      await db.$transaction(async (transaction) => {
        for (const row of chunk) {
          const source = await transaction.importSourceEntry.create({
            data: { ...createSourceData(input, row), importBatchId: initial.batchId },
            select: { id: true },
          });
          sourceIds.set(row.rowNumber, source.id);
        }
      });
    }
    for (let start = 0; start < input.rows.length; start += CHUNK_SIZE) {
      const chunk = input.rows.slice(start, start + CHUNK_SIZE).filter((row) => candidateName(row) !== null);
      await db.$transaction(async (transaction) => {
        for (const row of chunk) {
          const values = row.source.values;
          const sourceId = sourceIds.get(row.rowNumber);
          if (!sourceId) throw new Error("Missing source entry.");
          const candidate = await transaction.importCandidate.create({
            data: {
              importBatchId: initial.batchId,
              candidateKey: candidateKey(row.rowNumber),
              status: candidateStatus(row),
              proposedName: candidateName(row) ?? `Wiersz ${row.rowNumber}`,
              proposedAddress: text(values.addressLine),
              proposedPhone: text(values.phone),
              proposedEmail: text(values.email),
              proposedWebsite: text(values.website),
              proposedOrganizationName: text(values.organizationName),
              categorySlugs: categoryAnalysis(row)?.matchedCategorySlugs ?? (row.categoryMatch.categorySlug ? [row.categoryMatch.categorySlug] : []),
              primaryCategorySlug: categoryAnalysis(row)?.matchedCategorySlugs.length === 1 && !categoryRequiresReview(row) ? categoryAnalysis(row)?.matchedCategorySlugs[0] ?? null : categoryAnalysis(row) ? null : row.categoryMatch.categorySlug,
              reviewReasons: reviewReasons(row),
              proposedData: candidateData(row),
              matchedPlaceId: row.placeMatch.classification === "EXACT_MATCH" && row.placeMatch.candidates.length === 1 ? row.placeMatch.candidates[0]?.placeId : null,
              queueStatus: candidateQueueStatus(row),
            },
            select: { id: true },
          });
          await transaction.importCandidateSource.create({ data: { importCandidateId: candidate.id, sourceEntryId: sourceId } });
        }
      });
    }
    await db.$transaction(async (transaction) => {
      await transaction.importBatch.update({
        where: { id: initial.batchId },
        data: {
          status: ImportBatchStatus.STAGED,
          rawEntryCount: input.rows.length,
          candidateCount: input.rows.filter((row) => candidateName(row) !== null).length,
          matchedCount: counters.matched,
          reviewCount: counters.review,
          skippedCount: counters.skipped,
        },
      });
    });
  } catch (error) {
    const persistenceError = error instanceof ImportAnalysisPersistenceError ? error : new ImportAnalysisPersistenceError("PERSISTENCE_ERROR", error instanceof Error ? error.message : "Persistence failed.");
    try {
      await db.$transaction(async (transaction) => {
        await transaction.importBatch.update({ where: { id: initial.batchId }, data: { status: ImportBatchStatus.FAILED } });
      });
    } catch (markError) {
      throw new ImportAnalysisPersistenceError("PERSISTENCE_ERROR", `${persistenceError.message} Failed to mark import batch as FAILED: ${markError instanceof Error ? markError.message : "unknown error"}`);
    }
    throw persistenceError;
  }
  return { status: "CREATED", batchId: initial.batchId, sourceEntryCount: input.rows.length, candidateCount: sourceIds.size === 0 ? 0 : input.rows.filter((row) => candidateName(row) !== null).length, counters };
}
