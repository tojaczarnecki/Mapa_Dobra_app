"use client";

import Link from "next/link";
import { Info, LockKeyhole, MapPinned } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormDraftResume } from "@/components/forms/form-draft-ui";
import { useFormDraft } from "@/components/forms/use-form-draft";
import { useUnsavedChangesGuard } from "@/components/forms/use-unsaved-changes-guard";
import {
  createSubmissionRequestId,
  fieldDescriptionIds,
  FormError,
  FormField,
  FormSection,
  FormSuccess,
  formControlClass,
  formSelectClass,
  MultiSelectOption,
  OptionCard,
  StepActions,
  SubmissionStepper,
  SubmissionSummary,
  SuccessLink,
  type SummaryItem,
} from "./form-ui";
import {
  accessibilityOptions,
  accommodationAudienceOptions,
  conditionOptions,
  facilityTypeOptions,
  helpCategoryOptions,
  newPlaceSourceOptions,
} from "./submission-options";
import type {
  HelpCategory,
  NewPlaceSubmission,
  SubmissionProtectionFields,
  SubmitterContact,
} from "@/types/submissions";

type AccommodationDraft = {
  facilityType: string;
  audiences: string[];
  availabilityKnown: "yes" | "no" | "";
  freePlaces: string;
  availabilityUpdated: string;
  availabilityUpdatedOther: string;
  admissionHours: string;
  sobriety: string;
  animals: string;
  accessibility: string[];
};

type NewPlaceDraft = {
  name: string;
  organizationName: string;
  helpCategories: HelpCategory[];
  street: string;
  postalCode: string;
  city: string;
  district: string;
  placePhone: string;
  placeEmail: string;
  placeWebsite: string;
  openingHours: string;
  description: string;
  conditions: string[];
  accommodation: AccommodationDraft;
  sourceType: string;
  sourceUrl: string;
  submitterContact: SubmitterContact;
};

type StepId = "basic" | "location" | "help" | "accommodation" | "source" | "summary";
type FormErrors = Partial<
  Record<
    | "name"
    | "helpCategories"
    | "placeEmail"
    | "freePlaces"
    | "availabilityUpdated"
    | "submitterEmail",
    string
  >
>;

const initialAccommodation: AccommodationDraft = {
  facilityType: "",
  audiences: [],
  availabilityKnown: "",
  freePlaces: "",
  availabilityUpdated: "",
  availabilityUpdatedOther: "",
  admissionHours: "",
  sobriety: "",
  animals: "",
  accessibility: [],
};

