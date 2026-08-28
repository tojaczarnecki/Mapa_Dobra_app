const DEFAULT_MAX_ITEMS = 30;
const DEFAULT_MAX_LENGTH = 240;

export function splitTokenInput(value: string) {
  return value.split(/[\n,]+/u);
}

export function normalizeTokenValues(
  values: string[],
  maxItems = DEFAULT_MAX_ITEMS,
  maxLength = DEFAULT_MAX_LENGTH,
) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLocaleLowerCase("pl-PL");
    if (trimmed && trimmed.length <= maxLength && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
    if (result.length >= maxItems) break;
  }
  return result;
}
