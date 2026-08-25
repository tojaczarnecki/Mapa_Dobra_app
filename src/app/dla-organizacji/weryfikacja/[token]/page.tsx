import Link from "next/link";
import { redirect } from "next/navigation";
import { hashAccessToken, isUsableAccessToken } from "@/lib/admin/access-tokens";
import { prisma } from "@/lib/prisma";

export default async function OrganizationVerificationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await prisma.adminAccessToken.findUnique({ where: { tokenHash: hashAccessToken(token) }, include: { adminUser: { include: { organizationRegistration: true } } } });
  if (!record || record.purpose !== "ORGANIZATION_EMAIL_VERIFICATION" || !isUsableAccessToken(record) || !record.adminUser.organizationRegistration) {
    return <main className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-bold">Link jest nieaktualny</h1><p className="mt-3 text-muted-foreground">Poproś o ponowne wysłanie wiadomości weryfikacyjnej.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 font-bold" href="/dla-organizacji/rejestracja">Wróć do rejestracji</Link></main>;
  }
  await prisma.$transaction(async (transaction) => {
    await transaction.adminAccessToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    await transaction.adminUser.update({ where: { id: record.adminUserId }, data: { active: true } });
    await transaction.organizationRegistration.update({ where: { id: record.adminUser.organizationRegistration!.id }, data: { status: "PENDING_REVIEW", verifiedAt: new Date() } });
  });
  redirect("/dla-organizacji/status");
}
