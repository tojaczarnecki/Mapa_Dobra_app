"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Crosshair, HeartHandshake, MapPin, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { FormDraftResume } from "@/components/forms/form-draft-ui";
import { useFormDraft } from "@/components/forms/use-form-draft";
import { useUnsavedChangesGuard } from "@/components/forms/use-unsaved-changes-guard";
import { useTurnstileToken } from "@/components/security/turnstile-token";
import { formatLocationSuggestion, LocationAutocomplete } from "@/components/location/location-autocomplete";
import { PUBLIC_GEOGRAPHIC_CONTEXT, type GeographicContext } from "@/lib/geocoding/geographic-context";
import type { GeocodingPrecision } from "@/lib/geocoding/results";
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
  locationSource?: "geocoder" | "geolocation" | "manual-map";
  locationPrecision?: GeocodingPrecision;
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

export function HelpRequestWizard({ geographicContext = PUBLIC_GEOGRAPHIC_CONTEXT }: { geographicContext?: GeographicContext }) {
  const turnstile = useTurnstileToken();
  const [formStartedAt] = useState(() => Date.now());
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string>();
  const [locationPending, setLocationPending] = useState(false);
  const draft = useFormDraft({ formType: "help-request", storage: "session", ttlMs: 2 * 60 * 60 * 1000, data: form, currentStep: step, enabled: !sent });
  useUnsavedChangesGuard(!sent && draft.isDirty);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(undefined);
  };

  const hasLocation = Boolean(
    form.addressText.trim() ||
    form.locationDescription.trim() ||
    (form.latitude !== undefined && form.longitude !== undefined),
  );
  const progress = `${step} z 6`;
  const summaryNeeds = useMemo(() => form.needs.map((need) => helpRequestNeedLabels[need]), [form.needs]);

  function locate() {
    if (!navigator.geolocation) {
      setLocationMessage("Ta przeglądarka nie udostępnia lokalizacji. Możesz wpisać adres lub opisać miejsce.");
      return;
    }
    setLocationPending(true);
    setLocationMessage("Ustalam przybliżoną lokalizację…");
    navigator.geolocation.getCurrentPosition(
        (position) => {
        setForm((current) => ({
          ...current,
          locationMode: "map",
          addressText: "",
          locationDescription: "",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
          locationSource: "geolocation",
          locationPrecision: undefined,
        }));
        setLocationMessage("Lokalizacja jest widoczna tylko dla uprawnionych osób obsługujących zgłoszenie.");
        setLocationPending(false);
      },
      () => {
        setLocationPending(false);
        setLocationMessage("Nie udało się ustalić lokalizacji. Możesz wskazać punkt na mapie lub opisać miejsce.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  function next() {
    setError(undefined);
    if (step === 1 && form.emergencyAnswer === "UNKNOWN") return setError("Odpowiedz, czy ktoś jest teraz w bezpośrednim zagrożeniu.");
    if (step === 2 && !hasLocation) return setError("Wskaż miejsce, wpisz adres albo opisz, gdzie znajduje się osoba.");
    if (step === 3 && form.needs.length === 0) return setError("Wybierz co najmniej jedną rzecz, która budzi Twój niepokój.");
    setStep((current) => Math.min(6, current + 1) as Step);
  }

  async function submit() {
    if (sending) return;
    setSending(true);
    setError(undefined);
    try {
      const turnstileToken = await turnstile.requestToken();
      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        formStartedAt,
          emergencyAnswer: form.emergencyAnswer,
          urgency: form.emergencyAnswer === "YES" ? "IMMEDIATE" : "UNKNOWN",
          needs: form.needs,
          description: form.description.trim() || `Zgłoszenie bez dodatkowego opisu. Potrzeby: ${summaryNeeds.join(", ")}.`,
          addressText: [form.addressText, form.locationDescription].filter(Boolean).join(" · ") || undefined,
          latitude: form.latitude,
          longitude: form.longitude,
          locationAccuracy: form.locationAccuracy,
          reporterName: form.reporterName,
          reporterPhone: form.reporterPhone,
          reporterEmail: form.reporterEmail,
          honeypot: "",
          turnstileToken,
        }),
      });
      if (!response.ok) throw new Error("SUBMIT_FAILED");
      draft.clear();
      setSent(true);
    } catch {
      if (!navigator.onLine) {
        window.dispatchEvent(new Event("mapa-dobra:network-failure"));
      }
      setError(navigator.onLine
        ? "Nie udało się przekazać informacji. Spróbuj ponownie."
        : "Brak połączenia. Zgłoszenie nie zostało wysłane. Sprawdź sieć i spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <section className="help-request-success" aria-live="polite"><div className="help-request-success-icon"><Check aria-hidden="true" size={26} /></div><p className="help-request-kicker">Uruchom pomoc</p><h2 className="help-request-success-title">Dziękujemy. Informacja została przekazana do weryfikacji.</h2><p className="help-request-success-copy">Jeśli sytuacja stanie się nagła lub zagrożone będzie życie albo zdrowie, zadzwoń pod numer 112.</p><div className="help-request-success-actions"><Link href="/" className="help-request-primary-action">Wróć do Mapy Dobra</Link><Link href="/uruchom-pomoc" className="help-request-secondary-action">Uruchom pomoc dla innej sytuacji</Link></div></section>;
  }

  return (
    <section className="help-request-wizard" aria-labelledby="help-wizard-title">
      <FormDraftResume draft={draft.storedDraft} label="Uruchom pomoc" onResume={() => { const restored = draft.resume(); if (restored) { setForm(restored.data); if (typeof restored.currentStep === "number") setStep(Math.min(6, Math.max(1, restored.currentStep)) as Step); } }} onDiscard={() => { draft.discard(); setForm(initialState); setStep(1); }} />
      <div className="help-request-progress"><p>Krok {progress}</p><span>{step === 4 ? "Opis jest opcjonalny" : step === 5 ? "Kontakt jest opcjonalny" : null}</span></div>
      <div className="help-request-progress-track" role="progressbar" aria-label="Postęp formularza" aria-valuemin={1} aria-valuemax={6} aria-valuenow={step}><div className="help-request-progress-value" style={{ width: `${(step / 6) * 100}%` }} /></div>
      <div className="help-request-step">
        {step === 1 ? <div><h2 id="help-wizard-title" className="help-request-question">Czy ktoś jest teraz w bezpośrednim zagrożeniu życia lub zdrowia?</h2><p className="help-request-lead">Jeśli tak, najpierw zadzwoń pod 112. Ten formularz nie zastępuje pomocy ratunkowej.</p><div className="help-request-choices">{(["YES", "NO", "UNKNOWN"] as const).map((value) => <button key={value} type="button" onClick={() => update("emergencyAnswer", value)} className={`help-request-choice ${form.emergencyAnswer === value ? "help-request-choice-selected" : ""}`}>{value === "YES" ? "Tak" : value === "NO" ? "Nie" : "Nie wiem"}</button>)}</div>{form.emergencyAnswer === "YES" ? <div className="help-request-emergency" role="alert"><div className="flex gap-3"><AlertTriangle className="mt-0.5 shrink-0" aria-hidden="true" size={21} /><p>Jeżeli ktoś jest teraz w bezpośrednim zagrożeniu życia lub zdrowia, zadzwoń pod numer 112.</p></div><a href="tel:112" className="help-request-emergency-action">Zadzwoń pod 112</a></div> : null}</div> : null}
        {step === 2 ? <div><h2 id="help-wizard-title" className="help-request-question">Gdzie jest ta osoba?</h2><p className="help-request-lead">Podaj tyle informacji o miejscu, ile możesz. Dokładna lokalizacja nie będzie publiczna.</p><div className="help-request-choices help-request-location-choices">{(["address", "map", "description"] as const).map((mode) => <button key={mode} type="button" onClick={() => update("locationMode", mode)} className={`help-request-choice ${form.locationMode === mode ? "help-request-choice-selected" : ""}`}>{mode === "address" ? "Wpisz adres" : mode === "map" ? "Wskaż na mapie" : "Opisz miejsce"}</button>)}</div>{form.locationMode === "address" ? <><label className="help-request-field">Adres lub punkt orientacyjny<LocationAutocomplete value={form.addressText} geographicContext={geographicContext} onChange={(value) => setForm((current) => ({ ...current, addressText: value, latitude: undefined, longitude: undefined, locationAccuracy: undefined, locationSource: undefined, locationPrecision: undefined }))} onSelect={(suggestion) => { setForm((current) => ({ ...current, locationMode: "map", addressText: formatLocationSuggestion(suggestion).value, latitude: suggestion.latitude, longitude: suggestion.longitude, locationAccuracy: undefined, locationSource: "geocoder", locationPrecision: suggestion.precision })); setLocationMessage(suggestion.precision === "address" ? "Sprawdź, czy punkt na mapie jest ustawiony poprawnie." : "To przybliżony punkt. Sprawdź, czy lokalizacja na mapie jest odpowiednia."); }} /></label><div className="help-request-location-shortcuts"><button type="button" onClick={locate} className="help-request-inline-action" disabled={locationPending}><Crosshair aria-hidden="true" size={18} />{locationPending ? "Ustalam lokalizację…" : "Użyj mojej lokalizacji"}</button><button type="button" onClick={() => update("locationMode", "map")} className="help-request-inline-action">Wskaż na mapie</button></div></> : null}{form.locationMode === "description" ? <label className="help-request-field">Opis miejsca<textarea className="help-request-input help-request-textarea" value={form.locationDescription} onChange={(event) => update("locationDescription", event.target.value)} placeholder="Np. ławka przy wejściu do parku" maxLength={500} /></label> : null}{form.locationMode === "map" ? <div className="help-request-map-block"><button type="button" onClick={locate} className="help-request-inline-action" disabled={locationPending}><Crosshair aria-hidden="true" size={18} />{locationPending ? "Ustalam lokalizację…" : "Użyj mojej lokalizacji"}</button><p className="help-request-hint">Możesz też kliknąć przybliżone miejsce na mapie.</p><div className="mt-3"><LocationMap geographicContext={geographicContext} precision={form.locationPrecision} position={form.latitude !== undefined && form.longitude !== undefined ? [form.latitude, form.longitude] : undefined} onPick={(position) => { update("latitude", position[0]); update("longitude", position[1]); update("locationAccuracy", undefined); update("locationSource", "manual-map"); setLocationMessage("Wybrano przybliżone miejsce na mapie."); }} /></div></div> : null}{locationMessage ? <p className="help-request-location-message" role="status">{locationMessage}</p> : null}</div> : null}
        {step === 3 ? <div><h2 id="help-wizard-title" className="help-request-question">Co budzi Twój niepokój?</h2><p className="help-request-lead">Wybierz wszystko, co pasuje. Opisujemy sytuację, nie oceniamy osoby.</p><div className="help-request-need-list">{needOrder.map((need) => { const checked = form.needs.includes(need); return <label key={need} className={`help-request-need ${checked ? "help-request-choice-selected" : ""}`}><input type="checkbox" className="h-5 w-5 accent-[#d79a2b]" checked={checked} onChange={() => update("needs", checked ? form.needs.filter((item) => item !== need) : [...form.needs, need])} />{helpRequestNeedLabels[need]}</label>; })}</div></div> : null}
        {step === 4 ? <div><h2 id="help-wizard-title" className="help-request-question">Opowiedz krótko, co widzisz <span className="help-request-optional">(opcjonalnie)</span></h2><p className="help-request-lead">Jeśli możesz, napisz co faktycznie zaobserwowałeś/-aś. Możesz też przejść dalej bez dodatkowego opisu.</p><textarea className="help-request-input help-request-textarea help-request-description" value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={5000} placeholder="Np. od kilku godzin widzę osobę siedzącą..." aria-label="Opis sytuacji, opcjonalny" /> <p className="help-request-character-count">{form.description.length}/5000</p></div> : null}
        {step === 5 ? <div><h2 id="help-wizard-title" className="help-request-question">Czy możemy się z Tobą skontaktować?</h2><p className="help-request-lead">To opcjonalne. Kontakt może pomóc, jeśli potrzebne będą dodatkowe informacje o miejscu lub sytuacji.</p><div className="help-request-contact-fields"><label className="help-request-field">Imię <input className="help-request-input" value={form.reporterName} onChange={(event) => update("reporterName", event.target.value)} maxLength={160} /></label><label className="help-request-field">Telefon <input type="tel" className="help-request-input" value={form.reporterPhone} onChange={(event) => update("reporterPhone", event.target.value)} maxLength={50} /></label><label className="help-request-field help-request-field-wide">E-mail <input type="email" className="help-request-input" value={form.reporterEmail} onChange={(event) => update("reporterEmail", event.target.value)} maxLength={320} /></label></div><p className="help-request-privacy-note"><HeartHandshake aria-hidden="true" size={18} />Nie musisz podawać żadnych danych kontaktowych.</p></div> : null}
        {step === 6 ? <div><h2 id="help-wizard-title" className="help-request-question">Sprawdź informacje</h2><dl className="help-request-summary"><div><dt>Bezpośrednie zagrożenie</dt><dd>{form.emergencyAnswer === "YES" ? "Tak" : form.emergencyAnswer === "NO" ? "Nie" : "Nie wiem"}</dd></div><div><dt>Potrzeby</dt><dd>{summaryNeeds.join(" · ")}</dd></div><div><dt>Miejsce</dt><dd>{form.addressText || form.locationDescription || form.latitude !== undefined ? form.addressText || form.locationDescription || "Wskazano przybliżoną lokalizację" : "Brak"}</dd></div><div><dt>Opis</dt><dd className="whitespace-pre-wrap">{form.description}</dd></div><div><dt>Kontakt</dt><dd>{form.reporterName || form.reporterPhone || form.reporterEmail ? [form.reporterName, form.reporterPhone, form.reporterEmail].filter(Boolean).join(" · ") : "Anonimowo"}</dd></div></dl></div> : null}
      </div>
      {error ? <p className="help-request-error" role="alert">{error}</p> : null}
      <div className="help-request-actions"><button type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as Step)} disabled={step === 1 || sending} className="help-request-back"><ArrowLeft aria-hidden="true" size={18} />Wstecz</button>{step < 6 ? <button type="button" onClick={next} className="help-request-next">Dalej <ArrowRight aria-hidden="true" size={18} /></button> : <button type="button" onClick={submit} disabled={sending} className="help-request-next" aria-busy={sending}><Send aria-hidden="true" size={18} />{sending ? "Przekazuję…" : "Wyślij zgłoszenie"}</button>}</div>
      <p className="help-request-footer-note"><MapPin aria-hidden="true" size={15} />Prywatne zgłoszenie · nie publikujemy treści ani dokładnej lokalizacji.</p>
    </section>
  );
}
