import webpush from "web-push";
import type { PushSubscription } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeNotificationPayload, type NotificationPayload } from "@/lib/notifications";

function getVapidConfig() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
}

export async function sendPushNotification(subscription: PushSubscription, payload: NotificationPayload) {
  const config = getVapidConfig();
  if (!config) throw new Error("Web Push is not configured.");
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(sanitizeNotificationPayload(payload)),
      { TTL: 300 },
    );
    return { ok: true as const };
  } catch (error: unknown) {
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 0;
    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
      return { ok: false as const, expired: true as const };
    }
    throw error;
  }
}
