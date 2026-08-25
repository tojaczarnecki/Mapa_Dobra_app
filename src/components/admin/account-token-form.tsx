"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { AccountTokenActionState } from "@/app/admin/account-token-actions";

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
  const [showPassword, setShowPassword] = useState(false);
  if (state.success) return <div className="space-y-4"><p role="status" className="rounded-lg border border-brand/30 bg-brand-soft p-4 text-sm font-semibold">{state.success}</p><Link href="/admin/login" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold">Przejdź do logowania</Link></div>;
  return <form action={formAction} className="space-y-4">
    <label className="block text-sm font-bold">Nowe hasło<input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={200} required className="mt-2 min-h-12 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" /></label>
    <label className="block text-sm font-bold">Powtórz hasło<input name="passwordConfirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={200} required className="mt-2 min-h-12 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" /></label>
    <button type="button" className="min-h-11 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong" aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Ukryj hasło" : "Pokaż hasło"}</button>
    <p className="text-xs text-muted-foreground">Użyj co najmniej 12 znaków. Link jest jednorazowy.</p>
    {state.error ? <p role="alert" className="rounded-md bg-urgent-soft p-3 text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
    <SubmitButton label={label} />
  </form>;
}
