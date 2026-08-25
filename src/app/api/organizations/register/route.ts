import { createAccessToken, accessTokenExpiry, hashAccessToken } from "@/lib/admin/access-tokens";
import { hashPassword } from "@/lib/admin/password";
import { compareOrganizationNames } from "@/lib/admin/directory-validation";
import { consumeSubmissionRateLimit, getRequestAddress } from "@/lib/submissions/rate-limit";
import { organizationRegistrationInput } from "@/lib/organizations/registration";
import { sendOrganizationVerificationMail } from "@/lib/organizations/registration-mail";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

async function readJson(request: Request) {
  try { return await request.json() as unknown; } catch { return null; }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object") return Response.json({ ok: false, error: "Sprawdź dane formularza." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const challenge = await verifyTurnstileToken(input.turnstileToken, request);
  if (!challenge.ok) return Response.json({ ok: false, error: "Nie udało się potwierdzić formularza." }, { status: 403 });
  const rate = await consumeSubmissionRateLimit(`organization-registration:${getRequestAddress(request)}`, Date.now(), "newPlace");
  if (!rate.allowed) return Response.json({ ok: false, error: "Spróbuj ponownie później." }, { status: 429 });
  if (input.websiteTrap) return Response.json({ ok: true });
  const data = organizationRegistrationInput(input);
  if (!data) return Response.json({ ok: false, error: "Uzupełnij wymagane dane. Hasło musi mieć co najmniej 12 znaków." }, { status: 400 });

  try {
    const token = createAccessToken();
    const passwordHash = await hashPassword(data.password);
    const result = await prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.adminUser.findUnique({ where: { email: data.applicantEmail }, select: { id: true } });
      if (existingUser) throw new Error("DUPLICATE");
      const organizations = await transaction.organization.findMany({ select: { id: true, name: true }, where: { active: true } });
      const possible = organizations.find((organization) => compareOrganizationNames(data.organizationName, organization.name) !== "different");
      const user = await transaction.adminUser.create({ data: { email: data.applicantEmail, displayName: data.applicantName, passwordHash, role: "PLACE_MANAGER", active: false } });
      const registration = await transaction.organizationRegistration.create({ data: { adminUserId: user.id, organizationName: data.organizationName, nip: data.nip, website: data.website, organizationPhone: data.organizationPhone, organizationEmail: data.organizationEmail, applicantName: data.applicantName, applicantEmail: data.applicantEmail, applicantPhone: data.applicantPhone, applicantPosition: data.applicantPosition, possibleOrganizationId: possible?.id } });
      await transaction.adminAccessToken.create({ data: { adminUserId: user.id, purpose: "ORGANIZATION_EMAIL_VERIFICATION", tokenHash: hashAccessToken(token), expiresAt: accessTokenExpiry("ORGANIZATION_EMAIL_VERIFICATION") } });
      await transaction.auditLog.create({ data: { adminUserId: user.id, action: "ORGANIZATION_REGISTRATION_CREATED", entityType: "ORGANIZATION_REGISTRATION", entityId: registration.id, changedFields: ["organizationName", "applicantEmail", "status"], newValues: { organizationName: data.organizationName, applicantEmail: data.applicantEmail, status: "EMAIL_PENDING", possibleOrganizationId: possible?.id ?? null }, changeOrigin: "USER_SUBMISSION" } });
      return { registration, token };
    });
    const mailSent = await sendOrganizationVerificationMail({ email: data.applicantEmail, token: result.token });
    return Response.json({ ok: true, mailSent, message: mailSent ? "Zgłoszenie przyjęte. Sprawdź e-mail, aby potwierdzić adres." : "Zgłoszenie zapisane. Wysyłka wiadomości z potwierdzeniem e-maila nie jest obecnie skonfigurowana." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE") return Response.json({ ok: true, message: "Jeśli podany adres może zostać użyty, wyślemy dalsze instrukcje." }, { status: 202 });
    return Response.json({ ok: false, error: "Nie udało się przyjąć zgłoszenia." }, { status: 500 });
  }
}
