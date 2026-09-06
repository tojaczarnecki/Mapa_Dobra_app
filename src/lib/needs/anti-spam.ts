export const TURNSTILE_ERROR_MESSAGE = "Nie udało się potwierdzić formularza. Spróbuj ponownie.";
export const MIN_RESPONSE_FORM_TIME_MS = 1_200;

export function isResponseFormTooFast(startedAt: unknown, now = Date.now()) {
  const timestamp = typeof startedAt === "number" ? startedAt : typeof startedAt === "string" ? Number(startedAt) : NaN;
  return !Number.isFinite(timestamp) || now - timestamp < MIN_RESPONSE_FORM_TIME_MS;
}

export function normalizeContact(value: string) {
  return value.includes("@") ? value.trim().toLocaleLowerCase("pl-PL") : value.replace(/\D/gu, "");
}

export function hasDuplicateVolunteerResponse(activeResponses: readonly { phone: string | null; email: string | null }[], contact: { phone: string | null; email: string | null }) {
  const phone = contact.phone ? normalizeContact(contact.phone) : null;
  const email = contact.email ? normalizeContact(contact.email) : null;
  return activeResponses.some((response) => (phone && response.phone && normalizeContact(response.phone) === phone) || (email && response.email && normalizeContact(response.email) === email));
}

export function isTurnstileVerificationSuccessful(value: unknown) {
  return Boolean(value && typeof value === "object" && (value as { success?: unknown }).success === true);
}

export async function verifyTurnstileToken(token: unknown, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (typeof token !== "string" || !token || !secret) return false;
  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteIp) params.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params, cache: "no-store" });
    if (!response.ok) return false;
    return isTurnstileVerificationSuccessful(await response.json());
  } catch {
    return false;
  }
}
