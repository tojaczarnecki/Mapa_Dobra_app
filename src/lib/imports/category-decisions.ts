export type CategoryAnalysisState = {
  categoryIds: string[];
  requiresReview: boolean;
  unresolvedTokens: string[];
  warnings: string[];
};

export type PersistedCategoryDecision = {
  primaryCategoryId: string;
  categories: Array<{ categoryId: string; sortOrder: number }>;
};

export type CategoryReanalysis = {
  version: 1;
  sourceValue: string;
  analyzedAt: string;
  analyzedByAdminUserId: string;
  result: {
    sourceValue: string;
    tokens: unknown[];
    matchedCategoryIds: string[];
    matchedCategorySlugs: string[];
    unresolvedTokens: string[];
    warnings: string[];
    status: "FULLY_MATCHED" | "PARTIALLY_MATCHED" | "UNRESOLVED";
    requiresReview: boolean;
  };
};

export type CategoryDecisionCategory = { id: string; active: boolean };

export type EffectiveCategoryResult =
  | { status: "AUTO_SINGLE"; primaryCategoryId: string; categoryIds: string[] }
  | { status: "ADMIN_DECISION"; primaryCategoryId: string; categoryIds: string[] }
  | { status: "REQUIRES_REVIEW"; reason: "ANALYSIS_REVIEW_REQUIRED" | "PRIMARY_CATEGORY_DECISION_REQUIRED" | "INVALID_ADMIN_DECISION" | "INACTIVE_CATEGORY" };

export function parseCategoryReanalysis(value: unknown): CategoryAnalysisState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const result = item.result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const data = result as Record<string, unknown>;
  const categoryIds = Array.isArray(data.matchedCategoryIds) ? data.matchedCategoryIds.filter((id): id is string => typeof id === "string") : [];
  const unresolvedTokens = Array.isArray(data.unresolvedTokens) ? data.unresolvedTokens.filter((token): token is string => typeof token === "string") : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings.filter((warning): warning is string => typeof warning === "string") : [];
  if (item.version !== 1 || typeof item.sourceValue !== "string" || data.status !== "FULLY_MATCHED" || categoryIds.length === 0 || unresolvedTokens.length > 0 || warnings.length > 0 || data.requiresReview !== false) return null;
  return { categoryIds, requiresReview: false, unresolvedTokens: [], warnings: [] };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function resolveEffectiveCategory(
  analysis: CategoryAnalysisState,
  decision: PersistedCategoryDecision | null = null,
  categories: CategoryDecisionCategory[] = [],
  reanalysis: CategoryAnalysisState | null = null,
): EffectiveCategoryResult {
  if (decision) {
    const selectedIds = decision.categories.map((item) => item.categoryId);
    const uniqueSelectedIds = unique(selectedIds);
    if (uniqueSelectedIds.length === 0 || uniqueSelectedIds.length !== selectedIds.length || !uniqueSelectedIds.includes(decision.primaryCategoryId)) {
      return { status: "REQUIRES_REVIEW", reason: "INVALID_ADMIN_DECISION" };
    }
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    if (uniqueSelectedIds.some((id) => !categoryById.get(id))) return { status: "REQUIRES_REVIEW", reason: "INVALID_ADMIN_DECISION" };
    if (uniqueSelectedIds.some((id) => !categoryById.get(id)!.active)) return { status: "REQUIRES_REVIEW", reason: "INACTIVE_CATEGORY" };
    const secondaryIds = [...decision.categories]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.categoryId.localeCompare(right.categoryId))
      .map((item) => item.categoryId)
      .filter((id) => id !== decision.primaryCategoryId);
    return { status: "ADMIN_DECISION", primaryCategoryId: decision.primaryCategoryId, categoryIds: [decision.primaryCategoryId, ...secondaryIds] };
  }

  if (reanalysis && !reanalysis.requiresReview && reanalysis.unresolvedTokens.length === 0 && reanalysis.warnings.length === 0 && unique(reanalysis.categoryIds).length === 1) {
    const primaryCategoryId = reanalysis.categoryIds[0]!;
    const category = categories.find((item) => item.id === primaryCategoryId);
    if (category && !category.active) return { status: "REQUIRES_REVIEW", reason: "INACTIVE_CATEGORY" };
    if (categories.length > 0 && !category) return { status: "REQUIRES_REVIEW", reason: "ANALYSIS_REVIEW_REQUIRED" };
    return { status: "AUTO_SINGLE", primaryCategoryId, categoryIds: [primaryCategoryId] };
  }

  if (reanalysis && !reanalysis.requiresReview && reanalysis.unresolvedTokens.length === 0 && reanalysis.warnings.length === 0 && unique(reanalysis.categoryIds).length > 1) {
    return { status: "REQUIRES_REVIEW", reason: "PRIMARY_CATEGORY_DECISION_REQUIRED" };
  }

  if (!analysis.requiresReview && analysis.unresolvedTokens.length === 0 && analysis.warnings.length === 0 && unique(analysis.categoryIds).length === 1) {
    const primaryCategoryId = analysis.categoryIds[0]!;
    const category = categories.find((item) => item.id === primaryCategoryId);
    if (category && !category.active) return { status: "REQUIRES_REVIEW", reason: "INACTIVE_CATEGORY" };
    if (categories.length > 0 && !category) return { status: "REQUIRES_REVIEW", reason: "INVALID_ADMIN_DECISION" };
    return { status: "AUTO_SINGLE", primaryCategoryId, categoryIds: [primaryCategoryId] };
  }
  return { status: "REQUIRES_REVIEW", reason: "ANALYSIS_REVIEW_REQUIRED" };
}
