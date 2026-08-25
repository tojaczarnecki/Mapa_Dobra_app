import { timingSafeEqual } from "node:crypto";
import { resolveAvailabilityFreshness } from "@/lib/accommodations/freshness";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/notifications-server";

function authorized(request: Request) {
  const expected = process.env.OPERATOR_REMINDER_CRON_SECRET;
  const received = request.headers.get("x-cron-secret");
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

function dayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { adminUserId: { not: null }, adminUser: { active: true } },
    include: {
      preferences: true,
      adminUser: {
        include: {
          placeAccesses: {
            where: { active: true },
            include: { place: { include: { accommodation: true } } },
          },
        },
      },
    },
  });
  const keyDate = dayKey();
  let sent = 0;
  let skipped = 0;

  for (const subscription of subscriptions) {
    if (subscription.preferences?.localAlerts === false) { skipped += 1; continue; }
    for (const access of subscription.adminUser?.placeAccesses ?? []) {
      const accommodation = access.place.accommodation;
      if (!accommodation) continue;
      if (resolveAvailabilityFreshness(accommodation.availabilityState, accommodation.availabilityConfirmedAt) !== "STALE") continue;
      const dedupeKey = `operator-availability:${access.placeId}:${keyDate}`;
      const delivery = await prisma.notificationDelivery.findUnique({ where: { subscriptionId_dedupeKey: { subscriptionId: subscription.id, dedupeKey } }, select: { status: true } });
      if (delivery?.status === "SENT") { skipped += 1; continue; }
      if (delivery) await prisma.notificationDelivery.update({ where: { subscriptionId_dedupeKey: { subscriptionId: subscription.id, dedupeKey } }, data: { status: "FAILED", sentAt: null } });
      else await prisma.notificationDelivery.create({ data: { subscriptionId: subscription.id, category: "LOCAL_ALERT", dedupeKey, status: "FAILED" } });
      try {
        await sendPushNotification(subscription, {
          title: "Potwierdź dostępność miejsca",
          body: `${access.place.name} wymaga ponownego potwierdzenia danych operacyjnych.`,
          url: "/admin",
          category: "LOCAL_ALERT",
          placeId: access.placeId,
        });
        await prisma.notificationDelivery.update({ where: { subscriptionId_dedupeKey: { subscriptionId: subscription.id, dedupeKey } }, data: { status: "SENT", sentAt: new Date() } });
        sent += 1;
      } catch {
        skipped += 1;
      }
    }
  }
  return Response.json({ ok: true, sent, skipped }, { headers: { "Cache-Control": "no-store" } });
}
