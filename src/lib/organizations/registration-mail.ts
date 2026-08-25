import { accessTokenExpiry } from "@/lib/admin/access-tokens";

export function createOrganizationVerificationLink(token: string) {
  const base = process.env.APP_BASE_URL?.replace(/\/$/u, "");
  return base ? `${base}/dla-organizacji/weryfikacja/${token}` : null;
}

export async function sendOrganizationVerificationMail({ email, token }: { email: string; token: string }) {
  const endpoint = process.env.ADMIN_RESET_MAIL_URL;
  const secret = process.env.ADMIN_RESET_MAIL_TOKEN;
  const link = createOrganizationVerificationLink(token);
  if (!endpoint || !secret || !link) return false;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ template: "organization-email-verification", recipient: email, verificationLink: link, expiresAt: accessTokenExpiry("ORGANIZATION_EMAIL_VERIFICATION").toISOString() }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
