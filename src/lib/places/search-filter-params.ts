const FILTER_PARAM_KEYS = ["kategoria", "otwarte", "dzisiaj", "bezplatne", "bez_skierowania", "bez_dokumentow", "sort"] as const;

export function resetSearchFilterParams(baseParams: Record<string, string>) {
  const params = new URLSearchParams(baseParams);
  FILTER_PARAM_KEYS.forEach((key) => params.delete(key));
  return params;
}
