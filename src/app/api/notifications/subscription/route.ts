import { prisma } from "@/lib/prisma";
import { parseNotificationPreferences, parsePushSubscription } from "@/lib/notifications";
import { getCurrentAdmin } from "@/lib/admin/session";

async function readJson(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 20_000) return null;
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object") return Response.json({ ok: false }, { status: 400 });
  const input = body as Record<string, unknown>;
  const subscription = parsePushSubscription(input.subscription);
  if (!subscription) return Response.json({ ok: false }, { status: 400 });
  const preferences = input.preferences === undefined
    ? null
    : parseNotificationPreferences(input.preferences);
  if (input.preferences !== undefined && !preferences) return Response.json({ ok: false }, { status: 400 });

  try {
    const admin = await getCurrentAdmin();
    const record = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: subscription.userAgent,
        locale: subscription.locale,
        region: subscription.region,
        adminUserId: admin?.user.id ?? null,
        preferences: { create: preferences ?? {} },
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: subscription.userAgent,
        locale: subscription.locale,
        region: subscription.region,
        lastSeenAt: new Date(),
        ...(admin ? { adminUserId: admin.user.id } : {}),
        ...(preferences ? { preferences: { upsert: { create: preferences, update: preferences } } } : {}),
      },
      include: { preferences: true },
    });
    return Response.json({ ok: true, subscriptionId: record.id, preferences: record.preferences }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const body = await readJson(request);
  const subscription = parsePushSubscription(body && typeof body === "object" ? (body as Record<string, unknown>).subscription : null);
  if (!subscription) return Response.json({ ok: false }, { status: 400 });
  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
