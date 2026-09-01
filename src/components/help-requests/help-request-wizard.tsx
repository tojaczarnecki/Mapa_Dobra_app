"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Crosshair, MapPin, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormDraftResume } from "@/components/forms/form-draft-ui";
import { useFormDraft } from "@/components/forms/use-form-draft";
import { useUnsavedChangesGuard } from "@/components/forms/use-unsaved-changes-guard";
import { helpRequestNeedLabels } from "@/lib/help-requests/validation";
import { canContinueFromEmergency, isTerminalEmergency, restoreEmergencyAnswer, type EmergencyAnswer } from "@/lib/help-requests/emergency-gate";
import { HELP_REQUEST_FORM_TYPE, HELP_REQUEST_STEP_COUNT, restoreHelpRequestStep, stripHelpRequestContact, type HelpRequestStep } from "@/lib/help-requests/form-flow";
import type { HelpRequestNeed } from "@/generated/prisma/enums";

const LocationMap = dynamic(
  () => import("./help-request-location-map").then((module) => module.HelpRequestLocationMap),
  { ssr: false },
);

type Step = HelpRequestStep;
type LocationMode = "address" | "map" | "description";
type FormState = {
  emergencyAnswer: EmergencyAnswer;
  emergencyAnswerSelected: boolean;
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

type HelpRequestDraft = Omit<FormState, "reporterName" | "reporterPhone" | "reporterEmail">;

const initialState: FormState = {
  emergencyAnswer: null,
  emergencyAnswerSelected: false,
  locationMode: "address",
  addressText: "",
  locationDescription: "",
  needs: [],
  description: "",
  reporterName: "",
  reporterPhone: "",
  reporterEmail: "",
};

const needOrder = [
  "OTHER",
  ...Object.keys(helpRequestNeedLabels).filter((need) => need !== "OTHER"),
] as HelpRequestNeed[];
const initialVisibleNeeds = 5;

export function HelpRequestWizard() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string>();
  const [showContact, setShowContact] = useState(false);
  const [showMoreNeeds, setShowMoreNeeds] = useState(false);
  const manualMapSelectionRef = useRef(false);
  const emergencyHeadingRef = useRef<HTMLHeadingElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef<Step | null>(null);
  const draftData = {
    emergencyAnswer: form.emergencyAnswer,
    emergencyAnswerSelected: form.emergencyAnswerSelected,
    locationMode: form.locationMode,
    addressText: form.addressText,
    locationDescription: form.locationDescription,
    latitude: form.latitude,
    longitude: form.longitude,
    locationAccuracy: form.locationAccuracy,
    needs: form.needs,
    description: form.description,
  };
  const formDraft = useFormDraft({ formType: HELP_REQUEST_FORM_TYPE, storage: "session", ttlMs: 2 * 60 * 60 * 1000, data: draftData, currentStep: step, enabled: !sent && !isTerminalEmergency(form.emergencyAnswer) });
  const previousFormDraft = useFormDraft<HelpRequestDraft>({ formType: "help-request-v2", storage: "session", ttlMs: 2 * 60 * 60 * 1000, data: draftData, currentStep: 1, enabled: false });
  const legacyFormDraft = useFormDraft<HelpRequestDraft>({ formType: "help-request", storage: "session", ttlMs: 2 * 60 * 60 * 1000, data: draftData, currentStep: 1, enabled: false });
  useUnsavedChangesGuard(!sent && formDraft.isDirty);

  useEffect(() => {
    if (isTerminalEmergency(form.emergencyAnswer)) emergencyHeadingRef.current?.focus();
  }, [form.emergencyAnswer]);

  useEffect(() => {
    if (previousStepRef.current === null) {
      previousStepRef.current = step;
      return;
    }
    if (previousStepRef.current !== step) {
      previousStepRef.current = step;
      stepHeadingRef.current?.focus();
    }
  }, [step]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(undefined);
  };

  const hasLocation = Boolean(form.addressText.trim() || form.locationDescription.trim() || form.latitude !== undefined);
  const progress = `${step} z ${HELP_REQUEST_STEP_COUNT}`;
  const summaryNeeds = useMemo(() => form.needs.map((need) => helpRequestNeedLabels[need]), [form.needs]);
  const availableDraft = formDraft.storedDraft ?? previousFormDraft.storedDraft ?? legacyFormDraft.storedDraft;

  function locate() {
    manualMapSelectionRef.current = false;
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
      () => {
        if (!manualMapSelectionRef.current) {
          setLocationMessage("Nie udało się ustalić lokalizacji. Możesz wskazać punkt na mapie lub opisać miejsce.");
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  function next() {
    setError(undefined);
    if (step === 1 && !canContinueFromEmergency(form.emergencyAnswer)) return setError("Wybierz odpowiedź, aby przejść dalej.");
    if (step === 2 && !hasLocation) return setError("Wskaż miejsce, wpisz adres albo opisz, gdzie znajduje się osoba.");
    if (step === 3 && form.needs.length === 0) return setError("Wybierz co najmniej jedną rzecz, która budzi Twój niepokój.");
    if (step === 3 && form.description.trim().length < 10) return setError("Opisz krótko sytuację (co najmniej 10 znaków).");
    setStep((current) => Math.min(4, current + 1) as Step);
  }

  async function submit() {
    if (sending) return;
    if (!canContinueFromEmergency(form.emergencyAnswer)) return setError("Wybierz odpowiedź dotyczącą bezpieczeństwa.");
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
      formDraft.clear();
      previousFormDraft.clear();
      legacyFormDraft.clear();
      setSent(true);
    } catch {
      setError("Nie udało się przekazać informacji. Spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <section className="rounded-xl border border-[#d7a548]/55 bg-[#fffaf0] p-5 shadow-sm sm:p-8" aria-live="polite"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f6dfad] text-[#8a5b13]"><Check aria-hidden="true" size={26} /></div><p className="mt-5 text-sm font-bold uppercase tracking-wide text-[#9a6815]">Przekazanie informacji</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Informacja została przekazana</h2><p className="mt-3 max-w-xl leading-7 text-muted-foreground">Informacja została zapisana i trafiła do kolejki weryfikacji. Dobra Mapa nie powiadamia automatycznie służb i nie gwarantuje interwencji ani czasu reakcji.</p><p className="mt-3 max-w-xl leading-7 text-muted-foreground">Jeśli sytuacja stanie się nagła lub pojawi się bezpośrednie zagrożenie życia albo zdrowia, <a href="tel:112" className="font-bold text-[#b42318] underline underline-offset-2">zadzwoń pod 112</a>.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/pomagam" className="inline-flex min-h-11 items-center rounded-lg bg-[#d79a2b] px-5 py-3 font-bold text-[#352307] hover:bg-[#c48821]">Wróć do Pomagam</Link><Link href="/szukam" className="inline-flex min-h-11 items-center rounded-lg border border-[#d7a548] px-5 py-3 font-bold text-[#805712] hover:bg-[#fff1cf]">Znajdź pomoc dla tej osoby</Link></div></section>;
  }

  if (isTerminalEmergency(form.emergencyAnswer)) {
    return <section className="rounded-xl border border-[#e9521a]/50 bg-[#fffaf0] p-5 shadow-sm sm:p-8" aria-labelledby="emergency-gate-title" aria-live="assertive">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1e9] text-[#b42318]"><AlertTriangle aria-hidden="true" size={26} /></div>
      <p className="mt-5 text-sm font-bold uppercase tracking-wide text-[#9a6815]">Bezpośrednie zagrożenie</p>
      <h2 ref={emergencyHeadingRef} id="emergency-gate-title" tabIndex={-1} className="mt-2 text-2xl font-bold sm:text-3xl">Zadzwoń pod 112.</h2>
      <p className="mt-3 max-w-xl leading-7 text-muted-foreground">Dobra Mapa nie powiadamia służb ratunkowych i nie zastępuje wezwania pomocy. Jeśli ktoś jest nieprzytomny, ma poważne trudności z oddychaniem, jest ciężko ranny lub znajduje się w bezpośrednim niebezpieczeństwie, zadzwoń teraz.</p>
      <div className="mt-5 flex flex-wrap gap-3"><a href="tel:112" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#b42318] px-5 py-3 text-base font-bold text-white hover:bg-[#8f1d14]">Zadzwoń 112</a><button type="button" onClick={() => { update("emergencyAnswer", null); update("emergencyAnswerSelected", false); setStep(1); }} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#d7a548] px-5 py-3 font-bold text-[#805712] hover:bg-[#fff1cf]">Wróć i zmień odpowiedź</button></div>
    </section>;
  }

  return (
    <>
      <FormDraftResume draft={availableDraft} label="Przekaż informację" onResume={() => { const restored = formDraft.storedDraft ? formDraft.resume() : previousFormDraft.storedDraft ? previousFormDraft.resume() : legacyFormDraft.resume(); if (restored) { const emergency = restoreEmergencyAnswer(restored.data); const restoredData = stripHelpRequestContact(restored.data as Record<string, unknown>); setForm((current) => ({ ...current, ...restoredData, reporterName: "", reporterPhone: "", reporterEmail: "", emergencyAnswer: emergency.answer, emergencyAnswerSelected: emergency.selected })); setStep(restoreHelpRequestStep(restored.currentStep)); } }} onDiscard={() => { formDraft.discard(); previousFormDraft.discard(); legacyFormDraft.discard(); setForm(initialState); setStep(1); }} />
      <section className="rounded-xl border border-[#d7a548]/55 bg-white p-4 shadow-[0_14px_34px_rgb(17_24_39_/_6%)] sm:p-7" aria-labelledby="help-wizard-title">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-[#9a6815]" role="status" aria-live="polite" aria-atomic="true">Krok {progress}</p><ShieldCheck aria-hidden="true" className="text-[#b7791f]" size={22} /></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f6ead0]" aria-hidden="true"><div className="h-full rounded-full bg-[#d79a2b] transition-all" style={{ width: `${(step / HELP_REQUEST_STEP_COUNT) * 100}%` }} /></div>
      <div className="mt-7 min-h-[24rem]">
        {step === 1 ? <div><h2 ref={stepHeadingRef} id="help-wizard-title" tabIndex={-1} className="text-2xl font-bold outline-none sm:text-3xl">Czy ktoś jest teraz w bezpośrednim zagrożeniu życia lub zdrowia?</h2><p className="mt-3 leading-7 text-muted-foreground">Jeśli tak, najpierw zadzwoń pod 112. Ten formularz nie zastępuje pomocy ratunkowej.</p><fieldset className="mt-6 grid gap-3 sm:grid-cols-3"><legend className="sr-only">Wybierz odpowiedź dotyczącą bezpieczeństwa</legend>{(["YES", "NO", "UNKNOWN"] as const).map((value) => <label key={value} className={`flex min-h-14 cursor-pointer items-center rounded-lg border px-4 text-left font-bold transition ${form.emergencyAnswer === value ? "border-[#b7791f] bg-[#fff1cf] text-[#6f480c]" : "border-border hover:border-[#d7a548]"}`}><input type="radio" name="emergency-answer" value={value} checked={form.emergencyAnswer === value} onChange={() => { update("emergencyAnswer", value); update("emergencyAnswerSelected", true); }} className="mr-3 h-5 w-5 accent-[#b7791f]" />{value === "YES" ? "Tak — ktoś jest w bezpośrednim zagrożeniu" : value === "NO" ? "Nie" : "Nie wiem"}</label>)}</fieldset></div> : null}
        {step === 2 ? <div><h2 ref={stepHeadingRef} id="help-wizard-title" tabIndex={-1} className="text-2xl font-bold outline-none sm:text-3xl">Gdzie to jest?</h2><p className="mt-3 leading-7 text-muted-foreground">Wskaż miejsce tak dokładnie, jak możesz. Nie musisz znać pełnego adresu.</p><p className="mt-2 text-sm text-muted-foreground">Może to być np. „park obok dworca”, adres albo punkt na mapie.</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => { manualMapSelectionRef.current = false; setLocationMessage(undefined); update("locationMode", "address"); }} className={`min-h-12 rounded-lg border px-3 text-sm font-bold ${form.locationMode === "address" ? "border-[#b7791f] bg-[#fff1cf] text-[#6f480c]" : "border-border"}`}>Wpisz adres lub opis miejsca</button><button type="button" onClick={locate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d7a548] px-3 text-sm font-bold text-[#805712] hover:bg-[#fff1cf]"><Crosshair aria-hidden="true" size={18} />Użyj mojej lokalizacji</button><button type="button" onClick={() => { manualMapSelectionRef.current = false; setLocationMessage(undefined); update("locationMode", "map"); }} className={`min-h-12 rounded-lg border px-3 text-sm font-bold sm:col-span-2 ${form.locationMode === "map" ? "border-[#b7791f] bg-[#fff1cf] text-[#6f480c]" : "border-border"}`}>Wskaż na mapie</button></div>{form.locationMode === "address" ? <label className="mt-5 block text-sm font-bold">Adres lub punkt orientacyjny<input className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 font-normal" value={form.addressText} onChange={(event) => update("addressText", event.target.value)} placeholder="Np. park obok dworca" maxLength={500} /></label> : null}{form.locationMode === "map" ? <div className="mt-5"><p className="text-sm text-muted-foreground">Kliknij przybliżone miejsce na mapie.</p><div className="mt-3"><LocationMap position={form.latitude !== undefined && form.longitude !== undefined ? [form.latitude, form.longitude] : undefined} onPick={(position) => { manualMapSelectionRef.current = true; update("latitude", position[0]); update("longitude", position[1]); setLocationMessage("Wskazano przybliżone miejsce na mapie."); }} /></div></div> : null}{locationMessage ? <p className="mt-3 text-sm font-semibold text-[#805712]" role="status">{locationMessage}</p> : null}</div> : null}
        {step === 3 ? <div><h2 ref={stepHeadingRef} id="help-wizard-title" tabIndex={-1} className="text-2xl font-bold outline-none sm:text-3xl">Co budzi Twój niepokój?</h2><p className="mt-3 leading-7 text-muted-foreground">Zaznacz to, co najlepiej opisuje sytuację. Jeśli trudno powiedzieć — też możesz to zaznaczyć. Następnie napisz krótko, co zauważyłeś.</p><fieldset className="mt-5 grid gap-2 sm:grid-cols-2"><legend className="sr-only">Wybierz, co pasuje do sytuacji</legend>{needOrder.slice(0, showMoreNeeds ? needOrder.length : initialVisibleNeeds).map((need) => { const checked = form.needs.includes(need); return <label key={need} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm font-semibold ${checked ? "border-[#b7791f] bg-[#fff1cf]" : "border-border hover:border-[#d7a548]"}`}><input type="checkbox" className="h-5 w-5 accent-[#b7791f]" checked={checked} onChange={() => update("needs", checked ? form.needs.filter((item) => item !== need) : [...form.needs, need])} />{helpRequestNeedLabels[need]}</label>; })}</fieldset>{needOrder.length > initialVisibleNeeds ? <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-bold text-brand-strong" aria-expanded={showMoreNeeds} onClick={() => setShowMoreNeeds((visible) => !visible)}>{showMoreNeeds ? <><ChevronUp aria-hidden="true" size={18} />Pokaż mniej możliwości</> : <><ChevronDown aria-hidden="true" size={18} />Pokaż więcej możliwości</>}</button> : null}<label className="mt-5 block text-sm font-bold">Krótki opis sytuacji<textarea className="mt-1 min-h-36 w-full rounded-lg border border-border p-3 leading-7 font-normal" value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={5000} placeholder="Napisz tylko to, co może pomóc zrozumieć sytuację i odnaleźć miejsce." aria-label="Opis sytuacji" /></label><p className="mt-1 text-right text-xs text-muted-foreground">{form.description.length}/5000</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Nie podawaj imienia ani innych danych osoby, jeśli nie są potrzebne.</p></div> : null}
        {step === 4 ? <div><h2 ref={stepHeadingRef} id="help-wizard-title" tabIndex={-1} className="text-2xl font-bold outline-none sm:text-3xl">Sprawdź i przekaż informację</h2><div className="mt-5 divide-y divide-border rounded-lg border border-border"><div className="flex items-start justify-between gap-3 p-3"><div><p className="text-xs font-bold uppercase text-muted-foreground">Miejsce</p><p className="mt-1 font-semibold">{form.addressText || form.locationDescription || form.latitude !== undefined ? form.addressText || form.locationDescription || "Wskazano przybliżone miejsce na mapie" : "Nie wskazano"}</p></div><button type="button" onClick={() => setStep(2)} className="shrink-0 text-sm font-bold text-brand-strong underline underline-offset-2">Zmień</button></div><div className="flex items-start justify-between gap-3 p-3"><div><p className="text-xs font-bold uppercase text-muted-foreground">Sytuacja</p><p className="mt-1 font-semibold">{summaryNeeds.join(" · ") || "Nie określono"}{form.description ? ` · ${form.description.slice(0, 90)}${form.description.length > 90 ? "…" : ""}` : ""}</p></div><button type="button" onClick={() => setStep(3)} className="shrink-0 text-sm font-bold text-brand-strong underline underline-offset-2">Zmień</button></div><div className="flex items-start justify-between gap-3 p-3"><div><p className="text-xs font-bold uppercase text-muted-foreground">Kontakt</p><p className="mt-1 font-semibold">{form.reporterName || form.reporterPhone || form.reporterEmail ? "Podano kontakt" : "Anonimowo"}</p></div><button type="button" onClick={() => setShowContact(true)} className="shrink-0 text-sm font-bold text-brand-strong underline underline-offset-2">Zmień</button></div></div><button type="button" onClick={() => setShowContact((visible) => !visible)} aria-expanded={showContact} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-strong">Opcjonalnie: zostaw kontakt <span aria-hidden="true">{showContact ? "⌃" : "⌄"}</span></button>{showContact ? <div className="mt-3 grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2"><p className="sm:col-span-2 text-sm leading-6 text-muted-foreground">Może pomóc, jeśli przy weryfikacji potrzebne będą dodatkowe informacje. Możesz przekazać informację anonimowo.</p><label className="text-sm font-bold">Imię<input className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 font-normal" value={form.reporterName} onChange={(event) => update("reporterName", event.target.value)} maxLength={160} /></label><label className="text-sm font-bold">Telefon<input type="tel" className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 font-normal" value={form.reporterPhone} onChange={(event) => update("reporterPhone", event.target.value)} maxLength={50} /></label><label className="text-sm font-bold sm:col-span-2">E-mail<input type="email" className="mt-1 min-h-12 w-full rounded-lg border border-border px-3 font-normal" value={form.reporterEmail} onChange={(event) => update("reporterEmail", event.target.value)} maxLength={320} /></label></div> : null}<p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground"><MapPin aria-hidden="true" className="shrink-0" size={15} />Prywatne zgłoszenie · nie publikujemy treści ani dokładnej lokalizacji.</p></div> : null}
      </div>
      {error ? <p className="mt-4 rounded-lg border border-[#e9521a]/40 bg-[#fff1e9] p-3 text-sm font-semibold text-[#7e2b0f]" role="alert">{error}</p> : null}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><button type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as Step)} disabled={step === 1 || sending} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-muted-foreground hover:bg-surface-muted disabled:invisible"><ArrowLeft aria-hidden="true" size={18} />Wstecz</button>{step < 4 ? <button type="button" onClick={next} disabled={step === 1 && !canContinueFromEmergency(form.emergencyAnswer)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#d79a2b] px-5 py-3 text-sm font-bold text-[#352307] hover:bg-[#c48821] disabled:cursor-not-allowed disabled:opacity-50">Dalej <ArrowRight aria-hidden="true" size={18} /></button> : <button type="button" onClick={submit} disabled={sending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#d79a2b] px-5 py-3 text-sm font-bold text-[#352307] hover:bg-[#c48821] disabled:opacity-60"><Send aria-hidden="true" size={18} />{sending ? "Przekazuję…" : "Przekaż informację"}</button>}</div>
      </section>
    </>
  );
}
