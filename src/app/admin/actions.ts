"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  hashSessionToken,
  requireAdmin,
} from "@/lib/admin/session";

export async function logoutAdmin() {
  const session = await requireAdmin();
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.adminSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  await prisma.pushSubscription.updateMany({
    where: { adminUserId: session.user.id },
    data: { adminUserId: null },
  });

  await clearAdminSessionCookie();
  redirect("/admin/login");
}
