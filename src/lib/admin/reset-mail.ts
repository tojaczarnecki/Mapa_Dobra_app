import { accessTokenExpiry, createAccessToken } from "@/lib/admin/access-tokens";

export function isAdminResetMailConfigured() {
  return Boolean(process.env.ADMIN_RESET_MAIL_URL && process.env.ADMIN_RESET_MAIL_TOKEN && process.env.APP_BASE_URL);
}

export function createAdminResetLink(token: string) {
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/u, "");
  return baseUrl ? `${baseUrl}/admin/reset-hasla/${token}` : null;
}

export async function sendAdminResetMail({ email, token }: { email: string; token: string }) {
  const endpoint = process.env.ADMIN_RESET_MAIL_URL;
  const secret = process.env.ADMIN_RESET_MAIL_TOKEN;
  const resetLink = createAdminResetLink(token);
  if (!endpoint || !secret || !resetLink) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        template: "admin-password-reset",
        recipient: email,
        resetLink,
        expiresAt: accessTokenExpiry("PASSWORD_RESET").toISOString(),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function newAdminResetToken() {
  return createAccessToken();
}
