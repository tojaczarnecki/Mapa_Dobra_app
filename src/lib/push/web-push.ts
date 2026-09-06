import "server-only";
import webpush from "web-push";
import { isValidPushPayload, safeNotificationUrl } from "@/lib/push/validation";

export type AdminPushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;

export function getWebPushPublicKey() {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
}

function configureWebPush() {
  if (configured) return true;
  const publicKey = getWebPushPublicKey();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isWebPushConfigured() {
  return Boolean(getWebPushPublicKey() && process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() && process.env.WEB_PUSH_VAPID_SUBJECT?.trim());
}

export async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string; expirationTime?: Date | null }, payload: AdminPushPayload) {
  if (!isValidPushPayload(payload) || !configureWebPush()) return { sent: false, permanentFailure: false };
  try {
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth }, expirationTime: subscription.expirationTime?.getTime() ?? null }, JSON.stringify({ ...payload, url: safeNotificationUrl(payload.url) ?? "/admin" }));
    return { sent: true, permanentFailure: false };
  } catch (error) {
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 0;
    return { sent: false, permanentFailure: statusCode === 404 || statusCode === 410 };
  }
}
