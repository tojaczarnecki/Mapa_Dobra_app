"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Crosshair, HeartHandshake, MapPin, Send, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { helpRequestNeedLabels } from "@/lib/help-requests/validation";
import type { HelpRequestNeed } from "@/generated/prisma/enums";

const LocationMap = dynamic(
  () => import("./help-request-location-map").then((module) => module.HelpRequestLocationMap),
  { ssr: false },
);

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type LocationMode = "address" | "map" | "description";
type FormState = {
  emergencyAnswer: "YES" | "NO" | "UNKNOWN";
  locationMode: LocationMode;
  addressText: string;
  locationDescription: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  needs: HelpRequestNeed[];
  description: string;
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
};

const initialState: FormState = {
  emergencyAnswer: "UNKNOWN",
  locationMode: "address",
  addressText: "",
  locationDescription: "",
  needs: [],
  description: "",
  reporterName: "",
  reporterPhone: "",
  reporterEmail: "",
};

const needOrder = Object.keys(helpRequestNeedLabels) as HelpRequestNeed[];

export function HelpRequestWizard() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string>();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(undefined);
  };

  const hasLocation = Boolean(form.addressText.trim() || form.locationDescription.trim() || form.latitude !== undefined);
  const progress = `${step} z 6`;
  const summaryNeeds = useMemo(() => form.needs.map((need) => helpRequestNeedLabels[need]), [form.needs]);

  function locate() {
    if (!navigator.geolocation) {
      setLocationMessage("Ta przeglądarka nie udostępnia lokalizacji. Możesz wpisać adres lub opisać miejsce.");
      return;
    }
    setLocationMessage("Ustalam przybliżoną lokalizację…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          locationMode: "map",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
        }));
        setLocationMessage("Lokalizacja jest widoczna tylko dla uprawnionych osób obsługujących zgłoszenie.");
      },
      () => setLocationMessage("Nie udało się ustalić lokalizacji. Możesz wskazać punkt na mapie lub opisać miejsce."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  function next() {
    setError(undefined);
    if (step === 2 && !hasLocation) return setError("Wskaż miejsce, wpisz adres albo opisz, gdzie znajduje się osoba.");
    if (step === 3 && form.needs.length === 0) return setError("Wybierz co najmniej jedną rzecz, która budzi Twój niepokój.");
    if (step === 4 && form.description.trim().length < 10) return setError("Opisz krótko sytuację (co najmniej 10 znaków).");
    setStep((current) => Math.min(6, current + 1) as Step);
  }

  async function submit() {
    if (sending) return;
    setSending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyAnswer: form.emergencyAnswer,
          urgency: form.emergencyAnswer === "YES" ? "IMMEDIATE" : "UNKNOWN",
          needs: form.needs,
          description: form.description,
          addressText: [form.addressText, form.locationDescription].filter(Boolean).join(" · ") || undefined,
          latitude: form.latitude,
          longitude: form.longitude,
          locationAccuracy: form.locationAccuracy,
          reporterName: form.reporterName,
          reporterPhone: form.reporterPhone,
          reporterEmail: form.reporterEmail,
          honeypot: "",
        }),
      });
      if (!response.ok) throw new Error("SUBMIT_FAILED");
      setSent(true);
    } catch {
      setError("Nie udało się przekazać informacji. Spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <section className="rounded-xl border border-[#d7a548]/55 bg-[#fffaf0] p-5 shadow-sm sm:p-8" aria-live="polite"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f6dfad] text-[#8a5b13]"><Check aria-hidden="true" size={26} /></div><p className="mt-5 text-sm font-bold uppercase tracking-wide text-[#9a6815]">Uruchom pomoc</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Dziękujemy. Informacja została przekazana do weryfikacji.</h2><p className="mt-3 max-w-xl leading-7 text-muted-foreground">Jeśli sytuacja stanie się nagła lub zagrożone będzie życie albo zdrowie, zadzwoń pod numer 112.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-[#d79a2b] px-5 py-3 font-bold text-[#352307] hover:bg-[#c48821]">Wróć do Mapy Dobra</Link><Link href="/uruchom-pomoc" className="inline-flex min-h-11 items-center rounded-lg border border-[#d7a548] px-5 py-3 font-bold text-[#805712] hover:bg-[#fff1cf]">Uruchom pomoc dla innej sytuacji</Link></div></section>;
  }

  return (
    <section className="rounded-xl border border-[#d7a548]/55 bg-white p-4 shadow-[0_14px_34px_rgb(17_24_39_/_6%)] sm:p-7" aria-labelledby="help-wizard-title">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-[#9a6815]">Krok {progress}</p><ShieldCheck aria-hidden="true" className="text-[#b7791f]" size={22} /></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f6ead0]" aria-hidden="true"><div className="h-full rounded-full bg-[#d79a2b] transition-all" style={{ width: `${(step / 6) * 100}%` }} /></div>
      <div className="mt-7 min-h-[24rem]">
        {step === 1 ? <div><h2 id="help-wizard-title" className="text-2xl font-bold sm:text-3xl">Czy ktoś jest teraz w bezpośrednim zagrożeniu życia lub zdrowia?</h2><p className="mt-3 leading-7 text-muted-foreground">Jeśli tak, najpierw zadzwoń pod 112. Ten formularz nie zastępuje pomocy ratunkowej.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{(["YES", "NO", "UNKNOWN"] as const).map((value) => <button key={value} type="button" onClick={() => update("emergencyAnswer", value)} className={`min-h-14 rounded-lg border px-4 text-left font-bold transition ${form.emergencyAnswer === value ? "border-[#b7791f] bg-[#fff1cf] text-[#6f480c]" : "border-border hover:border-[#d7a548]"}`}>{value === "YES" ? "Tak" : value === "NO" ? "Nie" : "Nie wiem"}</button>)}</div>{form.emergencyAnswer === "YES" ? <div className="mt-5 flex flex-col gap-4 rounded-lg border border-[#e9521a]/50 bg-[#fff1e9] p-4 text-sm font-bold text-[#7e2b0f] sm:flex-row sm:items-center" role="alert"><div className="flex gap-3"><AlertTriangle className="mt-0.5 shrink-0" aria-hidden="true" size={21} /><p>Jeżeli ktoś jest teraz w bezpośrednim zagrożeniu życia lub zdrowia, zadzwoń pod numer 112.</p></div><a href="tel:112" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-[#b42318] px-5 py-3 text-base font-bold text-white hover:bg-[#8f1d14]">Zadzwoń pod 112</a></div> : null}</div> : null}
        {step === 2 ? <div><h2 id="help-wizard-title" className="text-2xl font-bold sm:text-3xl">Gdzie potrzebne jest wsparcie?</h2><p className="mt-3 leading-7 text-muted-foreground">Podaj tyle informacji o miejscu, ile możesz. Dokładna lokalizacja nie będzie publiczna.</p><div className="mt-5 grid gap-2 sm:grid-cols-3">{(["address", "map", "description"] as const).map((mode) => <button key={mode} type="button" onClick={() => update("locationMode", mode)} className={`min-h-12 rounded-lg border px-3 text-sm font-bold ${form.locationMode === mode ? "border-[#b7791f] bg-[#fff1cf] text-[#6f480c]" : "border-border"}`}>{mode === "address" ? "Wpisz adres" : mode === "map" ? "Wskaż na mapie" : "Opisz miejsce"}</button>)}</div>{form.locationMode === "address" ? <label className="mt-5 block text-sm font-bold">Adres lub punkt orientacyjny<input className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 font-normal" value={form.addressText} onChange={(event) => update("addressText", event.target.value)} placeholder="Np. okolice ulicy Piotrkowskiej" maxLength={500} /></label> : null}{form.locationMode === "description" ? <label className="mt-5 block text-sm font-bold">Opis miejsca<textarea className="mt-1 min-h-28 w-full rounded-lg border border-border p-3 font-normal" value={form.locationDescription} onChange={(event) => update("locationDescription", event.target.value)} placeholder="Np. ławka przy wejściu do parku" maxLength={500} /></label> : null}{form.locationMode === "map" ? <div className="mt-5"><button type="button" onClick={locate} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d7a548] px-4 text-sm font-bold text-[#805712] hover:bg-[#fff1cf]"><Crosshair aria-hidden="true" size={18} />Użyj mojej lokalizacji</button><p className="mt-2 text-xs text-muted-foreground">Możesz też kliknąć przybliżone miejsce na mapie.</p><div className="mt-3"><LocationMap position={form.latitude !== undefined && form.longitude !== undefined ? [form.latitude, form.longitude] : undefined} onPick={(position) => { update("latitude", position[0]); update("longitude", position[1]); setLocationMessage("Wybrano przybliżone miejsce na mapie."); }} /></div></div> : null}{locationMessage ? <p className="mt-3 text-sm font-semibold text-[#805712]" role="status">{locationMessage}</p> : null}</div> : null}
        {step === 3 ? <div><h2 id="help-wizard-title" className="text-2xl font-bold sm:text-3xl">Co budzi Twój niepokój?</h2><p className="mt-3 leading-7 text-muted-foreground">Wybierz wszystko, co pasuje. Opisujemy sytuację, nie oceniamy osoby.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{needOrder.map((need) => { const checked = form.needs.includes(need); return <label key={need} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm font-semibold ${checked ? "border-[#b7791f] bg-[#fff1cf]" : "border-border hover:border-[#d7a548]"}`}><input type="checkbox" className="h-5 w-5 accent-[#b7791f]" checked={checked} onChange={() => update("needs", checked ? form.needs.filter((item) => item !== need) : [...form.needs, need])} />{helpRequestNeedLabels[need]}</label>; })}</div></div> : null}
        {step === 4 ? <div><h2 id="help-wizard-title" className="text-2xl font-bold sm:text-3xl">Opowiedz krótko, co widzisz</h2><p className="mt-3 leading-7 text-muted-foreground">Nie musisz znać imienia ani danych osoby. Napisz, co faktycznie zaobserwowałeś/-aś i co może pomóc odnaleźć miejsce.</p><textarea className="mt-5 min-h-48 w-full rounded-lg border border-border p-3 leading-7" value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={5000} placeholder="Np. od kilku godzin widzę osobę siedzącą..." aria-label="Opis sytuacji" /> <p className="mt-1 text-right text-xs text-muted-foreground">{form.description.length}/5000</p></div> : null}
        {step === 5 ? <div><h2 id="help-wizard-title" className="text-2xl font-bold sm:text-3xl">Czy możemy się z Tobą skontaktować?</h2><p className="mt-3 leading-7 text-muted-foreground">To opcjonalne. Kontakt może pomóc, jeśli potrzebne będą dodatkowe informacje o miejscu lub sytuacji.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Imię <input className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 font-normal" value={form.reporterName} onChange={(event) => update("reporterName", event.target.value)} maxLength={160} /></label><label className="text-sm font-bold">Telefon <input type="tel" className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 font-normal" value={form.reporterPhone} onChange={(event) => update("reporterPhone", event.target.value)} maxLength={50} /></label><label className="text-sm font-bold sm:col-span-2">E-mail <input type="email" className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 font-normal" value={form.reporterEmail} onChange={(event) => update("reporterEmail", event.target.value)} maxLength={320} /></label></div><p className="mt-5 flex gap-2 text-sm text-muted-foreground"><HeartHandshake aria-hidden="true" className="shrink-0 text-[#b7791f]" size={18} />Nie musisz podawać żadnych danych kontaktowych.</p></div> : null}
        {step === 6 ? <div><h2 id="help-wizard-title" className="text-2xl font-bold sm:text-3xl">Sprawdź informacje</h2><dl className="mt-5 divide-y divide-border rounded-lg border border-border"><div className="p-3"><dt className="text-xs font-bold uppercase text-muted-foreground">Bezpośrednie zagrożenie</dt><dd className="mt-1 font-semibold">{form.emergencyAnswer === "YES" ? "Tak" : form.emergencyAnswer === "NO" ? "Nie" : "Nie wiem"}</dd></div><div className="p-3"><dt className="text-xs font-bold uppercase text-muted-foreground">Potrzeby</dt><dd className="mt-1 font-semibold">{summaryNeeds.join(" · ")}</dd></div><div className="p-3"><dt className="text-xs font-bold uppercase text-muted-foreground">Miejsce</dt><dd className="mt-1 font-semibold">{form.addressText || form.locationDescription || form.latitude !== undefined ? form.addressText || form.locationDescription || "Wskazano przybliżoną lokalizację" : "Brak"}</dd></div><div className="p-3"><dt className="text-xs font-bold uppercase text-muted-foreground">Opis</dt><dd className="mt-1 whitespace-pre-wrap font-semibold">{form.description}</dd></div><div className="p-3"><dt className="text-xs font-bold uppercase text-muted-foreground">Kontakt</dt><dd className="mt-1 font-semibold">{form.reporterName || form.reporterPhone || form.reporterEmail ? [form.reporterName, form.reporterPhone, form.reporterEmail].filter(Boolean).join(" · ") : "Anonimowo"}</dd></div></dl></div> : null}
      </div>
      {error ? <p className="mt-4 rounded-lg border border-[#e9521a]/40 bg-[#fff1e9] p-3 text-sm font-semibold text-[#7e2b0f]" role="alert">{error}</p> : null}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><button type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as Step)} disabled={step === 1 || sending} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-muted-foreground hover:bg-surface-muted disabled:invisible"><ArrowLeft aria-hidden="true" size={18} />Wstecz</button>{step < 6 ? <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#d79a2b] px-5 py-3 text-sm font-bold text-[#352307] hover:bg-[#c48821]">Dalej <ArrowRight aria-hidden="true" size={18} /></button> : <button type="button" onClick={submit} disabled={sending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#d79a2b] px-5 py-3 text-sm font-bold text-[#352307] hover:bg-[#c48821] disabled:opacity-60"><Send aria-hidden="true" size={18} />{sending ? "Przekazuję…" : "Uruchom pomoc"}</button>}</div>
      <p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground"><MapPin aria-hidden="true" className="shrink-0" size={15} />Prywatne zgłoszenie · nie publikujemy treści ani dokładnej lokalizacji.</p>
    </section>
  );
}
