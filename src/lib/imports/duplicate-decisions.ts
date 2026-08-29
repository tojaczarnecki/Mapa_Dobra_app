export type DuplicateDecision = "KEEP_A" | "KEEP_B" | "DIFFERENT_RECORDS";

export type DuplicateEdge = {
  rowNumber: number;
};

export type DuplicateDecisionInput = "KEEP_CURRENT" | "KEEP_OTHER" | "DIFFERENT_RECORDS";

export type StoredDuplicateDecision = {
  candidateAId: string;
  candidateBId: string;
  decision: DuplicateDecision;
};

export type DuplicateDecisionState = {
  edges: Array<{ candidateAId: string; candidateBId: string; rowNumber: number; decision: DuplicateDecision | null }>;
  unresolvedEdges: Array<{ candidateAId: string; candidateBId: string; rowNumber: number }>;
  isUnresolved: boolean;
  allEdgesResolvedAsDifferent: boolean;
  isKept: boolean;
  isLoser: boolean;
  hasConflictingKeepOutcome: boolean;
};

export type DuplicateDisposition = "NONE" | "UNRESOLVED" | "LOSER" | "KEPT" | "RESOLVED_DIFFERENT";

export type DuplicateReconciliationCandidate = {
  status: string;
  resolution: string | null;
  createdPlaceId: string | null;
  proposedData: unknown;
  reviewReasons?: readonly string[];
};

export type DuplicateReconciliationResult = {
  status: "IMPORT_READY" | "REQUIRES_REVIEW";
  queueStatus: "PENDING" | null;
  reviewReasons?: string[];
} | null;

const organizationReviewReasons = new Set([
  "NEW_ORGANIZATION_CANDIDATE",
  "INACTIVE_ORGANIZATION",
  "CONFLICTING_IDENTIFIERS",
  "MULTIPLE_NAME_MATCHES",
  "MATCHED_BY_IDENTIFIER",
  "MATCHED_BY_NIP",
  "MATCHED_BY_REGON",
  "MATCHED_BY_KRS",
  "MATCHED_BY_NAME",
]);

export function duplicateRowNumbers(proposedData: unknown): number[] {
  if (!proposedData || typeof proposedData !== "object" || Array.isArray(proposedData)) return [];
  const analysis = (proposedData as Record<string, unknown>).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return [];
  const duplicates = (analysis as Record<string, unknown>).inFileDuplicates;
  if (!Array.isArray(duplicates)) return [];
  return duplicates.flatMap((duplicate) => {
    if (!duplicate || typeof duplicate !== "object" || Array.isArray(duplicate)) return [];
    const rowNumber = (duplicate as Record<string, unknown>).rowNumber;
    return typeof rowNumber === "number" && Number.isInteger(rowNumber) && rowNumber > 0 ? [rowNumber] : [];
  });
}

export function isOriginalDuplicateEdge(
  candidateA: { rowNumber: number; proposedData: unknown },
  candidateB: { rowNumber: number; proposedData: unknown },
): boolean {
  return duplicateRowNumbers(candidateA.proposedData).includes(candidateB.rowNumber)
    || duplicateRowNumbers(candidateB.proposedData).includes(candidateA.rowNumber);
}

export function mapDuplicateDecision(
  currentCandidateId: string,
  otherCandidateId: string,
  decision: DuplicateDecisionInput,
): DuplicateDecision {
  if (decision === "DIFFERENT_RECORDS") return "DIFFERENT_RECORDS";
  const pair = canonicalizeDuplicatePair(currentCandidateId, otherCandidateId);
  const keptCandidateId = decision === "KEEP_CURRENT" ? currentCandidateId : otherCandidateId;
  return keptCandidateId === pair.candidateAId ? "KEEP_A" : "KEEP_B";
}

export function canonicalizeDuplicatePair(candidateAId: string, candidateBId: string): { candidateAId: string; candidateBId: string } {
  if (candidateAId === candidateBId) throw new Error("DUPLICATE_PAIR_REQUIRES_TWO_CANDIDATES");
  return candidateAId < candidateBId
    ? { candidateAId, candidateBId }
    : { candidateAId: candidateBId, candidateBId: candidateAId };
}

