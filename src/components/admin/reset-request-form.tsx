"use client";

import Link from "next/link";
import { startTransition, useActionState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset } from "@/app/admin/reset-hasla/actions";
import { useTurnstileToken } from "@/components/security/turnstile-token";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-12 w-full rounded-lg bg-brand px-5 py-3 text-base font-semibold text-[#10231e] transition hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60">{pending ? "Wysyłanie…" : "Wyślij instrukcję"}</button>;
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordReset, { message: "" });
  const turnstile = useTurnstileToken();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      formData.set("turnstileToken", await turnstile.requestToken());
      startTransition(() => action(formData));
    } catch {
      startTransition(() => action(new FormData()));
    }
  }
  return state.message ? (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="rounded-lg border border-brand/30 bg-brand-soft p-4 text-sm font-semibold leading-6">{state.message}</p>
      <Link href="/admin/login" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-muted">Przejdź do logowania</Link>
    </div>
  ) : (
    <form action={action} onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold">E-mail</label>
        <input id="reset-email" name="email" type="email" autoComplete="email" required maxLength={320} className="min-h-12 w-full rounded-lg border border-border bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25" />
      </div>
      <SubmitButton />
      <Link href="/admin/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Wróć do logowania</Link>
    </form>
  );
}