const initialDraft: NewPlaceDraft = {
  name: "",
  organizationName: "",
  helpCategories: [],
  street: "",
  postalCode: "",
  city: "Łódź",
  district: "",
  placePhone: "",
  placeEmail: "",
  placeWebsite: "",
  openingHours: "",
  description: "",
  conditions: [],
  accommodation: initialAccommodation,
  sourceType: "",
  sourceUrl: "",
  submitterContact: { name: "", email: "", phone: "" },
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const stepLabels: Record<StepId, string> = {
  basic: "Podstawowe informacje",
  location: "Lokalizacja i kontakt",
  help: "Pomoc i warunki",
  accommodation: "Informacje o noclegu",
  source: "Źródło i kontakt",
  summary: "Podsumowanie",
};

const conditionOpposites: Record<string, string> = {
  "Bez skierowania": "Wymagane skierowanie",
  "Wymagane skierowanie": "Bez skierowania",
  "Dokument niewymagany": "Wymagany dokument",
  "Wymagany dokument": "Dokument niewymagany",
  "Ostatnie zameldowanie w Łodzi wymagane":
    "Ostatnie zameldowanie w Łodzi niewymagane",
  "Ostatnie zameldowanie w Łodzi niewymagane":
    "Ostatnie zameldowanie w Łodzi wymagane",
};

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function toggleExclusiveUnknown(values: string[], value: string) {
  if (value === "Nie wiem") {
    return values.includes(value) ? [] : [value];
  }

  return toggleValue(
    values.filter((item) => item !== "Nie wiem"),
    value,
  );
}

function categoryLabels(categories: HelpCategory[]) {
  return categories
    .map((value) => helpCategoryOptions.find((option) => option.value === value)?.label)
    .filter(Boolean)
    .join(", ");
}

function joinPresent(values: string[], separator = ", ") {
  return values.filter((value) => value.trim()).join(separator);
}

function draftDataWithoutContact(value: NewPlaceDraft): Omit<NewPlaceDraft, "submitterContact"> {
  const { submitterContact, ...safeData } = value;
  void submitterContact;
  return safeData;
}

export function NewPlaceForm() {
  const [draft, setDraft] = useState<NewPlaceDraft>(initialDraft);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [protection, setProtection] = useState<SubmissionProtectionFields>({
    contactWebsite: "",
  });
  const [submission, setSubmission] = useState<NewPlaceSubmission>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const isSubmittingRef = useRef(false);
  const requestIdRef = useRef<string | undefined>(undefined);
  const stepHeadingRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const includesAccommodation = draft.helpCategories.includes("accommodation");

  const steps = useMemo<Array<{ id: StepId; label: string }>>(
    () => [
      { id: "basic", label: stepLabels.basic },
      { id: "location", label: stepLabels.location },
      { id: "help", label: stepLabels.help },
      ...(includesAccommodation
        ? [{ id: "accommodation" as const, label: stepLabels.accommodation }]
        : []),
      { id: "source", label: stepLabels.source },
      { id: "summary", label: stepLabels.summary },
    ],
    [includesAccommodation],
  );

  const currentStep = steps[currentStepIndex] ?? steps[steps.length - 1];
  const formDraft = useFormDraft({ formType: "new-place", storage: "local", ttlMs: 7 * 24 * 60 * 60 * 1000, data: draftDataWithoutContact(draft), currentStep: currentStep.id, enabled: !submission });
  useUnsavedChangesGuard(!submission && formDraft.isDirty);

  useEffect(() => {
    if (submission) {
      successRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [submission]);

  function setField<K extends keyof NewPlaceDraft>(field: K, value: NewPlaceDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function setAccommodationField<K extends keyof AccommodationDraft>(
    field: K,
    value: AccommodationDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      accommodation: { ...current.accommodation, [field]: value },
    }));
  }

  function setSubmitterContact(field: keyof SubmitterContact, value: string) {
    setDraft((current) => ({
      ...current,
      submitterContact: { ...current.submitterContact, [field]: value },
    }));
    if (field === "email" && errors.submitterEmail) {
      setErrors((current) => ({ ...current, submitterEmail: undefined }));
    }
  }

  function focusStep() {
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
      stepHeadingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function goToStep(index: number) {
    setErrors({});
    setCurrentStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
    focusStep();
  }

  function validateStep(step: StepId) {
    const nextErrors: FormErrors = {};

    if (step === "basic") {
      if (!draft.name.trim()) nextErrors.name = "Wpisz nazwę miejsca.";
      if (draft.helpCategories.length === 0) {
        nextErrors.helpCategories = "Wybierz co najmniej jeden rodzaj pomocy.";
      }
    }

    if (
      step === "location" &&
      draft.placeEmail.trim() &&
      !emailPattern.test(draft.placeEmail.trim())
    ) {
      nextErrors.placeEmail = "Podaj prawidłowy adres e-mail albo pozostaw pole puste.";
    }

    if (step === "accommodation" && draft.accommodation.availabilityKnown === "yes") {
      if (draft.accommodation.freePlaces === "") {
        nextErrors.freePlaces = "Wpisz liczbę wolnych miejsc.";
      }
      if (!draft.accommodation.availabilityUpdated) {
        nextErrors.availabilityUpdated = "Wybierz, kiedy informacja była aktualna.";
      }
    }

    if (
      step === "source" &&
      draft.submitterContact.email.trim() &&
      !emailPattern.test(draft.submitterContact.email.trim())
    ) {
      nextErrors.submitterEmail =
        "Podaj prawidłowy adres e-mail albo pozostaw pole puste.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstErrorId = nextErrors.name
        ? "new-place-name"
        : nextErrors.helpCategories
          ? "new-place-category-food"
          : nextErrors.placeEmail
            ? "new-place-email"
            : nextErrors.freePlaces
              ? "new-place-free-places"
              : nextErrors.availabilityUpdated
                ? "new-place-availability-updated"
                : "new-place-submitter-email";
      requestAnimationFrame(() => document.getElementById(firstErrorId)?.focus());
      return false;
    }

    return true;
  }

  function goNext() {
    if (!validateStep(currentStep.id)) {
      return;
    }

    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
    focusStep();
  }

  function goBack() {
    setErrors({});
    setCurrentStepIndex((index) => Math.max(0, index - 1));
    focusStep();
  }

  function toggleCondition(value: string) {
    setDraft((current) => {
      if (value === "Nie wiem") {
        return {
          ...current,
          conditions: current.conditions.includes(value) ? [] : [value],
        };
      }

      const withoutUnknownAndOpposite = current.conditions.filter(
        (item) => item !== "Nie wiem" && item !== conditionOpposites[value],
      );
      return {
        ...current,
        conditions: toggleValue(withoutUnknownAndOpposite, value),
      };
    });
  }

  function validateAll() {
    const basicValid = draft.name.trim() && draft.helpCategories.length > 0;
    const placeEmailValid =
      !draft.placeEmail.trim() || emailPattern.test(draft.placeEmail.trim());
    const accommodationValid =
      !includesAccommodation ||
      draft.accommodation.availabilityKnown !== "yes" ||
      (draft.accommodation.freePlaces !== "" &&
        Boolean(draft.accommodation.availabilityUpdated));
    const submitterEmailValid =
      !draft.submitterContact.email.trim() ||
      emailPattern.test(draft.submitterContact.email.trim());

    if (!basicValid) return "basic" as const;
    if (!placeEmailValid) return "location" as const;
    if (!accommodationValid) return "accommodation" as const;
    if (!submitterEmailValid) return "source" as const;
    return undefined;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const invalidStep = validateAll();
    if (invalidStep) {
      const invalidStepIndex = steps.findIndex((step) => step.id === invalidStep);
      setCurrentStepIndex(Math.max(0, invalidStepIndex));
      setSubmitError(undefined);
      requestAnimationFrame(() => validateStep(invalidStep));
      focusStep();
      return;
    }

    const nextSubmission: NewPlaceSubmission = {
      submissionType: "NEW_PLACE",
      createdAt: new Date().toISOString(),
      status: "PENDING",
      proposedData: {
        name: draft.name.trim(),
        organizationName: draft.organizationName.trim(),
        helpCategories: draft.helpCategories,
        address: {
          street: draft.street.trim(),
          postalCode: draft.postalCode.trim(),
          city: draft.city.trim(),
          district: draft.district.trim(),
        },
        placeContact: {
          phone: draft.placePhone.trim(),
          email: draft.placeEmail.trim(),
          website: draft.placeWebsite.trim(),
        },
        openingHours: draft.openingHours.trim(),
        description: draft.description.trim(),
        conditions: draft.conditions,
        accommodation: includesAccommodation
          ? {
              ...draft.accommodation,
              freePlaces: draft.accommodation.freePlaces.trim(),
              availabilityUpdatedOther:
                draft.accommodation.availabilityUpdatedOther.trim(),
              admissionHours: draft.accommodation.admissionHours.trim(),
            }
          : undefined,
      },
      source: { type: draft.sourceType, url: draft.sourceUrl.trim() },
      submitterContact: {
        name: draft.submitterContact.name.trim(),
        email: draft.submitterContact.email.trim(),
        phone: draft.submitterContact.phone.trim(),
      },
    };

    const requestId = requestIdRef.current ?? createSubmissionRequestId();
    requestIdRef.current = requestId;
    setSubmitError(undefined);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submissions/new-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextSubmission,
          requestId,
          protection,
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

  function resetForm() {
    setDraft({
      ...initialDraft,
      helpCategories: [],
      conditions: [],
      accommodation: { ...initialAccommodation, audiences: [], accessibility: [] },
      submitterContact: { name: "", email: "", phone: "" },
    });
    setProtection({ contactWebsite: "" });
    setErrors({});
    setCurrentStepIndex(0);
    setSubmission(undefined);
    setSubmitError(undefined);
    requestIdRef.current = undefined;
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  const addressSummary = joinPresent([
    draft.street,
    joinPresent([draft.postalCode, draft.city], " "),
    draft.district,
  ]);
  const placeContactSummary = joinPresent([
    draft.placePhone,
    draft.placeEmail,
    draft.placeWebsite,
  ], "\n");
  const submitterContactSummary = joinPresent([
    draft.submitterContact.name,
    draft.submitterContact.email,
    draft.submitterContact.phone,
  ], "\n");

  const summaryItems: SummaryItem[] = [
    {
      label: "Nazwa",
      value: joinPresent([draft.name, draft.organizationName], "\n"),
      editStep: steps.findIndex((step) => step.id === "basic"),
    },
    {
      label: "Rodzaj pomocy",
      value: categoryLabels(draft.helpCategories),
      editStep: steps.findIndex((step) => step.id === "basic"),
    },
    {
      label: "Adres",
      value: addressSummary,
      editStep: steps.findIndex((step) => step.id === "location"),
    },
    {
      label: "Kontakt miejsca",
      value: placeContactSummary,
      editStep: steps.findIndex((step) => step.id === "location"),
    },
    {
      label: "Godziny",
      value: draft.openingHours,
      editStep: steps.findIndex((step) => step.id === "help"),
    },
    {
      label: "Najważniejsze warunki",
      value: draft.conditions.join(", "),
      editStep: steps.findIndex((step) => step.id === "help"),
    },
    ...(includesAccommodation
      ? [
          {
            label: "Nocleg",
            value: joinPresent(
              [
                draft.accommodation.facilityType,
                draft.accommodation.audiences.join(", "),
                draft.accommodation.availabilityKnown === "yes"
                  ? `${draft.accommodation.freePlaces} wolnych miejsc`
                  : draft.accommodation.availabilityKnown === "no"
                    ? "Brak informacji o wolnych miejscach"
                    : "",
                draft.accommodation.admissionHours,
              ],
              "\n",
            ),
            editStep: steps.findIndex((step) => step.id === "accommodation"),
          },
        ]
      : []),
    {
      label: "Źródło",
      value:
        newPlaceSourceOptions.find((option) => option.value === draft.sourceType)?.label ??
        "",
      editStep: steps.findIndex((step) => step.id === "source"),
    },
    {
      label: "Kontakt do Ciebie",
      value: submitterContactSummary,
      editStep: steps.findIndex((step) => step.id === "source"),
    },
  ];

  if (submission) {
    return (
      <div ref={successRef} tabIndex={-1}>
        <FormSuccess
          title="Dziękujemy"
          actions={
            <>
              <SuccessLink href="/" primary>
                Wróć do Mapy Dobra
              </SuccessLink>
              <button
                type="button"
                className="touch-target inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-base font-extrabold text-foreground transition hover:border-brand hover:bg-brand-soft"
                onClick={resetForm}
              >
                Zgłoś kolejne miejsce
              </button>
            </>
          }
        >
          <p>
            Zgłoszone miejsce trafiło do weryfikacji. Nie pojawi się w Mapie Dobra
            automatycznie. Administrator sprawdzi informacje przed publikacją.
          </p>
        </FormSuccess>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <FormDraftResume draft={formDraft.storedDraft} label="Zgłoś nowe miejsce" onResume={() => { const restored = formDraft.resume(); if (restored) { setDraft((current) => ({ ...current, ...restored.data, submitterContact: current.submitterContact })); const restoredSteps = ["basic", "location", "help", ...(restored.data.helpCategories.includes("accommodation") ? ["accommodation"] : []), "source", "summary"]; const nextIndex = restoredSteps.indexOf(String(restored.currentStep)); if (nextIndex >= 0) setCurrentStepIndex(nextIndex); } }} onDiscard={() => { formDraft.discard(); resetForm(); }} />
      <header className="space-y-1.5 sm:space-y-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <MapPinned aria-hidden="true" size={23} />
        </div>
        <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">
          Znasz miejsce, którego tutaj brakuje?
        </h1>
        <p className="max-w-2xl text-base font-semibold leading-6 text-muted-foreground sm:leading-7">
          Zgłoś je do Mapy Dobra. Przed publikacją sprawdzimy informacje.
        </p>
      </header>

      <form
        className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-[0_16px_40px_rgb(17_24_39_/_6%)] sm:p-6"
        onSubmit={handleSubmit}
        noValidate
      >
        <SubmissionStepper
          current={currentStepIndex + 1}
          total={steps.length}
          label={currentStep.label}
        />

        <div
          ref={stepHeadingRef}
          className="programmatic-focus-target mt-4 min-w-0 sm:mt-6"
          tabIndex={-1}
        >
          {currentStep.id === "basic" ? (
            <FormSection
              title="Podstawowe informacje"
              description="Zacznij od nazwy i rodzaju pomocy."
              compact
            >
              <div className="grid min-w-0 gap-3">
                <FormField
                  id="new-place-name"
                  label="Nazwa miejsca"
                  error={errors.name}
                  required
                >
                  <input
                    id="new-place-name"
                    value={draft.name}
                    onChange={(event) => {
                      setField("name", event.target.value);
                      if (errors.name) {
                        setErrors((current) => ({ ...current, name: undefined }));
                      }
                    }}
                    className={formControlClass}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={fieldDescriptionIds(
                      "new-place-name",
                      undefined,
                      errors.name,
                    )}
                    autoComplete="organization"
                  />
                </FormField>
                <FormField
                  id="new-place-organization"
                  label="Nazwa organizacji prowadzącej"
                  hint="Opcjonalnie"
                >
                  <input
                    id="new-place-organization"
                    value={draft.organizationName}
                    onChange={(event) => setField("organizationName", event.target.value)}
                    className={formControlClass}
                    autoComplete="organization"
                  />
                </FormField>
              </div>

              <fieldset
                aria-describedby={
                  errors.helpCategories ? "new-place-categories-error" : undefined
                }
              >
                <legend className="text-sm font-extrabold leading-5 text-foreground">
                  Jaką pomoc można tam otrzymać?
                  <span className="ml-1 text-urgent">(wymagane)</span>
                </legend>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Możesz wybrać kilka kategorii.
                </p>
                <div className="mt-2 grid min-w-0 grid-cols-2 gap-1.5 sm:gap-2">
                  {helpCategoryOptions.map((option) => (
                    <MultiSelectOption
                      key={option.value}
                      id={`new-place-category-${option.value}`}
                      name="helpCategories"
                      value={option.value}
                      label={option.label}
                      compact
                      className={
                        ["medical", "psychological", "legal", "social"].includes(
                          option.value,
                        )
                          ? "col-span-2 sm:col-span-1"
                          : ""
                      }
                      checked={draft.helpCategories.includes(option.value)}
                      onChange={() => {
                        setField(
                          "helpCategories",
                          toggleValue(draft.helpCategories, option.value),
                        );
                        if (errors.helpCategories) {
                          setErrors((current) => ({
                            ...current,
                            helpCategories: undefined,
                          }));
                        }
                      }}
                    />
                  ))}
                </div>
                <FormError id="new-place-categories-error">
                  {errors.helpCategories}
                </FormError>
              </fieldset>
            </FormSection>
          ) : null}

          {currentStep.id === "location" ? (
            <FormSection
              title="Lokalizacja i kontakt"
              description="Podaj tyle informacji, ile znasz. Nie uruchamiamy jeszcze geokodowania."
              compact
            >
              <div className="grid min-w-0 gap-3">
                <FormField id="new-place-street" label="Ulica i numer">
                  <input
                    id="new-place-street"
                    value={draft.street}
                    onChange={(event) => setField("street", event.target.value)}
                    className={formControlClass}
                    autoComplete="street-address"
                  />
                </FormField>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <FormField id="new-place-postal-code" label="Kod pocztowy">
                    <input
                      id="new-place-postal-code"
                      value={draft.postalCode}
                      onChange={(event) => setField("postalCode", event.target.value)}
                      className={formControlClass}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="90-001"
                    />
                  </FormField>
                  <FormField id="new-place-city" label="Miasto">
                    <input
                      id="new-place-city"
                      value={draft.city}
                      onChange={(event) => setField("city", event.target.value)}
                      className={formControlClass}
                      autoComplete="address-level2"
                    />
                  </FormField>
                </div>
                <FormField id="new-place-district" label="Dzielnica" hint="Opcjonalnie">
                  <input
                    id="new-place-district"
                    value={draft.district}
                    onChange={(event) => setField("district", event.target.value)}
                    className={formControlClass}
                    autoComplete="address-level3"
                  />
                </FormField>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-lg font-extrabold text-foreground">Kontakt do miejsca</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Wszystkie pola są opcjonalne.
                </p>
                <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
                  <FormField id="new-place-phone" label="Telefon">
                    <input
                      id="new-place-phone"
                      value={draft.placePhone}
                      onChange={(event) => setField("placePhone", event.target.value)}
                      className={formControlClass}
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </FormField>
                  <FormField id="new-place-email" label="E-mail" error={errors.placeEmail}>
                    <input
                      id="new-place-email"
                      type="email"
                      value={draft.placeEmail}
                      onChange={(event) => {
                        setField("placeEmail", event.target.value);
                        if (errors.placeEmail) {
                          setErrors((current) => ({ ...current, placeEmail: undefined }));
                        }
                      }}
                      className={formControlClass}
                      inputMode="email"
                      autoComplete="email"
                      aria-invalid={Boolean(errors.placeEmail)}
                      aria-describedby={fieldDescriptionIds(
                        "new-place-email",
                        undefined,
                        errors.placeEmail,
                      )}
                    />
                  </FormField>
                  <FormField id="new-place-website" label="Strona internetowa">
                    <input
                      id="new-place-website"
                      type="url"
                      value={draft.placeWebsite}
                      onChange={(event) => setField("placeWebsite", event.target.value)}
                      className={formControlClass}
                      inputMode="url"
                      placeholder="https://"
                    />
                  </FormField>
                </div>
              </div>
            </FormSection>
          ) : null}

          {currentStep.id === "help" ? (
            <FormSection
              title="Pomoc i warunki"
              description="Nie musisz porządkować informacji jak administrator. Opisz je własnymi słowami."
              compact
            >
              <FormField id="new-place-hours" label="Kiedy miejsce działa?">
                <textarea
                  id="new-place-hours"
                  value={draft.openingHours}
                  onChange={(event) => setField("openingHours", event.target.value)}
                  className={`${formControlClass} min-h-28 resize-y`}
                  placeholder="Np. pon.–pt. 10:00–18:00, sobota 10:00–14:00"
                />
              </FormField>
              <FormField id="new-place-description" label="Co warto wiedzieć o tym miejscu?">
                <textarea
                  id="new-place-description"
                  value={draft.description}
                  onChange={(event) => setField("description", event.target.value)}
                  className={`${formControlClass} min-h-32 resize-y`}
                  placeholder="Np. wydawane są ciepłe posiłki, nie jest wymagane skierowanie, wejście od podwórza."
                />
              </FormField>
              <fieldset>
                <legend className="text-sm font-extrabold text-foreground">
                  Warunki skorzystania z pomocy
                </legend>
                <p className="mt-1 text-sm font-semibold leading-5 text-muted-foreground">
                  Zaznacz tylko informacje, których jesteś pewien/pewna. Przeciwne
                  odpowiedzi wykluczają się automatycznie.
                </p>
                <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                  {conditionOptions.map((option) => (
                    <MultiSelectOption
                      key={option}
                      name="conditions"
                      value={option}
                      label={option}
                      checked={draft.conditions.includes(option)}
                      onChange={() => toggleCondition(option)}
                    />
                  ))}
                </div>
              </fieldset>
            </FormSection>
          ) : null}

          {currentStep.id === "accommodation" ? (
            <FormSection
              title="Informacje o noclegu – jeśli je znasz"
              description="Wszystkie pola w tej sekcji są opcjonalne."
            >
              <div className="flex items-start gap-2 rounded-lg border border-urgent-border bg-urgent-soft px-3.5 py-3 text-sm font-semibold leading-5 text-foreground">
                <Info aria-hidden="true" className="mt-0.5 shrink-0 text-urgent" size={18} />
                Informacja o wolnych miejscach będzie zgłoszeniem do weryfikacji,
                a nie potwierdzoną dostępnością.
              </div>

              <FormField id="new-place-facility-type" label="Rodzaj placówki">
                <select
                  id="new-place-facility-type"
                  value={draft.accommodation.facilityType}
                  onChange={(event) => setAccommodationField("facilityType", event.target.value)}
                  className={formSelectClass}
                >
                  <option value="">Wybierz, jeśli wiesz</option>
                  {facilityTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>

              <fieldset>
                <legend className="text-sm font-extrabold text-foreground">Dla kogo</legend>
                <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                  {accommodationAudienceOptions.map((option) => (
                    <MultiSelectOption
                      key={option}
                      name="accommodationAudience"
                      value={option}
                      label={option}
                      checked={draft.accommodation.audiences.includes(option)}
                      onChange={() =>
                        setAccommodationField(
                          "audiences",
                          toggleExclusiveUnknown(draft.accommodation.audiences, option),
                        )
                      }
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-extrabold text-foreground">
                  Czy wiesz, ile jest obecnie wolnych miejsc?
                </legend>
                <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                  <OptionCard
                    type="radio"
                    name="availabilityKnown"
                    value="yes"
                    label="Tak"
                    checked={draft.accommodation.availabilityKnown === "yes"}
                    onChange={() => setAccommodationField("availabilityKnown", "yes")}
                  />
                  <OptionCard
                    type="radio"
                    name="availabilityKnown"
                    value="no"
                    label="Nie"
                    checked={draft.accommodation.availabilityKnown === "no"}
                    onChange={() => {
                      setAccommodationField("availabilityKnown", "no");
                      setErrors((current) => ({
                        ...current,
                        freePlaces: undefined,
                        availabilityUpdated: undefined,
                      }));
                    }}
                  />
                </div>
              </fieldset>

              {draft.accommodation.availabilityKnown === "yes" ? (
                <div className="grid min-w-0 gap-4 rounded-lg border border-border bg-background p-3.5 sm:grid-cols-2">
                  <FormField
                    id="new-place-free-places"
                    label="Liczba wolnych miejsc"
                    error={errors.freePlaces}
                    required
                  >
                    <input
                      id="new-place-free-places"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={draft.accommodation.freePlaces}
                      onChange={(event) => {
                        setAccommodationField("freePlaces", event.target.value);
                        if (errors.freePlaces) {
                          setErrors((current) => ({ ...current, freePlaces: undefined }));
                        }
                      }}
                      className={formControlClass}
                      aria-invalid={Boolean(errors.freePlaces)}
                      aria-describedby={fieldDescriptionIds(
                        "new-place-free-places",
                        undefined,
                        errors.freePlaces,
                      )}
                    />
                  </FormField>
                  <FormField
                    id="new-place-availability-updated"
                    label="Kiedy ta informacja była aktualna?"
                    error={errors.availabilityUpdated}
                    required
                  >
                    <select
                      id="new-place-availability-updated"
                      value={draft.accommodation.availabilityUpdated}
                      onChange={(event) => {
                        setAccommodationField("availabilityUpdated", event.target.value);
                        if (errors.availabilityUpdated) {
                          setErrors((current) => ({
                            ...current,
                            availabilityUpdated: undefined,
                          }));
                        }
                      }}
                      className={formSelectClass}
                      aria-invalid={Boolean(errors.availabilityUpdated)}
                      aria-describedby={fieldDescriptionIds(
                        "new-place-availability-updated",
                        undefined,
                        errors.availabilityUpdated,
                      )}
                    >
                      <option value="">Wybierz</option>
                      <option value="just-now">Przed chwilą</option>
                      <option value="today">Dzisiaj</option>
                      <option value="yesterday">Wczoraj</option>
                      <option value="other">Inna data / godzina</option>
                    </select>
                  </FormField>
                  {draft.accommodation.availabilityUpdated === "other" ? (
                    <FormField
                      id="new-place-availability-updated-other"
                      label="Podaj datę lub godzinę"
                    >
                      <input
                        id="new-place-availability-updated-other"
                        value={draft.accommodation.availabilityUpdatedOther}
                        onChange={(event) =>
                          setAccommodationField(
                            "availabilityUpdatedOther",
                            event.target.value,
                          )
                        }
                        className={formControlClass}
                        placeholder="Np. wczoraj około 18:00"
                      />
                    </FormField>
                  ) : null}
                </div>
              ) : null}

              <FormField
                id="new-place-admission-hours"
                label="W jakich godzinach przyjmowane są nowe osoby?"
              >
                <textarea
                  id="new-place-admission-hours"
                  value={draft.accommodation.admissionHours}
                  onChange={(event) =>
                    setAccommodationField("admissionHours", event.target.value)
                  }
                  className={`${formControlClass} min-h-24 resize-y`}
                />
              </FormField>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <FormField id="new-place-sobriety" label="Trzeźwość">
                  <select
                    id="new-place-sobriety"
                    value={draft.accommodation.sobriety}
                    onChange={(event) => setAccommodationField("sobriety", event.target.value)}
                    className={formSelectClass}
                  >
                    <option value="">Wybierz, jeśli wiesz</option>
                    <option>Wymagana trzeźwość</option>
                    <option>Przyjęcie po indywidualnej ocenie</option>
                    <option>Osobna procedura dla osób po spożyciu</option>
                    <option>Nie wiem</option>
                  </select>
                </FormField>
                <FormField id="new-place-animals" label="Zwierzęta">
                  <select
                    id="new-place-animals"
                    value={draft.accommodation.animals}
                    onChange={(event) => setAccommodationField("animals", event.target.value)}
                    className={formSelectClass}
                  >
                    <option value="">Wybierz, jeśli wiesz</option>
                    <option>Przyjmowane</option>
                    <option>Nieprzyjmowane</option>
                    <option>Po uzgodnieniu</option>
                    <option>Tylko pies</option>
                    <option>Pies asystujący</option>
                    <option>Nie wiem</option>
                  </select>
                </FormField>
              </div>

              <fieldset>
                <legend className="text-sm font-extrabold text-foreground">Dostępność</legend>
                <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                  {accessibilityOptions.map((option) => (
                    <MultiSelectOption
                      key={option}
                      name="accessibility"
                      value={option}
                      label={option}
                      checked={draft.accommodation.accessibility.includes(option)}
                      onChange={() =>
                        setAccommodationField(
                          "accessibility",
                          toggleExclusiveUnknown(
                            draft.accommodation.accessibility,
                            option,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              </fieldset>
            </FormSection>
          ) : null}

          {currentStep.id === "source" ? (
            <FormSection
              title="Źródło i kontakt"
              description="Nie musisz podawać swoich danych osobowych."
            >
              <fieldset>
                <legend className="text-sm font-extrabold text-foreground">
                  Skąd znasz to miejsce?
                </legend>
                <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                  {newPlaceSourceOptions.map((option) => (
                    <OptionCard
                      key={option.value}
                      type="radio"
                      name="sourceType"
                      value={option.value}
                      label={option.label}
                      checked={draft.sourceType === option.value}
                      onChange={() => setField("sourceType", option.value)}
                    />
                  ))}
                </div>
              </fieldset>

              <FormField id="new-place-source-url" label="Link do źródła" hint="Opcjonalnie">
                <input
                  id="new-place-source-url"
                  type="url"
                  value={draft.sourceUrl}
                  onChange={(event) => setField("sourceUrl", event.target.value)}
                  className={formControlClass}
                  inputMode="url"
                  placeholder="https://"
                />
              </FormField>

              <div className="border-t border-border pt-4">
                <h3 className="text-lg font-extrabold text-foreground">
                  Kontakt do Ciebie – opcjonalnie
                </h3>
                <p className="mt-1 text-sm font-semibold leading-5 text-muted-foreground">
                  Możemy skontaktować się z Tobą, jeśli podczas weryfikacji będziemy
                  potrzebować dodatkowych informacji.
                </p>
                <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
                  <FormField id="new-place-submitter-name" label="Imię">
                    <input
                      id="new-place-submitter-name"
                      value={draft.submitterContact.name}
                      onChange={(event) => setSubmitterContact("name", event.target.value)}
                      className={formControlClass}
                      autoComplete="name"
                    />
                  </FormField>
                  <FormField
                    id="new-place-submitter-email"
                    label="E-mail"
                    error={errors.submitterEmail}
                  >
                    <input
                      id="new-place-submitter-email"
                      type="email"
                      value={draft.submitterContact.email}
                      onChange={(event) => setSubmitterContact("email", event.target.value)}
                      className={formControlClass}
                      inputMode="email"
                      autoComplete="email"
                      aria-invalid={Boolean(errors.submitterEmail)}
                      aria-describedby={fieldDescriptionIds(
                        "new-place-submitter-email",
                        undefined,
                        errors.submitterEmail,
                      )}
                    />
                  </FormField>
                  <FormField id="new-place-submitter-phone" label="Telefon">
                    <input
                      id="new-place-submitter-phone"
                      value={draft.submitterContact.phone}
                      onChange={(event) => setSubmitterContact("phone", event.target.value)}
                      className={formControlClass}
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-surface-muted px-3.5 py-3 text-sm font-semibold leading-5 text-muted-foreground">
                <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={18} />
                <p>
                  Nie publikujemy Twoich danych kontaktowych. Miejsce na link do
                  polityki prywatności zostanie uzupełnione przed uruchomieniem
                  właściwej wysyłki.
                </p>
              </div>

              <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="new-place-contact-website">Strona kontaktowa</label>
                <input
                  id="new-place-contact-website"
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
          ) : null}

          {currentStep.id === "summary" ? (
            <FormSection
              title="Sprawdź zgłoszenie"
              description="Możesz wrócić do dowolnej sekcji. Nie trzeba osobno potwierdzać każdego pola."
            >
              <SubmissionSummary items={summaryItems} onEdit={goToStep} />
              <div className="flex items-start gap-2 rounded-lg bg-brand-soft px-3.5 py-3 text-sm font-semibold leading-5 text-foreground">
                <Info aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={18} />
                Zgłoszenie trafi do weryfikacji i nie zostanie opublikowane automatycznie.
              </div>
            </FormSection>
          ) : null}
        </div>

        <div className="mt-5 sm:mt-6">
          {submitError ? (
            <p className="mb-3 text-sm font-bold leading-5 text-urgent" role="alert">
              {submitError}
            </p>
          ) : null}
          <StepActions
            onBack={currentStepIndex > 0 ? goBack : undefined}
            onNext={currentStep.id === "summary" ? undefined : goNext}
            nextType={currentStep.id === "summary" ? "submit" : "button"}
            disabled={isSubmitting}
            nextLabel={
              currentStep.id === "summary" && isSubmitting
                ? "Wysyłanie…"
                : currentStep.id === "summary"
                ? "Wyślij zgłoszenie"
                : currentStep.id === "source"
                  ? "Przejdź do podsumowania"
                  : "Dalej"
            }
          />
        </div>
      </form>

      <p className="text-center text-sm font-semibold text-muted-foreground">
        <Link className="touch-target inline-flex items-center rounded-md px-2 text-brand-strong hover:bg-brand-soft hover:text-foreground" href="/">
          Wróć do Mapy Dobra
        </Link>
      </p>
    </div>
  );
}
