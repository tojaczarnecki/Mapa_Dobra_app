"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Flag, LockKeyhole, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormDraftResume, FormDraftSavedStatus } from "@/components/forms/form-draft-ui";
import { LocationAutocomplete, formatLocationSuggestion } from "@/components/location/location-autocomplete";
import { PUBLIC_GEOGRAPHIC_CONTEXT } from "@/lib/geocoding/geographic-context";
import type { GeocodingSuggestion } from "@/lib/geocoding/results";
import { useFormDraft } from "@/components/forms/use-form-draft";
import { useUnsavedChangesGuard } from "@/components/forms/use-unsaved-changes-guard";
import { useTurnstileToken } from "@/components/security/turnstile-token";
import {
  createSubmissionRequestId,
  fieldDescriptionIds,
  FormError,
  FormField,
  FormSection,
  FormSuccess,
  formControlClass,
  MultiSelectOption,
  OptionCard,
  SuccessLink,
} from "./form-ui";
import { updateSourceOptions, updateTypeGroups } from "./submission-options";
import type {
  PlaceUpdateSubmission,
  PlaceUpdateType,
  SubmissionProtectionFields,
  SubmitterContact,
} from "@/types/submissions";

const LocationMap = dynamic(
  () => import("@/components/help-requests/help-request-location-map").then((module) => module.HelpRequestLocationMap),
  { ssr: false },
);

export type PlaceUpdateContext = {
  id: string;
  slug: string;
  name: string;
  address: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  hours?: string;
  phone?: string;
  email?: string;
  website?: string;
  categories?: string;
  requirements?: string;
  accessibility?: string;
  accommodation?: string;
  description?: string;
  href: string;
};

type UpdateErrors = Partial<
  Record<"placeReference" | "reportTypes" | "description" | "email", string>
>;

