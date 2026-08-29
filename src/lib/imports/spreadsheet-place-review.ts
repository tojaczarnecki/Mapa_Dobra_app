import type { ImportCandidateStatus } from "../../generated/prisma/enums.ts";
import type { DuplicateDisposition } from "./duplicate-decisions.ts";

type JsonRecord = Record<string, unknown>;

export type SpreadsheetPlaceReviewCandidate = {
  batchMetadata?: unknown;
  importBatch?: { metadata: unknown };
  status: ImportCandidateStatus | string;
  proposedData: unknown;
  resolution?: string | null;
};

export function isSpreadsheetBatchMetadata(metadata: unknown): boolean {
  return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && (metadata as JsonRecord).kind === "SPREADSHEET");
}

export function isSpreadsheetPlaceReviewCandidate(candidate: SpreadsheetPlaceReviewCandidate, duplicateDisposition?: DuplicateDisposition): boolean {
  const batchMetadata = candidate.batchMetadata ?? candidate.importBatch?.metadata;
  if (!isSpreadsheetBatchMetadata(batchMetadata) || candidate.resolution) return false;
  if (candidate.status !== "REQUIRES_REVIEW") return false;
  if (!candidate.proposedData || typeof candidate.proposedData !== "object" || Array.isArray(candidate.proposedData)) return false;
  const analysis = (candidate.proposedData as JsonRecord).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return false;
  const place = (analysis as JsonRecord).place;
  if (!place || typeof place !== "object" || Array.isArray(place)) return false;
  const classification = (place as JsonRecord).classification;
  if (classification !== "EXACT_MATCH" && classification !== "POSSIBLE_MATCH") return false;
  const inFileDuplicates = (analysis as JsonRecord).inFileDuplicates;
  if (!Array.isArray(inFileDuplicates) || inFileDuplicates.length === 0) return true;
  return duplicateDisposition === "KEPT" || duplicateDisposition === "RESOLVED_DIFFERENT";
}

export function hasSpreadsheetSourceRowDuplicate(candidate: Pick<SpreadsheetPlaceReviewCandidate, "proposedData">): boolean {
  if (!candidate.proposedData || typeof candidate.proposedData !== "object" || Array.isArray(candidate.proposedData)) return false;
  const analysis = (candidate.proposedData as JsonRecord).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return false;
  const duplicates = (analysis as JsonRecord).inFileDuplicates;
  return Array.isArray(duplicates) && duplicates.length > 0;
}

export function canUndoCandidateResolution(candidate: { resolution?: string | null; createdPlaceId?: string | null }): boolean {
  return !candidate.createdPlaceId && (candidate.resolution === "SAME_PLACE" || candidate.resolution === "SKIPPED");
}

export function restoreMatcherMatchedPlaceId(proposedData: unknown): string | null {
  if (!proposedData || typeof proposedData !== "object" || Array.isArray(proposedData)) return null;
  const analysis = (proposedData as JsonRecord).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return null;
  const place = (analysis as JsonRecord).place;
  if (!place || typeof place !== "object" || Array.isArray(place)) return null;
  if ((place as JsonRecord).classification !== "EXACT_MATCH") return null;
  const candidates = (place as JsonRecord).candidates;
  if (!Array.isArray(candidates) || candidates.length !== 1) return null;
  const candidate = candidates[0];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const placeId = (candidate as JsonRecord).placeId;
  return typeof placeId === "string" && placeId ? placeId : null;
}

export function isAllowedSpreadsheetPlaceId(allowedPlaceIds: readonly string[], selectedPlaceId: string): boolean {
  return allowedPlaceIds.includes(selectedPlaceId);
}
