import { prisma } from "@/lib/prisma";
import { parseNotificationPreferences, parsePushSubscription } from "@/lib/notifications";

export async function PUT(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ ok: false }, { status: 400 });
  const input = body as Record<string, unknown>;
  const subscription = parsePushSubscription(input.subscription);
  const preferences = parseNotificationPreferences(input.preferences);
  if (!subscription || !preferences) return Response.json({ ok: false }, { status: 400 });
  try {
    const record = await prisma.pushSubscription.findUnique({ where: { endpoint: subscription.endpoint } });
    if (!record) return Response.json({ ok: false }, { status: 404 });
    const updated = await prisma.notificationPreference.upsert({
      where: { subscriptionId: record.id },
      create: { subscriptionId: record.id, ...preferences },
      update: preferences,
    });
    return Response.json({ ok: true, preferences: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
