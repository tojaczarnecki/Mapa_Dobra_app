"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { TurnstileWidget } from "./turnstile-widget";

export function VolunteerResponseForm({ needId }: { needId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const openForm = () => { setExpanded(true); setFormStartedAt(Date.now()); setTurnstileToken(""); };
  const cancelForm = () => { setExpanded(false); setMessage(""); };
  const resetTurnstile = useCallback(() => setTurnstileToken(""), []);

  useEffect(() => {
    if (expanded) firstInputRef.current?.focus();
  }, [expanded]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending"); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/potrzeby/${needId}/responses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), phone: form.get("phone"), email: form.get("email"), note: form.get("note"), honeypot: form.get("website"), turnstileToken, formStartedAt }) });
      const body = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message ?? "Nie udało się wysłać zgłoszenia.");
      setState("success"); setExpanded(false);
    } catch (error) { setState("error"); setTurnstileReset((value) => value + 1); setMessage(error instanceof Error ? error.message : "Nie udało się wysłać zgłoszenia."); }
  }

  if (state === "success") return <section className="border-t border-border pt-6" aria-live="polite"><h2 className="text-2xl font-extrabold">Dzięki. Twoje zgłoszenie zostało zapisane.</h2><p className="mt-3 leading-7 text-muted-foreground">To jeszcze nie jest potwierdzenie udziału. Organizator może skontaktować się z Tobą w sprawie szczegółów.</p><Link href="/potrzeby" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={17} />Zobacz inne potrzeby</Link></section>;
  if (!expanded) return <div className="border-t border-border pt-6">{state === "error" ? <p className="mb-4 text-sm font-semibold text-red-800" role="alert">{message}</p> : null}<button type="button" onClick={openForm} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-5 py-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Mogę pomóc <ArrowRight aria-hidden="true" size={17} /></button></div>;
  return <form onSubmit={submit} className="border-t border-border pt-6" aria-labelledby="response-title">
    <h2 id="response-title" className="text-2xl font-extrabold">Zostaw kontakt</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Podaj imię oraz co najmniej jeden sposób kontaktu: telefon albo e-mail. Zgłoszenie nie oznacza jeszcze potwierdzenia udziału.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-bold">Imię<input ref={firstInputRef} required name="firstName" maxLength={120} className="min-h-11 rounded-lg border border-border bg-white px-3 font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
      <label className="grid gap-1.5 text-sm font-bold">Telefon <span className="font-normal text-muted-foreground">(telefon lub e-mail)</span><input name="phone" maxLength={50} type="tel" className="min-h-11 rounded-lg border border-border bg-white px-3 font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
      <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">E-mail <span className="font-normal text-muted-foreground">(e-mail lub telefon)</span><input name="email" maxLength={320} type="email" className="min-h-11 rounded-lg border border-border bg-white px-3 font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
      <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Krótka wiadomość <span className="font-normal text-muted-foreground">(opcjonalnie)</span><textarea name="note" maxLength={500} rows={3} className="rounded-lg border border-border bg-white px-3 py-2 font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
      <label className="absolute -left-[9999px]" aria-hidden="true">Strona internetowa<input name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>
    <div className="mt-5"><TurnstileWidget onToken={setTurnstileToken} onReset={resetTurnstile} resetSignal={turnstileReset} /></div>
    {state === "error" ? <p className="mt-4 text-sm font-semibold text-red-800" role="alert">{message}</p> : null}
    <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={cancelForm} disabled={state === "sending"} className="inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-surface-muted">Anuluj</button><button type="submit" disabled={state === "sending" || !turnstileToken} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-extrabold text-foreground hover:bg-brand-strong hover:text-white disabled:opacity-60">{state === "sending" ? <Loader2 className="animate-spin" size={17} /> : <ArrowRight size={17} />}Wyślij zgłoszenie</button></div>
  </form>;
}
