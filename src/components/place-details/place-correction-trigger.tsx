"use client";

import { Check, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocationAutocomplete, formatLocationSuggestion } from "@/components/location/location-autocomplete";
import { PUBLIC_GEOGRAPHIC_CONTEXT } from "@/lib/geocoding/geographic-context";
import type { GeocodingSuggestion } from "@/lib/geocoding/results";
import { createSubmissionRequestId } from "@/components/submissions/form-ui";
import { FormDraftResume, FormDraftSavedStatus } from "@/components/forms/form-draft-ui";
import { useFormDraft } from "@/components/forms/use-form-draft";
import { useUnsavedChangesGuard } from "@/components/forms/use-unsaved-changes-guard";
import { useTurnstileToken } from "@/components/security/turnstile-token";
import { contextualCorrectionLabels, type ContextualCorrectionField } from "@/lib/submissions/contextual-correction";
import styles from "./place-correction-trigger.module.css";

type PlaceCorrectionTriggerProps = {
  placeId: string;
  field: ContextualCorrectionField;
  currentValue: string;
  latitude?: number;
  longitude?: number;
  className?: string;
  compact?: boolean;
  autoOpen?: boolean;
};

function editorKind(field: ContextualCorrectionField) {
  return field === "address" ? "address" : ["hours", "categories", "requirements", "accommodation", "accessibility", "description", "closure", "other"].includes(field) ? "textarea" : "input";
}

