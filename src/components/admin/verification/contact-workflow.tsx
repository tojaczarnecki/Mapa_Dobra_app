"use client";

import { Check, Clipboard, Mail, Phone, UserRoundCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { markVerificationContactRequired, recordVerificationContact, type VerificationActionState } from "@/app/admin/(protected)/weryfikacja/actions";
import { verificationContactMethodLabel, verificationContactMethods, verificationContactReasons } from "@/lib/verification/contact";

type ContactRecord = {
  reasons: string[];
  requiredNote: string | null;
  requiredAt: string;
  requiredBy: string;
  contactedAt: string | null;
  contactMethod: string | null;
  contactResult: string | null;
  contactedBy: string | null;
} | null;

export function ContactWorkflow({ placeId, contact, phone, email, website, organization }: {
  placeId: string;
  contact: ContactRecord;
  phone: string | null;
  email: string | null;
  website: string | null;
  organization: string | null;
}) {
  const requireAction = markVerificationContactRequired.bind(null, placeId);
  const recordAction = recordVerificationContact.bind(null, placeId);
  const [requireState, requireFormAction, requirePending] = useActionState<VerificationActionState, FormData>(requireAction, {});
  const [recordState, recordFormAction, recordPending] = useActionState<VerificationActionState, FormData>(recordAction, {});
  return (
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-[#8b2d0b]">Osobna kolejka robocza</p><h2 className="mt-1 text-xl font-bold">Wymaga kontaktu</h2><p className="mt-1 text-sm text-muted-foreground">Odłóż miejsce, gdy aktualnych danych nie da się potwierdzić online. Ten stan nie publikuje ani nie weryfikuje miejsca.</p></div>
        {contact ? <span className="inline-flex min-h-7 items-center rounded-full border border-[#d7a548] bg-[#fff4d8] px-2.5 py-1 text-xs font-bold text-[#684500]">Wymaga kontaktu</span> : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-border bg-[#faf9f5] p-3 sm:grid-cols-2">
        <ContactValue label="Telefon" value={phone} icon="phone" />
        <ContactValue label="E-mail" value={email} icon="mail" />
        <p className="text-sm"><span className="block text-xs font-bold text-muted-foreground">Organizacja</span><strong>{organization ?? "Brak danych"}</strong></p>
        <p className="min-w-0 text-sm"><span className="block text-xs font-bold text-muted-foreground">WWW</span>{website ? <a href={website} target="_blank" rel="noreferrer" className="break-all font-bold text-brand-strong hover:underline">{website}</a> : <strong>Brak danych</strong>}</p>
      </div>

      <form action={requireFormAction} className="mt-4">
        <fieldset><legend className="text-sm font-bold">Powody wymagające kontaktu</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{verificationContactReasons.map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-brand-soft"><input type="checkbox" name="contactReasons" value={value} defaultChecked={contact?.reasons.includes(value)} className="size-5 accent-brand-strong" />{label}</label>)}</div></fieldset>
        <label className="mt-3 block text-sm font-bold">Notatka wewnętrzna <span className="font-normal text-muted-foreground">(opcjonalnie)</span><textarea name="requiredNote" defaultValue={contact?.requiredNote ?? ""} rows={2} maxLength={1000} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/25" /></label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><ActionMessage state={requireState} /><button type="submit" disabled={requirePending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d7a548] bg-[#fff4d8] px-4 text-sm font-bold text-[#684500] hover:bg-[#ffedbd] disabled:opacity-60"><Phone aria-hidden="true" size={18} />{requirePending ? "Zapisuję…" : contact ? "Zaktualizuj powody" : "Oznacz: wymaga kontaktu"}</button></div>
      </form>

      {contact ? <div className="mt-5 border-t border-border pt-4">
        <h3 className="font-bold">Rezultat kontaktu</h3>
        {contact.contactedAt ? <div className="mt-2 rounded-md border border-brand/30 bg-brand-soft/40 p-3 text-sm"><p className="font-bold"><Check aria-hidden="true" className="mr-1 inline" size={16} />Kontakt wykonany · {verificationContactMethodLabel(contact.contactMethod)}</p><p className="mt-1">{contact.contactResult}</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(contact.contactedAt))} · {contact.contactedBy ?? "Administrator"}</p></div> : null}
        <form action={recordFormAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">Forma kontaktu<select name="contactMethod" required defaultValue={contact.contactMethod ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="" disabled>Wybierz</option>{verificationContactMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm font-bold">Data kontaktu<input type="datetime-local" name="contactedAt" required defaultValue={contact.contactedAt ? contact.contactedAt.slice(0, 16) : ""} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <label className="text-sm font-bold sm:col-span-2">Rezultat / notatka wewnętrzna<textarea name="contactResult" required rows={3} maxLength={2000} defaultValue={contact.contactResult ?? ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/25" /></label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3"><ActionMessage state={recordState} /><button type="submit" disabled={recordPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:opacity-60"><UserRoundCheck aria-hidden="true" size={18} />{recordPending ? "Zapisuję…" : "Zapisz: kontakt wykonany"}</button></div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Zapis kontaktu nie ustawia statusu VERIFIED. Po potwierdzeniu danych użyj zwykłej akcji weryfikacji.</p>
      </div> : null}
    </section>
  );
}

function ContactValue({ label, value, icon }: { label: string; value: string | null; icon: "phone" | "mail" }) {
  const [copied, setCopied] = useState(false);
  const Icon = icon === "phone" ? Phone : Mail;
  return <div className="min-w-0 text-sm"><span className="block text-xs font-bold text-muted-foreground">{label}</span><div className="mt-0.5 flex items-center gap-2"><Icon aria-hidden="true" className="shrink-0" size={16} /><strong className="min-w-0 break-all">{value ?? "Brak danych"}</strong>{value ? <button type="button" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-brand-soft" aria-label={`Kopiuj: ${label}`} title={`Kopiuj ${label.toLocaleLowerCase("pl-PL")}`}><Clipboard aria-hidden="true" size={17} /></button> : null}</div>{copied ? <span className="text-xs font-semibold text-brand-strong" role="status">Skopiowano</span> : null}</div>;
}

function ActionMessage({ state }: { state: VerificationActionState }) {
  if (state.error) return <p className="text-sm font-semibold text-urgent" role="alert">{state.error}</p>;
  if (state.success) return <p className="text-sm font-semibold text-brand-strong" role="status">{state.success}</p>;
  return <span />;
}
