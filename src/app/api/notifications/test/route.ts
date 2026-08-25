import { requireAdmin } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/notifications-server";

export async function POST(request: Request) {
  await requireAdmin();
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const subscriptionId = body && typeof body === "object" && typeof (body as Record<string, unknown>).subscriptionId === "string"
    ? (body as Record<string, string>).subscriptionId
    : null;
  if (!subscriptionId) return Response.json({ ok: false }, { status: 400 });
  const subscription = await prisma.pushSubscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) return Response.json({ ok: false }, { status: 404 });
  try {
    const result = await sendPushNotification(subscription, {
      title: "Mapa Dobra",
      body: "To jest testowe powiadomienie na tym urządzeniu.",
      url: "/ustawienia/powiadomienia",
      category: "LOCAL_ALERT",
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
