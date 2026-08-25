const MIN_REALISTIC_FORM_TIME_MS = 750;

export function hasImpossibleFormTiming(value: unknown, now = Date.now()) {
  if (value === undefined || value === null || value === "") return false;
  const startedAt = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(startedAt)) return true;
  const elapsed = now - startedAt;
  return elapsed < MIN_REALISTIC_FORM_TIME_MS || elapsed > 7 * 24 * 60 * 60 * 1000;
}
