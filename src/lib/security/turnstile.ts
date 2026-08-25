type TurnstileResult = { ok: true } | { ok: false; reason: "missing" | "failed" | "unavailable" };

export function turnstileRequired(environment: Record<string, string | undefined> = process.env) {
  return environment.TURNSTILE_MODE === "required";
}

export async function verifyTurnstileToken(token: unknown, request: Request, environment: Record<string, string | undefined> = process.env): Promise<TurnstileResult> {
  if (!turnstileRequired(environment)) return { ok: true };
  if (typeof token !== "string" || !token || !environment.TURNSTILE_SECRET_KEY) return { ok: false, reason: "missing" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const body = new URLSearchParams({ secret: environment.TURNSTILE_SECRET_KEY, response: token });
    const address = request.headers.get("x-real-ip")?.trim();
    if (address) body.set("remoteip", address);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: controller.signal, cache: "no-store" });
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const result = await response.json() as { success?: boolean };
    return result.success ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
