"use client";

import Link from "next/link";
import { Flag, LockKeyhole, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import {
  buildPlaceUpdateDescription,
  placeUpdateAssessmentOptions,
  type PlaceUpdateAssessment,
} from "@/lib/submissions/place-update-assessment";
import type {
  PlaceUpdateSubmission,
  PlaceUpdateType,
  SubmissionProtectionFields,
  SubmitterContact,
} from "@/types/submissions";

export type PlaceUpdateContext = {
  id: string;
  slug: string;
  name: string;
  address: string;
  href: string;
};

type UpdateErrors = Partial<
  Record<"placeReference" | "reportTypes" | "assessment" | "description" | "email", string>
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
  const [placeReference, setPlaceReference] = useState("");
  const [reportTypes, setReportTypes] = useState<PlaceUpdateType[]>([]);
  const [assessment, setAssessment] = useState<PlaceUpdateAssessment>();
  const [description, setDescription] = useState("");
  const [correctHours, setCorrectHours] = useState("");
  const [correctAddress, setCorrectAddress] = useState("");
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
  const successRef = useRef<HTMLDivElement>(null);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingRef.current) return;

    const nextErrors: UpdateErrors = {};

    if (!place && !placeReference.trim()) {
      nextErrors.placeReference = "Wpisz nazwę miejsca, którego dotyczy zgłoszenie.";
    }

    if (reportTypes.length === 0) {
      nextErrors.reportTypes = "Wybierz co najmniej jeden typ informacji.";
    }

    if (!assessment) {
      nextErrors.assessment = "Wybierz, czy informacja się zmieniła, jest niepewna czy nadal aktualna.";
    }

    const hasStructuredCorrection = Boolean(
      correctHours.trim() || correctAddress.trim() || correctPhone.trim() || closedSince,
    );
    if (assessment === "CHANGED" && !description.trim() && !hasStructuredCorrection) {
      nextErrors.description = "Napisz krótko, co się zmieniło, albo uzupełnij konkretne dane poniżej.";
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
          : nextErrors.assessment
            ? "update-assessment-changed"
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
      description: buildPlaceUpdateDescription(assessment!, description),
      proposedData: {
        hours: assessment === "CHANGED" ? correctHours.trim() : "",
        address: assessment === "CHANGED" ? correctAddress.trim() : "",
        phone: assessment === "CHANGED" ? correctPhone.trim() : "",
        closedSince: assessment === "CHANGED" ? closedSince : "",
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
      const response = await fetch("/api/submissions/place-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextSubmission,
          requestId,
          protection,
        }),
      });

      if (!response.ok) throw new Error("Submission failed");
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
          title="Dziękujemy za zgłoszenie"
          actions={
            <>
              {place ? <SuccessLink href={place.href} primary>Wróć do miejsca</SuccessLink> : null}
              <SuccessLink href="/szukaj" primary={!place}>Wróć do wyszukiwania</SuccessLink>
            </>
          }
        >
          <p>
            Twoja informacja trafiła do weryfikacji. Nie zmieniamy danych automatycznie.
            Najpierw sprawdzi je administrator Mapy Dobra.
          </p>
        </FormSuccess>
      </div>
    );
  }

  const descriptionCopy = assessment === "CURRENT"
    ? {
        title: "Chcesz coś dodać?",
        description: "Opcjonalnie dopisz, jak sprawdziłeś tę informację.",
        label: "Dodatkowa informacja",
        placeholder: "Np. sprawdzone telefonicznie dzisiaj.",
      }
    : assessment === "UNCERTAIN"
      ? {
          title: "Co warto sprawdzić?",
          description: "Opis jest opcjonalny. Nie musisz zgadywać, jaka jest prawidłowa wersja.",
          label: "Co wzbudziło Twoją wątpliwość?",
          placeholder: "Np. na drzwiach była inna godzina niż na stronie.",
        }
      : {
          title: "Co się zmieniło?",
          description: "Podaj tylko to, co wiesz. Jeśli uzupełnisz konkretne dane poniżej, opis nie jest wymagany.",
          label: "Krótki opis zmiany",
          placeholder: "Np. punkt działa teraz krócej niż podano na stronie.",
        };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Flag aria-hidden="true" size={23} />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">Zgłoś zmianę</h1>
        <p className="max-w-2xl text-base font-semibold leading-7 text-muted-foreground">
          Wskaż, co jest nieaktualne albo co warto sprawdzić. Nie musisz znać wszystkich szczegółów.
        </p>
      </header>

      <form
        className="min-w-0 divide-y divide-border rounded-xl border border-border bg-surface px-4 shadow-[0_16px_40px_rgb(17_24_39_/_6%)] sm:px-6"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="py-4 sm:py-6">
          {place ? (
            <section className="rounded-lg border border-brand bg-brand-soft p-3" aria-label="Miejsce, którego dotyczy zgłoszenie">
              <p className="text-xs font-extrabold uppercase text-brand-strong">Dotyczy</p>
              <p className="mt-0.5 text-base font-extrabold leading-tight text-foreground sm:text-lg">{place.name}</p>
              <p className="mt-0.5 flex items-start gap-1.5 text-sm font-semibold leading-5 text-muted-foreground">
                <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                {place.address}
              </p>
            </section>
          ) : (
            <FormField
              id="update-place-reference"
              label="Jakiego miejsca dotyczy zgłoszenie?"
              hint={requestedPlace ? "Nie znaleźliśmy wskazanego miejsca. Wpisz jego nazwę lub adres." : "Nie wskazano miejsca. Wpisz nazwę lub adres, abyśmy mogli je odnaleźć."}
              error={errors.placeReference}
              required
            >
              <input
                id="update-place-reference"
                name="placeReference"
                value={placeReference}
                onChange={(event) => {
                  setPlaceReference(event.target.value);
                  if (errors.placeReference) setErrors((current) => ({ ...current, placeReference: undefined }));
                }}
                className={formControlClass}
                aria-invalid={Boolean(errors.placeReference)}
                aria-describedby={fieldDescriptionIds("update-place-reference", "hint", errors.placeReference)}
                autoComplete="off"
              />
            </FormField>
          )}
        </div>

        <FormSection title="Czego dotyczy problem?" description="Wybierz jedną lub kilka informacji." compact className="py-4 sm:py-6">
          <fieldset aria-describedby={errors.reportTypes ? "update-report-types-error" : undefined}>
            <legend className="sr-only">Typ informacji</legend>
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
                          if (errors.reportTypes) setErrors((current) => ({ ...current, reportTypes: undefined }));
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

        <FormSection title="Jaki jest stan tej informacji?" description="Wybierz jedną odpowiedź. To wystarczy, żebyśmy wiedzieli, jak potraktować zgłoszenie." compact className="py-4 sm:py-6">
          <fieldset aria-describedby={errors.assessment ? "update-assessment-error" : undefined}>
            <legend className="sr-only">Stan informacji</legend>
            <div className="grid min-w-0 gap-2">
              {placeUpdateAssessmentOptions.map((option) => (
                <div key={option.value}>
                  <OptionCard
                    type="radio"
                    id={`update-assessment-${option.value.toLocaleLowerCase("pl-PL")}`}
                    name="assessment"
                    value={option.value}
                    label={option.label}
                    checked={assessment === option.value}
                    onChange={() => {
                      setAssessment(option.value);
                      if (errors.assessment) setErrors((current) => ({ ...current, assessment: undefined }));
                    }}
                  />
                  <p className="ml-3 mt-1 text-xs font-semibold leading-5 text-muted-foreground">{option.hint}</p>
                </div>
              ))}
            </div>
            <FormError id="update-assessment-error">{errors.assessment}</FormError>
          </fieldset>
        </FormSection>

        {assessment ? (
          <FormSection title={descriptionCopy.title} description={descriptionCopy.description} className="py-5 sm:py-6">
            <FormField id="update-description" label={descriptionCopy.label} error={errors.description} required={assessment === "CHANGED"}>
              <textarea
                id="update-description"
                name="description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (errors.description) setErrors((current) => ({ ...current, description: undefined }));
                }}
                className={`${formControlClass} min-h-24 resize-y`}
                placeholder={descriptionCopy.placeholder}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={fieldDescriptionIds("update-description", undefined, errors.description)}
              />
            </FormField>

            {assessment === "CHANGED" && reportTypes.some((type) => ["hours", "address", "phone", "temporary-closure", "permanent-closure"].includes(type)) ? (
              <div className="grid min-w-0 gap-4 rounded-lg border border-border bg-background p-3.5 sm:grid-cols-2">
                {reportTypes.includes("hours") ? (
                  <FormField id="update-correct-hours" label="Prawidłowe godziny — jeśli wiesz">
                    <input id="update-correct-hours" value={correctHours} onChange={(event) => setCorrectHours(event.target.value)} className={formControlClass} placeholder="Np. pon.–pt. 12:00–16:00" />
                  </FormField>
                ) : null}
                {reportTypes.includes("address") ? (
                  <FormField id="update-correct-address" label="Prawidłowy adres — jeśli wiesz">
                    <input id="update-correct-address" value={correctAddress} onChange={(event) => setCorrectAddress(event.target.value)} className={formControlClass} autoComplete="street-address" />
                  </FormField>
                ) : null}
                {reportTypes.includes("phone") ? (
                  <FormField id="update-correct-phone" label="Prawidłowy telefon — jeśli wiesz">
                    <input id="update-correct-phone" value={correctPhone} onChange={(event) => setCorrectPhone(event.target.value)} className={formControlClass} inputMode="tel" autoComplete="tel" />
                  </FormField>
                ) : null}
                {reportTypes.some((type) => ["temporary-closure", "permanent-closure"].includes(type)) ? (
                  <FormField id="update-closed-since" label="Od kiedy? — jeśli wiesz">
                    <input id="update-closed-since" type="date" value={closedSince} onChange={(event) => setClosedSince(event.target.value)} className={formControlClass} />
                  </FormField>
                ) : null}
              </div>
            ) : null}
          </FormSection>
        ) : null}

        <FormSection title="Skąd masz tę informację?" description="Opcjonalnie. Źródło może przyspieszyć weryfikację." compact className="py-4 sm:py-6">
          <fieldset>
            <legend className="sr-only">Źródło informacji</legend>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {updateSourceOptions.map((option) => (
                <OptionCard key={option.value} type="radio" name="sourceType" value={option.value} label={option.label} checked={sourceType === option.value} onChange={() => setSourceType(option.value)} />
              ))}
            </div>
          </fieldset>
          <FormField id="update-source-url" label="Link do źródła" hint="Opcjonalnie">
            <input id="update-source-url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className={formControlClass} placeholder="https://" inputMode="url" />
          </FormField>
        </FormSection>

        <FormSection title="Kontakt do Ciebie — opcjonalnie" description="Nie musisz podawać swoich danych. Kontakt pomaga tylko wtedy, gdy administrator musi dopytać o szczegóły." compact className="py-4 sm:py-6">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <FormField id="update-contact-name" label="Imię">
              <input id="update-contact-name" value={contact.name} onChange={(event) => updateContact("name", event.target.value)} className={formControlClass} autoComplete="name" />
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
                aria-describedby={fieldDescriptionIds("update-contact-email", undefined, errors.email)}
              />
            </FormField>
            <FormField id="update-contact-phone" label="Telefon">
              <input id="update-contact-phone" value={contact.phone} onChange={(event) => updateContact("phone", event.target.value)} className={formControlClass} autoComplete="tel" inputMode="tel" />
            </FormField>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-surface-muted px-3.5 py-3 text-sm font-semibold leading-5 text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={18} />
            <p>Nie publikujemy Twoich danych kontaktowych na stronie miejsca.</p>
          </div>

          <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="update-contact-website">Strona kontaktowa</label>
            <input
              id="update-contact-website"
              name="contactWebsite"
              value={protection.contactWebsite}
              onChange={(event) => setProtection({ contactWebsite: event.target.value })}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </FormSection>

        <div className="py-5 sm:py-6">
          {submitError ? <p className="mb-3 text-sm font-bold leading-5 text-urgent" role="alert">{submitError}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href={place?.href ?? "/szukaj"} className="touch-target inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-extrabold text-muted-foreground hover:bg-surface-muted hover:text-foreground">Anuluj</Link>
            <button type="submit" className="touch-target inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-base font-extrabold text-foreground shadow-sm transition hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? "Wysyłanie…" : "Wyślij zgłoszenie"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
