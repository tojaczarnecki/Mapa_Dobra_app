export function normalizeTokenValues(values: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLocaleLowerCase("pl-PL");
    if (trimmed && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}
