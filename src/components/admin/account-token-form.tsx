"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AccountTokenActionState } from "@/app/admin/account-token-actions";
import { PasswordInput } from "@/components/admin/password-input";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60">{pending ? "Zapisywanie..." : label}</button>;
}

export function AccountTokenForm({
  action,
  label,
}: {
  action: (state: AccountTokenActionState, formData: FormData) => Promise<AccountTokenActionState>;
  label: string;
}) {
  const [state, formAction] = useActionState(action, {});
  if (state.success) return <div className="space-y-4"><p role="status" className="rounded-lg border border-brand/30 bg-brand-soft p-4 text-sm font-semibold">{state.success}</p><Link href="/admin/login" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold">Przejdź do logowania</Link></div>;
  return <form action={formAction} className="space-y-4">
    <label className="block text-sm font-bold">Nowe hasło<span className="mt-2 block"><PasswordInput name="password" autoComplete="new-password" minLength={12} maxLength={200} /></span></label>
    <label className="block text-sm font-bold">Powtórz hasło<span className="mt-2 block"><PasswordInput name="passwordConfirmation" autoComplete="new-password" minLength={12} maxLength={200} /></span></label>
    <p className="text-xs leading-5 text-muted-foreground">Hasło musi mieć od 12 do 200 znaków. Użyj kilku słów lub długiej frazy. Link jest jednorazowy i ograniczony czasowo.</p>
    {state.error ? <p role="alert" className="rounded-md bg-urgent-soft p-3 text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
    <SubmitButton label={label} />
  </form>;
}
