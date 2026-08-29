import { parseCategoryReanalysis } from "./category-decisions.ts";

export type BulkCategoryGroupCategory = { id: string; name: string };
export type BulkCategoryGroupCandidate = { id: string; name: string; address: string | null };
export type BulkCategoryGroup = {
  categoryIds: string[];
  categories: BulkCategoryGroupCategory[];
  candidates: BulkCategoryGroupCandidate[];
};

export type BulkCategoryCandidate = {
  id: string;
  name: string;
  address: string | null;
  status: string;
  primaryCategorySlug: string | null;
  categoryDecision: unknown | null;
  reviewReasons: readonly string[];
  reanalysisCategory: unknown;
};

export function deriveBulkCategoryGroups(
  candidates: readonly BulkCategoryCandidate[],
  activeCategories: readonly BulkCategoryGroupCategory[],
): BulkCategoryGroup[] {
  const groups = new Map<string, BulkCategoryGroup>();
  for (const candidate of candidates) {
    if (candidate.status !== "REQUIRES_REVIEW" || candidate.categoryDecision || candidate.primaryCategorySlug !== null || !candidate.reviewReasons.includes("PRIMARY_CATEGORY_DECISION_REQUIRED")) continue;
    const result = parseCategoryReanalysis(candidate.reanalysisCategory);
    if (!result || result.categoryIds.length < 2) continue;
    const persistedCategoryIds = [...new Set(result.categoryIds)];
    const categoryIds = activeCategories.filter((category) => persistedCategoryIds.includes(category.id)).map((category) => category.id);
    if (categoryIds.length !== persistedCategoryIds.length) continue;
    const categories = categoryIds.flatMap((categoryId) => {
      const category = activeCategories.find((item) => item.id === categoryId);
      return category ? [category] : [];
    });
    if (categories.length !== categoryIds.length) continue;
    const key = categoryIds.join("|");
    const group = groups.get(key) ?? { categoryIds, categories, candidates: [] };
    group.candidates.push({ id: candidate.id, name: candidate.name, address: candidate.address });
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.candidates.length >= 2);
}
