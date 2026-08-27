const LOCAL_E2E_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function shouldUseSecureAdminCookie(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return false;

  if (env.E2E_ALLOW_INSECURE_ADMIN_COOKIE !== "1") return true;

  try {
    const appUrl = new URL(env.APP_BASE_URL ?? "");
    return !LOCAL_E2E_HOSTS.has(appUrl.hostname);
  } catch {
    return true;
  }
}
