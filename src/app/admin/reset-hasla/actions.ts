"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { accessTokenExpiry, hashAccessToken } from "@/lib/admin/access-tokens";
import { newAdminResetToken, isAdminResetMailConfigured, sendAdminResetMail } from "@/lib/admin/reset-mail";
import { getTrustedClientAddress } from "@/lib/security/rate-limiter";
import { createApplicationRateLimiter } from "@/lib/security/rate-limiter";
import { createHash } from "node:crypto";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

const limiter = createApplicationRateLimiter(15 * 60 * 1000, 3);
const emailLimiter = createApplicationRateLimiter(15 * 60 * 1000, 2);
const RESET_REQUEST_MESSAGE = "Jeśli konto z tym adresem istnieje, wysłaliśmy instrukcję zmiany hasła.";

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("pl-PL").slice(0, 320) : "";
}

export async function requestPasswordReset(_previousState: { message: string }, formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const address = getTrustedClientAddress(await headers());
  const headerStore = await headers();
  const challenge = await verifyTurnstileToken(formData.get("turnstileToken"), new Request("https://internal.mapadobra.local", { headers: headerStore }));
  const rateLimit = await limiter.consume(`admin-reset:${address}`);
  const emailRateLimit = await emailLimiter.consume(`admin-reset-email:${createHash("sha256").update(email).digest("hex")}`);
  if (challenge.ok && rateLimit.allowed && emailRateLimit.allowed && email && isAdminResetMailConfigured()) {
    const admin = await prisma.adminUser.findUnique({ where: { email }, select: { id: true, email: true, active: true } });
    if (admin?.active) {
      const token = newAdminResetToken();
      const record = await prisma.adminAccessToken.create({ data: { adminUserId: admin.id, purpose: "PASSWORD_RESET", tokenHash: hashAccessToken(token), expiresAt: accessTokenExpiry("PASSWORD_RESET") } });
      const sent = await sendAdminResetMail({ email: admin.email, token });
      if (!sent) await prisma.adminAccessToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    }
  }
  return { message: RESET_REQUEST_MESSAGE };
}
