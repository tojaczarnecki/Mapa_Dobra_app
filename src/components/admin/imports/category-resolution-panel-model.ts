export type CategoryOptionModel = { id: string; name: string; active: boolean };

export function categoryMatchLabel(status: string): string {
  if (status === "FULLY_MATCHED") return "Rozpoznano";
  if (status === "PARTIALLY_MATCHED") return "Rozpoznano częściowo";
  if (status === "UNRESOLVED") return "Nie rozpoznano";
  return "Wymaga sprawdzenia";
}

export function categoryMethodLabel(method: string): string {
  if (method === "SLUG") return "identyfikatorze";
  if (method === "NAME") return "nazwie";
  if (method === "ALIAS") return "aliasie";
  return "dopasowaniu";
}

export function secondaryCategoryOptions<T extends CategoryOptionModel>(categories: readonly T[], primaryCategoryId: string): T[] {
  return categories.filter((category) => category.id !== primaryCategoryId);
}

export function finalSelectedCategoryIds(primaryCategoryId: string, selectedCategoryIds: readonly string[]): string[] {
  return [primaryCategoryId, ...selectedCategoryIds.filter((id) => id !== primaryCategoryId)].filter((id, index, values) => id && values.indexOf(id) === index);
}

export function initialCategoryFormValues(currentDecision: { primaryCategoryId: string; categoryIds: string[] } | null, effectiveState: "AUTO_SINGLE" | "ADMIN_DECISION" | "REQUIRES_REVIEW", effectiveCategoryIds: readonly string[]) {
  if (currentDecision) return { primaryCategoryId: currentDecision.primaryCategoryId, selectedCategoryIds: [...currentDecision.categoryIds] };
  if (effectiveState === "AUTO_SINGLE") return { primaryCategoryId: effectiveCategoryIds[0] ?? "", selectedCategoryIds: [...effectiveCategoryIds] };
  return { primaryCategoryId: "", selectedCategoryIds: [...effectiveCategoryIds] };
}

export function shouldStartEditing(effectiveState: "AUTO_SINGLE" | "ADMIN_DECISION" | "REQUIRES_REVIEW", hasDecision: boolean, canEdit: boolean): boolean {
  return effectiveState === "REQUIRES_REVIEW" && !hasDecision && canEdit;
}
