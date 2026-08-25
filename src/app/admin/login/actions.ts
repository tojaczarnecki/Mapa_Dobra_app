"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, isAcceptableAdminPassword, verifyPassword } from "@/lib/admin/password";
import { consumeLoginAccountAttempt, consumeLoginAttempt, loginAccountKey, resetLoginAccountAttempts, resetLoginAttempts } from "@/lib/admin/rate-limit";
import { getTrustedClientAddress } from "@/lib/security/rate-limiter";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
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

function safeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/dla-organizacji/dostep?place=")) return "/admin";
  return value;
}

export async function loginAdmin(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  try {
    const email = normalizeEmail(formData.get("email"));
    const passwordEntry = formData.get("password");
    const password = typeof passwordEntry === "string" ? passwordEntry : "";
    const headerStore = await headers();
    const rateLimitKey = getTrustedClientAddress(headerStore);
    const rateLimit = await consumeLoginAttempt(rateLimitKey);
    const accountKey = email ? loginAccountKey(email) : "admin-account:empty";
    const accountRateLimit = await consumeLoginAccountAttempt(accountKey);

    if (!rateLimit.allowed || !accountRateLimit.allowed) {
      return {
        error: "Zbyt wiele prób logowania. Spróbuj ponownie za kilkanaście minut.",
      };
    }

    const challenge = await verifyTurnstileToken(formData.get("turnstileToken"), new Request("https://internal.mapadobra.local", { headers: headerStore }));
    if (!challenge.ok) return { error: INVALID_CREDENTIALS };

    if (!email || !isAcceptableAdminPassword(password)) {
      return { error: INVALID_CREDENTIALS };
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });

    const passwordMatches = admin?.active && admin.passwordHash
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
    await resetLoginAttempts(rateLimitKey);
    await resetLoginAccountAttempts(accountKey);
    await setAdminSessionCookie(token, expiresAt);
  } catch (error) {
    throw error;
  }

  const destination = safeNext(formData.get("next"));
  if (destination === "/admin") redirect("/admin");
  redirect(destination);
}
