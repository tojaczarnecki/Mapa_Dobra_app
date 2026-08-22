export function getSiteBaseUrl(
  environment: Record<string, string | undefined> = process.env,
) {
  const value = environment.APP_BASE_URL || environment.NEXT_PUBLIC_APP_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!/^https?:$/u.test(url.protocol)) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

export function canonicalAlternates(
  path: string,
  environment: Record<string, string | undefined> = process.env,
) {
  return getSiteBaseUrl(environment) ? { canonical: path } : undefined;
}
