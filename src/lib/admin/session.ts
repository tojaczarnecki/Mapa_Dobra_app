import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminPermission } from "@/generated/prisma/enums";
import { hasPlaceScopedPermission, resolveEffectivePermissions } from "@/lib/admin/permissions";
import { shouldUseSecureAdminCookie } from "@/lib/admin/session-cookie";
import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE = "mapa_dobra_admin_session";
export const ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + ADMIN_SESSION_DURATION_MS);
}

export async function setAdminSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureAdminCookie(),
    // The public submission endpoint must be able to verify an authenticated
    // organization representative's organizationId without exposing session data.
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      adminUser: {
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          active: true,
          permissionOverrides: {
            select: { permission: true, effect: true },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || !session.adminUser.active) {
    return null;
  }

  // Keep existing administrator sessions usable while a new optional
  // organization-registration migration is being rolled out.
  let organizationRegistration: { status: string } | null = null;
  try {
    organizationRegistration = await prisma.organizationRegistration.findUnique({
      where: { adminUserId: session.adminUser.id },
      select: { status: true },
    });
  } catch {
    organizationRegistration = null;
  }

  let organizationMemberships: Array<{ organizationId: string; status: string }> = [];
  try {
    organizationMemberships = await prisma.organizationMembership.findMany({
      where: { adminUserId: session.adminUser.id, status: "ACTIVE" },
      select: { organizationId: true, status: true },
    });
  } catch {
    // The membership migration is additive; existing admin login must remain
    // usable while the deployment is being migrated.
    organizationMemberships = [];
  }

  const permissions = resolveEffectivePermissions(
    session.adminUser.role,
    session.adminUser.permissionOverrides,
  );

  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: { ...session.adminUser, organizationRegistration, organizationMemberships, permissions },
  };
}

export async function requirePermission(permission: AdminPermission) {
  const session = await requireAdmin();
  if (!session.user.permissions.includes(permission)) redirect("/admin/brak-dostepu");
  return session;
}

export async function requirePlacePermission(permission: AdminPermission, placeId: string) {
  const session = await requireAdmin();
  if (session.user.permissions.includes(permission)) return session;

  const access = await prisma.userPlaceAccess.findUnique({
    where: { adminUserId_placeId: { adminUserId: session.user.id, placeId } },
    select: { active: true, permissions: true },
  });
  if (!hasPlaceScopedPermission(session.user.permissions, access, permission)) redirect("/admin/brak-dostepu");
  return session;
}

export async function requireAdmin() {
  const session = await getCurrentAdmin();
  if (!session) redirect("/admin/login");
  if (session.user.organizationRegistration && session.user.organizationRegistration.status !== "APPROVED") redirect("/admin/oczekuje");
  return session;
}
