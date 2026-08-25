import Image from "next/image";
import { completeAccountToken } from "@/app/admin/account-token-actions";
import { AccountTokenForm } from "@/components/admin/account-token-form";
import { hashAccessToken, isUsableAccessToken } from "@/lib/admin/access-tokens";
import { prisma } from "@/lib/prisma";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = /^[A-Za-z0-9_-]{40,100}$/u.test(token) ? await prisma.adminAccessToken.findUnique({ where: { tokenHash: hashAccessToken(token) }, include: { adminUser: { select: { email: true } } } }) : null;
  const valid = record?.purpose === "PASSWORD_RESET" && isUsableAccessToken(record);
  const action = completeAccountToken.bind(null, token, "PASSWORD_RESET");
  return <main className="flex min-h-screen items-start justify-center bg-white px-5 py-10 sm:py-16"><section className="w-full max-w-[460px] rounded-2xl border border-border bg-white p-5 sm:p-8"><Image src="/brand/mapa-dobra-logo.svg" alt="Mapa Dobra" width={190} height={45} className="h-9 w-auto" priority /><p className="mb-1 mt-8 text-xs font-semibold uppercase tracking-wide text-brand-strong">Panel administratora</p><h1 className="text-[1.75rem] font-semibold leading-tight text-foreground sm:text-[2rem]">Ustaw nowe hasło</h1>{valid ? <><p className="mt-2 text-base leading-6 text-muted-foreground">Konto: <strong className="text-foreground">{record.adminUser.email}</strong></p><div className="mt-6"><AccountTokenForm action={action} label="Ustaw nowe hasło" /></div></> : <p className="mt-5 rounded-lg bg-surface-muted p-4 text-sm font-semibold">Link resetu hasła jest nieprawidłowy lub wygasł.</p>}</section></main>;
}
