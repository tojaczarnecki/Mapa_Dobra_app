export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z\d+.-]*:/iu.test(trimmed) && !/^https?:\/\//iu.test(trimmed)) return null;
  const candidate = /^https?:\/\//iu.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? candidate : null;
  } catch {
    return null;
  }
}
