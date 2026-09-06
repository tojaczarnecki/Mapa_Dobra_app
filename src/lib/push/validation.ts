export type AdminPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime?: number | null;
  userAgent?: string | null;
};

const ENDPOINT_MAX_LENGTH = 2048;

export function parseAdminPushSubscriptionInput(value: unknown): AdminPushSubscriptionInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const endpoint = typeof input.endpoint === "string" ? input.endpoint.trim() : "";
  const p256dh = typeof input.p256dh === "string" ? input.p256dh.trim() : "";
  const auth = typeof input.auth === "string" ? input.auth.trim() : "";
  if (!endpoint || endpoint.length > ENDPOINT_MAX_LENGTH || !/^https:\/\//i.test(endpoint)) return null;
  try {
    const parsed = new URL(endpoint);
    if (!parsed.hostname) return null;
  } catch {
    return null;
  }
  if (p256dh.length < 16 || p256dh.length > 256 || auth.length < 8 || auth.length > 128) return null;
  const expirationTime = input.expirationTime == null ? null : Number(input.expirationTime);
  if (expirationTime !== null && (!Number.isFinite(expirationTime) || expirationTime < 0)) return null;
  const userAgent = input.userAgent == null ? null : String(input.userAgent).trim().slice(0, 512);
  return { endpoint, p256dh, auth, expirationTime, userAgent };
}

export function canClaimPushEndpoint(existingAdminUserId: string | null, currentAdminUserId: string) {
  return existingAdminUserId === null || existingAdminUserId === currentAdminUserId;
}

export function safeNotificationUrl(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.length > 2048) return null;
  try {
    const parsed = new URL(value, "https://dobra-mapa.invalid");
    return parsed.origin === "https://dobra-mapa.invalid" ? value : null;
  } catch {
    return null;
  }
}

export function isValidPushPayload(value: unknown): value is { title: string; body: string; url?: string; tag?: string } {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.title === "string" && payload.title.trim().length > 0 && payload.title.length <= 120
    && typeof payload.body === "string" && payload.body.length <= 500
    && (payload.url === undefined || safeNotificationUrl(payload.url) !== null)
    && (payload.tag === undefined || (typeof payload.tag === "string" && payload.tag.length <= 80));
}
