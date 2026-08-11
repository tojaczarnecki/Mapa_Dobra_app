"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, isAcceptableAdminPassword, verifyPassword } from "@/lib/admin/password";
import { consumeLoginAttempt, resetLoginAttempts } from "@/lib/admin/rate-limit";
import {
  createSessionToken,
  getSessionExpiry,
  hashSessionToken,
  setAdminSessionCookie,
} from "@/lib/admin/session";

export type LoginActionState = {
  error?: string;
};

const INVALID_CREDENTIALS = "Nieprawidłowy e-mail lub hasło.";

function normalizeEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim().toLocaleLowerCase("pl-PL").slice(0, 320);
}

function getLoginAddress(headerStore: Awaited<ReturnType<typeof headers>>) {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "local"
  );
}

export async function loginAdmin(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = normalizeEmail(formData.get("email"));
  const passwordEntry = formData.get("password");
  const password = typeof passwordEntry === "string" ? passwordEntry : "";
  const headerStore = await headers();
  const rateLimitKey = getLoginAddress(headerStore);
  const rateLimit = consumeLoginAttempt(rateLimitKey);

  if (!rateLimit.allowed) {
    return {
      error: "Zbyt wiele prób logowania. Spróbuj ponownie za kilkanaście minut.",
    };
  }

  if (!email || !isAcceptableAdminPassword(password)) {
    return { error: INVALID_CREDENTIALS };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const passwordMatches = admin?.active
    ? await verifyPassword(password, admin.passwordHash)
    : Boolean(await hashPassword(password)) && false;

  if (!admin?.active || !passwordMatches) {
    return { error: INVALID_CREDENTIALS };
  }

  const token = createSessionToken();
  const expiresAt = getSessionExpiry();

  await prisma.$transaction(async (transaction) => {
    await transaction.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    await transaction.adminSession.create({
      data: {
        adminUserId: admin.id,
        tokenHash: hashSessionToken(token),
        expiresAt,
      },
    });
    await transaction.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: "LOGIN",
        entityType: "ADMIN_USER",
        entityId: admin.id,
        note: "Prawidłowe logowanie administratora",
      },
    });
  });

  resetLoginAttempts(rateLimitKey);
  await setAdminSessionCookie(token, expiresAt);
  redirect("/admin");
}