export function PlaceCorrectionTrigger({ placeId, field, currentValue, latitude, longitude, className = "", compact = true, autoOpen = false }: PlaceCorrectionTriggerProps) {
  const [open, setOpen] = useState(autoOpen);
  const [submitted, setSubmitted] = useState(false);
  const [value, setValue] = useState(currentValue);
  const [addressText, setAddressText] = useState(currentValue);
  const [nextLatitude, setNextLatitude] = useState<number | undefined>(latitude);
  const [nextLongitude, setNextLongitude] = useState<number | undefined>(longitude);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const turnstile = useTurnstileToken();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formStartedAtRef = useRef<number>(0);
  const formDraft = useFormDraft({ formType: "place-correction", storage: "local", ttlMs: 7 * 24 * 60 * 60 * 1000, entityId: `${placeId}:${field}`, data: { value, comment }, enabled: open && !submitted });
  useUnsavedChangesGuard(open && !busy && formDraft.isDirty);

  useEffect(() => {
    if (autoOpen) formStartedAtRef.current = Date.now();
  }, [autoOpen]);

  const requestClose = useCallback(() => {
    if (!busy && formDraft.isDirty) {
      setConfirmClose(true);
      return;
    }
    if (!busy) setOpen(false);
  }, [busy, formDraft.isDirty]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const first = dialogRef.current?.querySelector<HTMLElement>("input, textarea, button");
    first?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [busy, open, requestClose]);

  function openEditor() {
    setValue(currentValue);
    setAddressText(currentValue);
    setNextLatitude(latitude);
    setNextLongitude(longitude);
    setComment("");
    setError("");
    setSubmitted(false);
    setConfirmClose(false);
    formStartedAtRef.current = Date.now();
    setOpen(true);
  }

  function handleAddressChange(next: string) {
    setAddressText(next);
    setValue(next);
    setNextLatitude(undefined);
    setNextLongitude(undefined);
  }

  function handleAddressSelect(suggestion: GeocodingSuggestion) {
    const formatted = formatLocationSuggestion(suggestion).value;
    setAddressText(formatted);
    setValue(formatted);
    setNextLatitude(suggestion.latitude);
    setNextLongitude(suggestion.longitude);
  }

  async function submit() {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const turnstileToken = await turnstile.requestToken();
      const response = await fetch("/api/submissions/place-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: createSubmissionRequestId(),
          placeId,
          field,
          proposedValue: value.trim(),
          comment: comment.trim(),
          formStartedAt: formStartedAtRef.current,
          latitude: nextLatitude,
          longitude: nextLongitude,
          protection: { contactWebsite: "" },
          turnstileToken,
        }),
      });
      if (!response.ok) throw new Error("SUBMISSION_FAILED");
      setOpen(false);
      setSubmitted(true);
    } catch {
      setError("Nie udało się wysłać zmiany. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger}${compact ? ` ${styles.triggerCompact}` : ""} ${className}`}
        onClick={openEditor}
        aria-label={`Zgłoś zmianę: ${contextualCorrectionLabels[field]}`}
        title={submitted ? "Zgłoszono zmianę" : `Zgłoś zmianę: ${contextualCorrectionLabels[field]}`}
        aria-haspopup="dialog"
      >
        {submitted ? <Check aria-hidden="true" size={15} /> : <Pencil aria-hidden="true" size={15} />}
        {compact ? null : submitted ? "Zgłoszono" : "Zgłoś zmianę"}
      </button>
      {open ? (
        <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) requestClose(); }}>
          <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={`correction-title-${field}`}>
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-strong">Korekta informacji</p>
                <h2 id={`correction-title-${field}`} className="mt-1 text-xl font-bold text-foreground">{field === "closure" ? "Zgłoś, że miejsce nie działa" : `Popraw: ${contextualCorrectionLabels[field]}`}</h2>
              </div>
              <button type="button" className="touch-target rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground" onClick={requestClose} disabled={busy} aria-label="Zamknij edytor">
                <X aria-hidden="true" size={20} />
              </button>
            </header>
            <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-5 sm:px-6">
              <FormDraftResume draft={formDraft.storedDraft} label="Masz zapisany szkic tej korekty" onResume={() => { const restored = formDraft.resume(); if (restored) { setValue(restored.data.value); setComment(restored.data.comment); } }} onDiscard={formDraft.discard} />
              <FormDraftSavedStatus saved={formDraft.lastSaved} />
              <dl className="rounded-lg bg-surface-muted px-4 py-3 text-sm">
                <dt className="font-bold text-muted-foreground">Obecnie</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-foreground">{currentValue || "Brak danych"}</dd>
              </dl>
              <label className="mt-5 block text-sm font-bold text-foreground" htmlFor={`correction-value-${field}`}>{field === "closure" ? "Co wiesz o zamknięciu?" : "Nowa informacja"}</label>
              {editorKind(field) === "address" ? (
                <div className="mt-2"><LocationAutocomplete value={addressText} onChange={handleAddressChange} onSelect={handleAddressSelect} geographicContext={PUBLIC_GEOGRAPHIC_CONTEXT} placeholder="Wpisz poprawny adres" /></div>
              ) : editorKind(field) === "textarea" ? (
                <textarea id={`correction-value-${field}`} className="mt-2 min-h-28 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm leading-6" value={value} onChange={(event) => setValue(event.target.value)} maxLength={4000} />
              ) : (
                <input id={`correction-value-${field}`} className="mt-2 min-h-12 w-full rounded-lg border border-border bg-white px-3 text-sm" value={value} onChange={(event) => setValue(event.target.value)} maxLength={4000} />
              )}
              {field === "address" && nextLatitude !== undefined && nextLongitude !== undefined ? <p className="mt-2 text-xs text-muted-foreground">Zapisany zostanie także nowy punkt: {nextLatitude.toFixed(5)}, {nextLongitude.toFixed(5)}.</p> : null}
              <label className="mt-5 block text-sm font-bold text-foreground" htmlFor={`correction-comment-${field}`}>Skąd masz tę informację? <span className="font-normal text-muted-foreground">(opcjonalnie)</span></label>
              <textarea id={`correction-comment-${field}`} className="mt-2 min-h-20 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm leading-6" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="Np. byłem/am na miejscu lub rozmawiałem/am telefonicznie." />
              {error ? <p className="mt-3 text-sm font-semibold text-[#9a3412]" role="alert">{error}</p> : null}
              {confirmClose ? <div className="mt-4 rounded-lg border border-urgent/30 bg-urgent-soft/50 p-3 text-sm" role="alert"><p className="font-semibold">Masz niewysłaną zmianę.</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-md px-3 font-semibold text-muted-foreground hover:bg-white" onClick={() => setConfirmClose(false)}>Kontynuuj edycję</button><button type="button" className="min-h-11 rounded-md bg-white px-3 font-semibold text-[#9a3412]" onClick={() => { formDraft.discard(); setOpen(false); }}>Odrzuć zmianę</button></div></div> : null}
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              <button type="button" className="min-h-12 rounded-lg px-4 text-sm font-semibold text-muted-foreground hover:bg-surface-muted" onClick={requestClose} disabled={busy}>Anuluj</button>
              <button type="button" className="min-h-12 rounded-lg bg-brand px-5 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60" onClick={submit} disabled={busy || !value.trim()}>{busy ? "Wysyłanie…" : "Wyślij zmianę"}</button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
