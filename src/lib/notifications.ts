import type { NotificationCategory } from "@/generated/prisma/enums";

export const notificationCategories = [
  "LOCAL_ALERT",
  "SAVED_PLACES",
  "GUIDES",
  "VOLUNTEERING",
  "PARTNER",
] as const satisfies readonly NotificationCategory[];

export type NotificationPreferencesInput = {
  localAlerts: boolean;
  savedPlaces: boolean;
  guides: boolean;
  volunteering: boolean;
  partnerContent: boolean;
  quietHoursFrom?: string | null;
  quietHoursTo?: string | null;
};

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  locale?: string;
  region?: string;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

export function parsePushSubscription(value: unknown): PushSubscriptionInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const keys = input.keys;
  if (!isText(input.endpoint, 2048) || !input.endpoint.startsWith("https://")) return null;
  if (!keys || typeof keys !== "object") return null;
  const parsedKeys = keys as Record<string, unknown>;
  if (!isText(parsedKeys.p256dh, 255) || !isText(parsedKeys.auth, 255)) return null;

  return {
    endpoint: input.endpoint,
    keys: { p256dh: parsedKeys.p256dh, auth: parsedKeys.auth },
    ...(isText(input.userAgent, 500) ? { userAgent: input.userAgent } : {}),
    ...(isText(input.locale, 20) ? { locale: input.locale } : {}),
    ...(isText(input.region, 120) ? { region: input.region } : {}),
  };
}

export function parseNotificationPreferences(value: unknown): NotificationPreferencesInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const booleanKeys = ["localAlerts", "savedPlaces", "guides", "volunteering", "partnerContent"] as const;
  if (booleanKeys.some((key) => typeof input[key] !== "boolean")) return null;
  for (const key of ["quietHoursFrom", "quietHoursTo"] as const) {
    if (input[key] !== undefined && input[key] !== null && (!isText(input[key], 5) || !timePattern.test(input[key]))) return null;
  }
  return {
    localAlerts: input.localAlerts as boolean,
    savedPlaces: input.savedPlaces as boolean,
    guides: input.guides as boolean,
    volunteering: input.volunteering as boolean,
    partnerContent: input.partnerContent as boolean,
    quietHoursFrom: (input.quietHoursFrom as string | null | undefined) ?? null,
    quietHoursTo: (input.quietHoursTo as string | null | undefined) ?? null,
  };
}

export function categoryPreferenceKey(category: NotificationCategory) {
  return {
    LOCAL_ALERT: "localAlerts",
    SAVED_PLACES: "savedPlaces",
    GUIDES: "guides",
    VOLUNTEERING: "volunteering",
    PARTNER: "partnerContent",
  }[category] as keyof Omit<NotificationPreferencesInput, "quietHoursFrom" | "quietHoursTo">;
}

const allowedPublicPaths = ["/mapa", "/szukaj", "/encyklopedia", "/znajdz-nocleg", "/uruchom-pomoc", "/lodz/", "/admin"];

export function sanitizeNotificationUrl(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  const path = value.split("?", 1)[0];
  return allowedPublicPaths.some((prefix) => path === prefix || path.startsWith(prefix)) ? value : "/";
}

export type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  category: NotificationCategory;
  placeId?: string;
  articleId?: string;
};

export function sanitizeNotificationPayload(value: NotificationPayload): NotificationPayload {
  return {
    title: value.title.slice(0, 120),
    body: value.body.slice(0, 300),
    url: sanitizeNotificationUrl(value.url),
    category: value.category,
    ...(value.placeId ? { placeId: value.placeId.slice(0, 100) } : {}),
    ...(value.articleId ? { articleId: value.articleId.slice(0, 100) } : {}),
  };
}
