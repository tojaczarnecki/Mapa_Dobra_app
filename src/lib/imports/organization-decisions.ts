export type PersistedOrganizationAnalysis = {
  status: "NONE" | "MATCHED" | "POSSIBLE" | "CONFLICT" | "NEW_CANDIDATE";
  organizationId: string | null;
};

export type OrganizationDecision =
  | { decision: "SELECTED_ORGANIZATION"; organizationId: string }
  | { decision: "NO_ORGANIZATION"; organizationId: null };

export type OrganizationDecisionInvariantInput = {
  decision: "SELECTED_ORGANIZATION" | "NO_ORGANIZATION";
  organizationId: string | null;
};

export type OrganizationDecisionOrganization = {
  id: string;
  active: boolean;
};

export function parseOrganizationDecision(value: { decision: string; organizationId: string | null } | null | undefined): OrganizationDecision | null {
  if (!value) return null;
  if (value.decision === "NO_ORGANIZATION" && value.organizationId === null) return { decision: "NO_ORGANIZATION", organizationId: null };
  if (value.decision === "SELECTED_ORGANIZATION" && typeof value.organizationId === "string" && value.organizationId.trim()) {
    return { decision: "SELECTED_ORGANIZATION", organizationId: value.organizationId };
  }
  return null;
}

export type EffectiveOrganizationState =
  | { status: "NO_ORGANIZATION"; organizationId: null }
  | { status: "USE_MATCHED_ORGANIZATION"; organizationId: string }
  | { status: "USE_SELECTED_ORGANIZATION"; organizationId: string }
  | { status: "UNRESOLVED"; organizationId: null }
  | { status: "BLOCKED_INACTIVE_MATCH"; organizationId: string };

export function resolveEffectiveOrganization(
  analysis: PersistedOrganizationAnalysis,
  decision: OrganizationDecision | null = null,
  selectedOrganization: OrganizationDecisionOrganization | null = null,
): EffectiveOrganizationState {
  if (decision?.decision === "NO_ORGANIZATION") {
    return { status: "NO_ORGANIZATION", organizationId: null };
  }

  if (decision?.decision === "SELECTED_ORGANIZATION") {
    if (!selectedOrganization || !selectedOrganization.active || selectedOrganization.id !== decision.organizationId) {
      return { status: "BLOCKED_INACTIVE_MATCH", organizationId: decision.organizationId };
    }
    return { status: "USE_SELECTED_ORGANIZATION", organizationId: decision.organizationId };
  }

  if (analysis.status === "NONE") return { status: "NO_ORGANIZATION", organizationId: null };
  if (analysis.status === "MATCHED" && analysis.organizationId) {
    if (!selectedOrganization || selectedOrganization.id !== analysis.organizationId) {
      return { status: "UNRESOLVED", organizationId: null };
    }
    return selectedOrganization.active
      ? { status: "USE_MATCHED_ORGANIZATION", organizationId: analysis.organizationId }
      : { status: "BLOCKED_INACTIVE_MATCH", organizationId: analysis.organizationId };
  }
  return { status: "UNRESOLVED", organizationId: null };
}

export function isValidOrganizationDecision(decision: OrganizationDecisionInvariantInput): boolean {
  return decision.decision === "SELECTED_ORGANIZATION"
    ? typeof decision.organizationId === "string" && decision.organizationId.trim().length > 0
    : decision.organizationId === null;
}
