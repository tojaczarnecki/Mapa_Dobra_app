import "server-only";
import { getCurrentAdmin } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { sendWebPush, type AdminPushPayload } from "@/lib/push/web-push";
import { canClaimPushEndpoint, parseAdminPushSubscriptionInput } from "@/lib/push/validation";

export async function subscribeAdminDevice(value: unknown) {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false as const, status: 401, error: "UNAUTHORIZED" };
  const input = parseAdminPushSubscriptionInput(value);
  if (!input) return { ok: false as const, status: 400, error: "INVALID_SUBSCRIPTION" };
  const existing = await prisma.adminPushSubscription.findUnique({ where: { endpoint: input.endpoint }, select: { adminUserId: true } });
  if (!canClaimPushEndpoint(existing?.adminUserId ?? null, admin.user.id)) return { ok: false as const, status: 409, error: "ENDPOINT_IN_USE" };
  const expirationTime = input.expirationTime ? new Date(input.expirationTime) : null;
  await prisma.adminPushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { ...input, expirationTime, adminUserId: admin.user.id, active: true },
    update: { ...input, expirationTime, active: true },
  });
  return { ok: true as const };
}

export async function unsubscribeAdminDevice(endpoint: unknown) {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false as const, status: 401, error: "UNAUTHORIZED" };
  if (typeof endpoint !== "string" || !endpoint.trim()) return { ok: false as const, status: 400, error: "INVALID_ENDPOINT" };
  await prisma.adminPushSubscription.updateMany({ where: { endpoint: endpoint.trim(), adminUserId: admin.user.id }, data: { active: false } });
  return { ok: true as const };
}

export async function sendPushToAdminUser(adminUserId: string, payload: AdminPushPayload) {
  const subscriptions = await prisma.adminPushSubscription.findMany({ where: { adminUserId, active: true } });
  const results = await Promise.all(subscriptions.map(async (subscription) => {
    const result = await sendWebPush(subscription, payload);
    if (result.permanentFailure) await prisma.adminPushSubscription.update({ where: { id: subscription.id }, data: { active: false } });
    else if (result.sent) await prisma.adminPushSubscription.update({ where: { id: subscription.id }, data: { lastUsedAt: new Date() } });
    return result;
  }));
  return { sent: results.filter((result) => result.sent).length, attempted: results.length };
}
