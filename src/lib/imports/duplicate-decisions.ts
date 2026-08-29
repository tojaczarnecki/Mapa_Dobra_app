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
