const LOCAL_E2E_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function shouldUseSecureAdminCookie(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return false;

  if (env.E2E_ALLOW_INSECURE_ADMIN_COOKIE !== "1") return true;

  try {
    const testUrl = new URL(env.TEST_BASE_URL ?? "");
    const isLocalHttpTestOrigin =
      testUrl.protocol === "http:" && LOCAL_E2E_HOSTS.has(testUrl.hostname);
    return !isLocalHttpTestOrigin;
  } catch {
    return true;
  }
}
