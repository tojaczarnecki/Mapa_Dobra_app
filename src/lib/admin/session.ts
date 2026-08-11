import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
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
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || !session.adminUser.active) {
    return null;
  }

  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: session.adminUser,
  };
}

export async function requireAdmin() {
  const session = await getCurrentAdmin();
  if (!session) redirect("/admin/login");
  return session;
}