export function getDuplicateDecisionState(
  candidateId: string,
  inFileDuplicates: readonly DuplicateEdge[],
  rowNumberToCandidateId: ReadonlyMap<number, string>,
  decisions: readonly StoredDuplicateDecision[],
): DuplicateDecisionState {
  const edges = inFileDuplicates.flatMap((duplicate) => {
    const otherCandidateId = rowNumberToCandidateId.get(duplicate.rowNumber);
    if (!otherCandidateId || otherCandidateId === candidateId) return [];
    const pair = canonicalizeDuplicatePair(candidateId, otherCandidateId);
    const stored = decisions.find((decision) => decision.candidateAId === pair.candidateAId && decision.candidateBId === pair.candidateBId);
    return [{ ...pair, rowNumber: duplicate.rowNumber, decision: stored?.decision ?? null }];
  });
  const unresolvedEdges = edges.filter((edge): edge is { candidateAId: string; candidateBId: string; rowNumber: number; decision: null } => edge.decision === null);
  const resolvedEdges = edges.filter((edge) => edge.decision !== null);
  const isKept = resolvedEdges.some((edge) => (edge.decision === "KEEP_A" && edge.candidateAId === candidateId) || (edge.decision === "KEEP_B" && edge.candidateBId === candidateId));
  const isLoser = resolvedEdges.some((edge) => (edge.decision === "KEEP_A" && edge.candidateBId === candidateId) || (edge.decision === "KEEP_B" && edge.candidateAId === candidateId));
  return {
    edges,
    unresolvedEdges: unresolvedEdges.map(({ candidateAId, candidateBId, rowNumber }) => ({ candidateAId, candidateBId, rowNumber })),
    isUnresolved: unresolvedEdges.length > 0,
    allEdgesResolvedAsDifferent: edges.length > 0 && edges.every((edge) => edge.decision === "DIFFERENT_RECORDS"),
    isKept,
    isLoser,
    hasConflictingKeepOutcome: isKept && isLoser,
  };
}

export function getDuplicateDisposition(state: DuplicateDecisionState): DuplicateDisposition {
  if (state.edges.length === 0) return "NONE";
  if (state.isUnresolved || state.hasConflictingKeepOutcome) return "UNRESOLVED";
  if (state.isLoser) return "LOSER";
  if (state.allEdgesResolvedAsDifferent) return "RESOLVED_DIFFERENT";
  if (state.isKept) return "KEPT";
  return "UNRESOLVED";
}

function analysisRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function analysisText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function reconcileCandidateAfterDuplicateDecision(
  candidate: DuplicateReconciliationCandidate,
  disposition: DuplicateDisposition,
  organizationResolved = false,
  categoryResolved = false,
): DuplicateReconciliationResult {
  if (candidate.resolution || candidate.createdPlaceId || candidate.status === "SKIPPED" || candidate.status === "IMPORTED" || candidate.status === "MATCH_EXISTING") return null;
  const reviewReasons = [...(candidate.reviewReasons ?? [])]
    .filter((reason) => reason !== "SOURCE_ROW_DUPLICATE")
    .filter((reason) => !(categoryResolved && reason === "UNRESOLVED_CATEGORY"))
    .filter((reason) => !(organizationResolved && organizationReviewReasons.has(reason)));
  const result = (status: "IMPORT_READY" | "REQUIRES_REVIEW", queueStatus: "PENDING" | null, reasons: string[]): DuplicateReconciliationResult => ({
    status,
    queueStatus,
    ...(candidate.reviewReasons === undefined ? {} : { reviewReasons: reasons }),
  });
  if (disposition === "UNRESOLVED") return result("REQUIRES_REVIEW", null, ["SOURCE_ROW_DUPLICATE", ...reviewReasons]);
  if (disposition === "LOSER") return result("REQUIRES_REVIEW", null, reviewReasons);

  const root = analysisRecord(candidate.proposedData);
  const analysis = analysisRecord(root?.analysis);
  const category = analysisRecord(analysis?.category);
  const organization = analysisRecord(analysis?.organization);
  const place = analysisRecord(analysis?.place);
  const categoryStatus = analysisText(category?.status);
  const organizationStatus = analysisText(organization?.status);
  const placeClassification = analysisText(place?.classification);
  const errors = Array.isArray(analysis?.errors) ? analysis.errors : [];

  if (placeClassification && placeClassification !== "NEW") return result("REQUIRES_REVIEW", "PENDING", reviewReasons);
  const effectiveErrors = errors.filter((error) => !(categoryResolved && error === "UNRESOLVED_CATEGORY"));
  if (effectiveErrors.length > 0 || (!categoryResolved && categoryStatus !== "MATCHED") || (!organizationResolved && ["POSSIBLE", "CONFLICT", "NEW_CANDIDATE"].includes(organizationStatus ?? ""))) {
    return result("REQUIRES_REVIEW", null, reviewReasons);
  }
  return result("IMPORT_READY", null, reviewReasons);
}
