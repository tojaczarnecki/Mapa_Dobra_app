export type RuntimeEnvironment = Record<string, string | undefined>;

export type RuntimeConfigResult = { valid: boolean; errors: string[] };

function isPlaceholder(value: string | undefined) {
  return !value || /example\.org|CHANGE_ME|USER:PASSWORD|CONTACT_EMAIL/i.test(value);
}

export function validateRuntimeEnv(
  environment: RuntimeEnvironment = process.env,
  nodeEnv = environment.NODE_ENV ?? "development",
): RuntimeConfigResult {
  if (nodeEnv !== "production") return { valid: true, errors: [] };
  const errors: string[] = [];
  const databaseUrl = environment.DATABASE_URL;
  const baseUrl = environment.APP_BASE_URL;

  if (isPlaceholder(databaseUrl)) errors.push("DATABASE_URL");
  else {
    try { if (new URL(databaseUrl!).protocol !== "postgresql:") errors.push("DATABASE_URL"); }
    catch { errors.push("DATABASE_URL"); }
  }
  if (isPlaceholder(baseUrl)) errors.push("APP_BASE_URL");
  else {
    try { if (new URL(baseUrl!).protocol !== "https:") errors.push("APP_BASE_URL (HTTPS required)"); }
    catch { errors.push("APP_BASE_URL"); }
  }
  if (environment.PUBLIC_DATA_MODE !== "production") errors.push("PUBLIC_DATA_MODE");
  if (isPlaceholder(environment.GEOCODER_USER_AGENT) || isPlaceholder(environment.GEOCODER_CONTACT_EMAIL)) {
    errors.push("GEOCODER_USER_AGENT/GEOCODER_CONTACT_EMAIL");
  }
  if (environment.RATE_LIMIT_MODE !== "shared" || isPlaceholder(environment.RATE_LIMIT_SHARED_STORAGE)) {
    errors.push("RATE_LIMIT_MODE/RATE_LIMIT_SHARED_STORAGE");
  }
  return { valid: errors.length === 0, errors };
}

export function assertProductionRuntimeEnv(environment: RuntimeEnvironment = process.env) {
  const result = validateRuntimeEnv(environment, "production");
  if (!result.valid) throw new Error(`Production configuration is incomplete: ${result.errors.join(", ")}`);
}
