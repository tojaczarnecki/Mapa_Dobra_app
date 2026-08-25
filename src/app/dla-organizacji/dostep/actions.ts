"use server";

import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export async function requestPlaceAccess(formData: FormData) {
  const session = await getCurrentAdmin();
  if (!session) redirect("/admin/login");
  const challenge = await verifyTurnstileToken(formData.get("turnstileToken"), new Request("https://internal.mapadobra.local", { headers: await headers() }));
  if (!challenge.ok) return;
  const placeId = formData.get("placeId");
  const message = typeof formData.get("message") === "string" ? String(formData.get("message")).trim().slice(0, 1000) : "";
  if (typeof placeId !== "string") return;
  const registration = await prisma.organizationRegistration.findUnique({ where: { adminUserId: session.user.id }, select: { status: true, organizationId: true } });
  if (!registration || registration.status !== "APPROVED" || !registration.organizationId) return;
  const membership = await prisma.organizationMembership.findUnique({ where: { organizationId_adminUserId: { organizationId: registration.organizationId, adminUserId: session.user.id } }, select: { status: true } });
  if (!membership || membership.status !== "ACTIVE") return;
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { organizationId: true } });
  if (!place || (place.organizationId && place.organizationId !== registration.organizationId)) return;
  try {
    const request = await prisma.placeAccessRequest.create({ data: { requestingUserId: session.user.id, organizationId: registration.organizationId, placeId, message, status: "PENDING" } });
    await prisma.auditLog.create({ data: { adminUserId: session.user.id, action: "PLACE_ACCESS_REQUESTED", entityType: "PLACE_ACCESS_REQUEST", entityId: request.id, changedFields: ["placeId", "message", "status"], newValues: { placeId, status: "PENDING" }, changeOrigin: "USER_SUBMISSION" } });
  } catch { /* Duplicate pending request is intentionally idempotent. */ }
  redirect("/dla-organizacji/status");
}
