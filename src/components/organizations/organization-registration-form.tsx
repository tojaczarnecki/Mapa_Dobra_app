"use client";

import { useState } from "react";
import { useTurnstileToken } from "@/components/security/turnstile-token";

export function OrganizationRegistrationForm() {
  const turnstile = useTurnstileToken();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setResult(null);
    const form = new FormData(event.currentTarget);
    let turnstileToken = "";
    try { turnstileToken = await turnstile.requestToken(); } catch { setResult({ ok: false, error: "Nie udało się potwierdzić formularza. Spróbuj ponownie." }); setPending(false); return; }
    form.set("turnstileToken", turnstileToken);
    const response = await fetch("/api/organizations/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const body = await response.json() as { ok: boolean; message?: string; error?: string };
    setResult(body); setPending(false); if (body.ok) event.currentTarget.reset();
  }
  if (result?.ok) return <section className="mt-8 rounded-lg border border-brand/30 bg-brand-soft/30 p-5" role="status"><h2 className="text-lg font-semibold">Zgłoszenie przyjęte</h2><p className="mt-2 text-sm leading-6">{result.message}</p></section>;
  return <form onSubmit={submit} className="mt-8 space-y-7"><fieldset className="space-y-4"><legend className="text-xl font-bold">Dane organizacji</legend><Field name="organizationName" label="Nazwa organizacji" autoComplete="organization" required /><Field name="organizationEmail" label="E-mail organizacji" type="email" autoComplete="email" required /><Field name="nip" label="NIP" autoComplete="off" /><Field name="website" label="Strona WWW" type="url" autoComplete="url" /><Field name="organizationPhone" label="Telefon organizacji" autoComplete="tel" /></fieldset><fieldset className="space-y-4 border-t border-border pt-7"><legend className="text-xl font-bold">Twoje dane</legend><p className="-mt-1 text-sm text-muted-foreground">Te dane wykorzystamy do weryfikacji, czy reprezentujesz organizację.</p><Field name="applicantName" label="Imię i nazwisko" autoComplete="name" required /><Field name="email" label="Twój e-mail służbowy" type="email" autoComplete="email" required /><Field name="applicantPhone" label="Telefon" autoComplete="tel" /><Field name="jobTitle" label="Stanowisko w organizacji" autoComplete="off" /><Field name="password" label="Hasło" type="password" autoComplete="new-password" required minLength={12} /></fieldset><div aria-hidden="true" className="hidden"><input tabIndex={-1} name="websiteTrap" autoComplete="off" /></div>{result?.error ? <p role="alert" className="text-sm font-semibold text-[#8c2d0c]">{result.error}</p> : null}<button disabled={pending} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 py-2 font-bold disabled:opacity-60">{pending ? "Wysyłanie..." : "Wyślij zgłoszenie"}</button></form>;
}

function Field({ name, label, type = "text", autoComplete, required = false, minLength }: { name: string; label: string; type?: string; autoComplete: string; required?: boolean; minLength?: number }) {
  return <label className="block text-sm font-semibold">{label}{required ? " *" : ""}<input id={name} name={name} type={type} autoComplete={autoComplete} required={required} minLength={minLength} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>;
}
