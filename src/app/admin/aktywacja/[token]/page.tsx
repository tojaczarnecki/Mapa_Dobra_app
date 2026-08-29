import Image from "next/image";
import { completeAccountToken } from "@/app/admin/account-token-actions";
import { AccountTokenForm } from "@/components/admin/account-token-form";
import { hashAccessToken, isUsableAccessToken } from "@/lib/admin/access-tokens";
import { prisma } from "@/lib/prisma";

export default async function ActivationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = /^[A-Za-z0-9_-]{40,100}$/u.test(token) ? await prisma.adminAccessToken.findUnique({ where: { tokenHash: hashAccessToken(token) }, include: { adminUser: { select: { email: true } } } }) : null;
  const valid = record?.purpose === "INVITATION" && isUsableAccessToken(record);
  const action = completeAccountToken.bind(null, token, "INVITATION");
  return <main className="grid min-h-screen place-items-center bg-[#f7f5ef] px-5 py-10"><section className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-sm"><Image src="/brand/mapa-dobra-logo-header-new.svg" alt="Mapa Dobra" width={604} height={120} className="h-9 w-auto" priority /><h1 className="mt-6 text-2xl font-bold">Aktywacja konta</h1>{valid ? <><p className="mt-2 text-sm text-muted-foreground">Konto: <strong className="text-foreground">{record.adminUser.email}</strong></p><div className="mt-5"><AccountTokenForm action={action} label="Aktywuj konto" /></div></> : <p className="mt-5 rounded-lg bg-surface-muted p-4 text-sm font-semibold">Zaproszenie wygasło. Skontaktuj się z administratorem Mapy Dobra.</p>}</section></main>;
}