const emptyContact: SubmitterContact = { name: "", email: "", phone: "" };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function PlaceUpdateForm({
  place,
  requestedPlace,
}: {
  place?: PlaceUpdateContext;
  requestedPlace?: string;
}) {
  const turnstile = useTurnstileToken();
  const [placeReference, setPlaceReference] = useState("");
  const [reportTypes, setReportTypes] = useState<PlaceUpdateType[]>([]);
  const [description, setDescription] = useState("");
  const [correctHours, setCorrectHours] = useState(place?.hours === "Brak potwierdzonych godzin" ? "" : place?.hours ?? "");
  const [correctAddress, setCorrectAddress] = useState("");
  const [correctAddressText, setCorrectAddressText] = useState("");
  const [correctLatitude, setCorrectLatitude] = useState<number>();
  const [correctLongitude, setCorrectLongitude] = useState<number>();
  const [correctPhone, setCorrectPhone] = useState("");
  const [closedSince, setClosedSince] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [contact, setContact] = useState<SubmitterContact>(emptyContact);
  const [protection, setProtection] = useState<SubmissionProtectionFields>({
    contactWebsite: "",
  });
  const [errors, setErrors] = useState<UpdateErrors>({});
  const [submission, setSubmission] = useState<PlaceUpdateSubmission>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const isSubmittingRef = useRef(false);
  const requestIdRef = useRef<string | undefined>(undefined);
  const [formStartedAt] = useState(() => Date.now());
  const successRef = useRef<HTMLDivElement>(null);
  const formDraft = useFormDraft({ formType: "place-change", storage: "local", ttlMs: 7 * 24 * 60 * 60 * 1000, entityId: place?.id ?? requestedPlace, data: { placeReference, reportTypes, description, correctHours, correctAddress, correctAddressText, correctLatitude, correctLongitude, correctPhone, closedSince, sourceType, sourceUrl, contact }, enabled: !submission });
  useUnsavedChangesGuard(!submission && formDraft.isDirty);

  useEffect(() => {
    if (submission) {
      successRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [submission]);

  function updateContact(field: keyof SubmitterContact, value: string) {
    setContact((current) => ({ ...current, [field]: value }));
    if (field === "email" && errors.email) {
      setErrors((current) => ({ ...current, email: undefined }));
    }
  }

  function handleAddressChange(value: string) {
    setCorrectAddressText(value);
    setCorrectAddress(value);
    setCorrectLatitude(undefined);
    setCorrectLongitude(undefined);
  }

  function handleAddressSelect(suggestion: GeocodingSuggestion) {
    const formatted = formatLocationSuggestion(suggestion).value;
    setCorrectAddressText(formatted);
    setCorrectAddress(formatted);
    setCorrectLatitude(suggestion.latitude);
    setCorrectLongitude(suggestion.longitude);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const nextErrors: UpdateErrors = {};

    if (!place && !placeReference.trim()) {
      nextErrors.placeReference = "Wpisz nazwę miejsca, którego dotyczy zgłoszenie.";
    }

    if (reportTypes.length === 0) {
      nextErrors.reportTypes = "Wybierz co najmniej jeden typ zgłoszenia.";
    }

    if (!description.trim()) {
      nextErrors.description = "Opisz, co powinno zostać zmienione.";
    }

    if (contact.email.trim() && !emailPattern.test(contact.email.trim())) {
      nextErrors.email = "Podaj prawidłowy adres e-mail albo pozostaw pole puste.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError(undefined);
      const firstErrorId = nextErrors.placeReference
        ? "update-place-reference"
        : nextErrors.reportTypes
          ? "update-type-hours"
          : nextErrors.description
            ? "update-description"
            : "update-contact-email";
      requestAnimationFrame(() => document.getElementById(firstErrorId)?.focus());
      return;
    }

    const nextSubmission: PlaceUpdateSubmission = {
      submissionType: "PLACE_UPDATE",
      createdAt: new Date().toISOString(),
      status: "PENDING",
      placeId: place?.id,
      placeSlug: place?.slug,
      placeReference: place?.name ?? placeReference.trim(),
      reportTypes,
      description: description.trim(),
        proposedData: {
          hours: correctHours.trim(),
          address: correctAddress.trim(),
          latitude: correctLatitude,
          longitude: correctLongitude,
        phone: correctPhone.trim(),
        closedSince,
      },
      source: { type: sourceType, url: sourceUrl.trim() },
      submitterContact: {
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
      },
    };

    const requestId = requestIdRef.current ?? createSubmissionRequestId();
    requestIdRef.current = requestId;
    setErrors({});
    setSubmitError(undefined);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const turnstileToken = await turnstile.requestToken();
      const response = await fetch("/api/submissions/place-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextSubmission,
        formStartedAt,
          requestId,
          protection,
          turnstileToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      formDraft.clear();
      setSubmission(nextSubmission);
    } catch {
      setSubmitError("Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (submission) {
    return (
      <div ref={successRef} tabIndex={-1}>
        <FormSuccess
          title="Dziękujemy. Zgłoszenie zmiany zostało wysłane do weryfikacji."
          actions={
            <>
              {place ? (
                <SuccessLink href={place.href} primary>
                  Wróć do miejsca
                </SuccessLink>
              ) : null}
              <SuccessLink href="/szukaj" primary={!place}>
                Wróć do wyszukiwania
              </SuccessLink>
            </>
          }
        >
          <p>
            Dane publiczne nie zmienią się automatycznie. Najpierw sprawdzi je
            administrator Mapy Dobra.
          </p>
        </FormSuccess>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Flag aria-hidden="true" size={23} />
        </div>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          Zgłoś zmianę
        </h1>
        <p className="max-w-2xl text-base font-semibold leading-7 text-muted-foreground">
          Wskaż tylko to, co jest nieaktualne. Nie musisz przepisywać całej informacji o miejscu.
        </p>
      </header>

      <FormDraftResume draft={formDraft.storedDraft} label={place ? `Zgłoś zmianę dla: ${place.name}` : "Zgłoś zmianę lub błąd"} onResume={() => { const restored = formDraft.resume(); if (restored) { const data = restored.data; setPlaceReference(data.placeReference); setReportTypes(data.reportTypes); setDescription(data.description); setCorrectHours(data.correctHours); setCorrectAddress(data.correctAddress); setCorrectAddressText(data.correctAddressText ?? data.correctAddress); setCorrectLatitude(data.correctLatitude); setCorrectLongitude(data.correctLongitude); setCorrectPhone(data.correctPhone); setClosedSince(data.closedSince); setSourceType(data.sourceType); setSourceUrl(data.sourceUrl); setContact(data.contact); } }} onDiscard={() => { formDraft.discard(); setPlaceReference(""); setReportTypes([]); setDescription(""); setCorrectHours(""); setCorrectAddress(""); setCorrectAddressText(""); setCorrectLatitude(undefined); setCorrectLongitude(undefined); setCorrectPhone(""); setClosedSince(""); setSourceType(""); setSourceUrl(""); setContact(emptyContact); }} />
      <FormDraftSavedStatus saved={formDraft.lastSaved} />

      <form
        className="min-w-0 space-y-8"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="py-4 sm:py-6">
          {place ? (
            <section
              className="rounded-lg border border-brand bg-brand-soft p-3"
              aria-label="Miejsce, którego dotyczy zgłoszenie"
            >
              <p className="text-xs font-extrabold uppercase text-brand-strong">Dotyczy</p>
              <p className="mt-0.5 text-base font-extrabold leading-tight text-foreground sm:text-lg">
                {place.name}
              </p>
              <p className="mt-0.5 flex items-start gap-1.5 text-sm font-semibold leading-5 text-muted-foreground">
                <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                {place.address}
              </p>
              {place.category ? <p className="mt-1 text-sm font-semibold text-muted-foreground">{place.category}</p> : null}
            </section>
          ) : (
            <FormField
              id="update-place-reference"
              label="Jakiego miejsca dotyczy zgłoszenie?"
              hint={
                requestedPlace
                  ? "Nie znaleźliśmy wskazanego miejsca. Wpisz jego nazwę lub adres."
                  : "Nie wskazano miejsca. Wpisz nazwę lub adres, abyśmy mogli je odnaleźć."
              }
              error={errors.placeReference}
              required
            >
              <input
                id="update-place-reference"
                name="placeReference"
                value={placeReference}
                onChange={(event) => {
                  setPlaceReference(event.target.value);
                  if (errors.placeReference) {
                    setErrors((current) => ({ ...current, placeReference: undefined }));
                  }
                }}
                className={formControlClass}
                aria-invalid={Boolean(errors.placeReference)}
                aria-describedby={fieldDescriptionIds(
                  "update-place-reference",
                  "hint",
                  errors.placeReference,
                )}
                autoComplete="off"
              />
            </FormField>
          )}
        </div>

        <FormSection
          title="Co chcesz zgłosić?"
          description="Możesz wybrać kilka rodzajów zmian."
          compact
          className="py-4 sm:py-6"
        >
          <fieldset
            aria-describedby={errors.reportTypes ? "update-report-types-error" : undefined}
          >
            <legend className="sr-only">Typ zgłoszenia</legend>
            <div className="space-y-3">
              {updateTypeGroups.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <p className="text-sm font-extrabold text-muted-foreground">{group.label}</p>
                  <div className="grid min-w-0 gap-1.5 sm:grid-cols-2 sm:gap-2">
                    {group.options.map((option) => (
                      <MultiSelectOption
                        key={option.value}
                        id={`update-type-${option.value}`}
                        name="reportTypes"
                        value={option.value}
                        label={option.label}
                        compact
                        checked={reportTypes.includes(option.value)}
                        onChange={() => {
                          setReportTypes((current) => toggleValue(current, option.value));
                          if (errors.reportTypes) {
                            setErrors((current) => ({ ...current, reportTypes: undefined }));
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <FormError id="update-report-types-error">{errors.reportTypes}</FormError>
          </fieldset>
        </FormSection>

        <FormSection
          title="Co powinno zostać poprawione?"
          description="Opisz zmianę możliwie konkretnie."
          className="py-5 sm:py-6"
        >
          <FormField
            id="update-description"
            label="Opis zmiany"
            error={errors.description}
            required
          >
            <textarea
              id="update-description"
              name="description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                if (errors.description) {
                  setErrors((current) => ({ ...current, description: undefined }));
                }
              }}
              className={`${formControlClass} min-h-32 resize-y`}
              placeholder="Np. punkt jest teraz otwarty od 12:00 do 16:00, a nie do 18:00."
              aria-invalid={Boolean(errors.description)}
              aria-describedby={fieldDescriptionIds(
                "update-description",
                undefined,
                errors.description,
              )}
            />
          </FormField>

          {reportTypes.some((type) => ["hours", "address", "phone", "temporary-closure", "permanent-closure"].includes(type)) ? (
            <div className="grid min-w-0 gap-4 rounded-lg border border-border bg-background p-3.5 sm:grid-cols-2">
              {reportTypes.includes("hours") ? (
                <FormField id="update-correct-hours" label="Jakie są prawidłowe godziny?" hint={place?.hours ? `Obecnie: ${place.hours}` : undefined}>
                  <input
                    id="update-correct-hours"
                    value={correctHours}
                    onChange={(event) => setCorrectHours(event.target.value)}
                    className={formControlClass}
                    placeholder="Np. pon.–pt. 12:00–16:00"
                  />
                </FormField>
              ) : null}
              {reportTypes.includes("address") ? (
                <FormField id="update-correct-address" label="Nowy adres">
                  <LocationAutocomplete
                    value={correctAddressText || correctAddress}
                    onChange={handleAddressChange}
                    onSelect={handleAddressSelect}
                    geographicContext={PUBLIC_GEOGRAPHIC_CONTEXT}
                    placeholder="Zacznij wpisywać ulicę lub adres"
                  />
                </FormField>
              ) : null}
              {reportTypes.includes("phone") ? (
                <FormField id="update-correct-phone" label="Nowy numer telefonu" hint={place?.phone ? `Obecnie: ${place.phone}` : undefined}>
                  <input
                    id="update-correct-phone"
                    value={correctPhone}
                    onChange={(event) => setCorrectPhone(event.target.value)}
                    className={formControlClass}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </FormField>
              ) : null}
              {reportTypes.some((type) => ["temporary-closure", "permanent-closure"].includes(type)) ? (
                <FormField id="update-closed-since" label="Od kiedy?" hint="Opcjonalnie">
                  <input
                    id="update-closed-since"
                    type="date"
                    value={closedSince}
                    onChange={(event) => setClosedSince(event.target.value)}
                    className={formControlClass}
                  />
                </FormField>
              ) : null}
            </div>
          ) : null}

          {reportTypes.includes("address") ? (
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
              {place?.latitude !== undefined && place.longitude !== undefined ? (
                <div className="space-y-2">
                  <p className="text-sm font-extrabold text-muted-foreground">Obecny punkt</p>
                  <LocationMap position={[place.latitude, place.longitude]} onPick={() => undefined} geographicContext={PUBLIC_GEOGRAPHIC_CONTEXT} precision="address" />
                </div>
              ) : null}
              {correctLatitude !== undefined && correctLongitude !== undefined ? (
                <div className="space-y-2">
                  <p className="text-sm font-extrabold text-muted-foreground">Nowy punkt</p>
                  <LocationMap
                    position={[correctLatitude, correctLongitude]}
                    onPick={([latitude, longitude]) => { setCorrectLatitude(latitude); setCorrectLongitude(longitude); }}
                    geographicContext={PUBLIC_GEOGRAPHIC_CONTEXT}
                    precision="address"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </FormSection>

        <FormSection
          title="Skąd masz tę informację?"
          description="To pytanie jest opcjonalne, ale może ułatwić weryfikację."
          className="py-5 sm:py-6"
        >
          <fieldset>
            <legend className="sr-only">Źródło informacji</legend>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {updateSourceOptions.map((option) => (
                <OptionCard
                  key={option.value}
                  type="radio"
                  name="sourceType"
                  value={option.value}
                  label={option.label}
                  checked={sourceType === option.value}
                  onChange={() => setSourceType(option.value)}
                />
              ))}
            </div>
          </fieldset>
          <FormField id="update-source-url" label="Link do źródła" hint="Opcjonalnie">
            <input
              id="update-source-url"
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              className={formControlClass}
              placeholder="https://"
              inputMode="url"
            />
          </FormField>
        </FormSection>

        {reportTypes.length > 0 ? (
          <FormSection title="Podsumowanie zmiany" description="Takie informacje trafią do weryfikacji." className="py-5 sm:py-6">
            <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
              {reportTypes.includes("address") ? <div className="grid gap-1 px-3.5 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-sm font-bold text-muted-foreground">Adres</dt><dd className="whitespace-pre-line text-sm font-semibold"><strong>BYŁO:</strong> {place?.address ?? "Nie podano"}{"\n"}<strong>NOWA INFORMACJA:</strong> {correctAddress || "Nie podano"}</dd></div> : null}
              {reportTypes.includes("hours") ? <div className="grid gap-1 px-3.5 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-sm font-bold text-muted-foreground">Godziny</dt><dd className="whitespace-pre-line text-sm font-semibold"><strong>BYŁO:</strong> {place?.hours ?? "Nie podano"}{"\n"}<strong>NOWE:</strong> {correctHours || "Nie podano"}</dd></div> : null}
              {reportTypes.includes("phone") ? <div className="grid gap-1 px-3.5 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-sm font-bold text-muted-foreground">Telefon</dt><dd className="whitespace-pre-line text-sm font-semibold"><strong>BYŁO:</strong> {place?.phone ?? "Nie podano"}{"\n"}<strong>NOWY:</strong> {correctPhone || "Nie podano"}</dd></div> : null}
              {reportTypes.some((type) => ["help-scope", "requirements", "other", "temporary-closure", "permanent-closure"].includes(type)) ? <div className="grid gap-1 px-3.5 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-sm font-bold text-muted-foreground">Opis</dt><dd className="text-sm font-semibold">{description || "Nie podano"}</dd></div> : null}
            </dl>
          </FormSection>
        ) : null}

        <FormSection
          title="Kontakt do Ciebie – opcjonalnie"
          description="Nie musisz podawać swoich danych. Jeśli zostawisz kontakt, administrator Mapy Dobra może dopytać o szczegóły."
          className="py-5 sm:py-6"
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <FormField id="update-contact-name" label="Imię">
              <input
                id="update-contact-name"
                value={contact.name}
                onChange={(event) => updateContact("name", event.target.value)}
                className={formControlClass}
                autoComplete="name"
              />
            </FormField>
            <FormField id="update-contact-email" label="E-mail" error={errors.email}>
              <input
                id="update-contact-email"
                type="email"
                value={contact.email}
                onChange={(event) => updateContact("email", event.target.value)}
                className={formControlClass}
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={fieldDescriptionIds(
                  "update-contact-email",
                  undefined,
                  errors.email,
                )}
              />
            </FormField>
            <FormField id="update-contact-phone" label="Telefon">
              <input
                id="update-contact-phone"
                value={contact.phone}
                onChange={(event) => updateContact("phone", event.target.value)}
                className={formControlClass}
                autoComplete="tel"
                inputMode="tel"
              />
            </FormField>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-surface-muted px-3.5 py-3 text-sm font-semibold leading-5 text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={18} />
            <p>
              Nie publikujemy Twoich danych kontaktowych na stronie miejsca.
              Miejsce na link do polityki prywatności zostanie uzupełnione przed
              uruchomieniem właściwej wysyłki.
            </p>
          </div>

          <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="update-contact-website">Strona kontaktowa</label>
            <input
              id="update-contact-website"
              name="contactWebsite"
              value={protection.contactWebsite}
              onChange={(event) =>
                setProtection({ contactWebsite: event.target.value })
              }
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </FormSection>

        <div className="py-5 sm:py-6">
          {submitError ? (
            <p className="mb-3 text-sm font-bold leading-5 text-urgent" role="alert">
              {submitError}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={place?.href ?? "/szukaj"}
              className="touch-target inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-extrabold text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              Anuluj
            </Link>
            <button
              type="submit"
              className="touch-target inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-base font-extrabold text-foreground shadow-sm transition hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Wysyłanie…" : "Wyślij zgłoszenie"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
