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
  const deploymentEnv = environment.DEPLOYMENT_ENV;
  const isStaging = deploymentEnv === "staging";

  if (deploymentEnv && deploymentEnv !== "production" && deploymentEnv !== "staging") {
    errors.push("DEPLOYMENT_ENV");
  }

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
  const rateLimitMode = environment.RATE_LIMIT_MODE;
  const hasUpstashConfig =
    !isPlaceholder(environment.UPSTASH_REDIS_REST_URL) &&
    !isPlaceholder(environment.UPSTASH_REDIS_REST_TOKEN);

  if (isStaging && rateLimitMode === "memory") {
    // Explicit staging is the only production-mode exception for in-memory limiting.
  } else if (rateLimitMode !== "upstash" || !hasUpstashConfig) {
    errors.push("RATE_LIMIT_MODE/UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN");
  }
  const turnstileMode = environment.TURNSTILE_MODE ?? "disabled";
  if (!["disabled", "required"].includes(turnstileMode)) errors.push("TURNSTILE_MODE");
  if (turnstileMode === "required" && (isPlaceholder(environment.TURNSTILE_SITE_KEY) || isPlaceholder(environment.TURNSTILE_SECRET_KEY))) errors.push("TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY");
  if (turnstileMode === "required" && (environment.NEXT_PUBLIC_TURNSTILE_MODE !== "required" || isPlaceholder(environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY))) errors.push("NEXT_PUBLIC_TURNSTILE_MODE/NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  return { valid: errors.length === 0, errors };
}

export function assertProductionRuntimeEnv(environment: RuntimeEnvironment = process.env) {
  const result = validateRuntimeEnv(environment, "production");
  if (!result.valid) throw new Error(`Production configuration is incomplete: ${result.errors.join(", ")}`);
}
