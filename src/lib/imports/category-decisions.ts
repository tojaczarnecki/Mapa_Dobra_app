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

export type CategoryDecisionCategory = { id: string; active: boolean };

export type EffectiveCategoryResult =
  | { status: "AUTO_SINGLE"; primaryCategoryId: string; categoryIds: string[] }
  | { status: "ADMIN_DECISION"; primaryCategoryId: string; categoryIds: string[] }
  | { status: "REQUIRES_REVIEW"; reason: "ANALYSIS_REVIEW_REQUIRED" | "INVALID_ADMIN_DECISION" | "INACTIVE_CATEGORY" };

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function resolveEffectiveCategory(
  analysis: CategoryAnalysisState,
  decision: PersistedCategoryDecision | null = null,
  categories: CategoryDecisionCategory[] = [],
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

  if (!analysis.requiresReview && analysis.unresolvedTokens.length === 0 && analysis.warnings.length === 0 && unique(analysis.categoryIds).length === 1) {
    return { status: "AUTO_SINGLE", primaryCategoryId: analysis.categoryIds[0]!, categoryIds: [analysis.categoryIds[0]!] };
  }
  return { status: "REQUIRES_REVIEW", reason: "ANALYSIS_REVIEW_REQUIRED" };
}
