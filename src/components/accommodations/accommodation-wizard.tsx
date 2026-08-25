"use client";

import { useState } from "react";
import { FormDraftResume } from "@/components/forms/form-draft-ui";
import { useFormDraft } from "@/components/forms/use-form-draft";
import { useUnsavedChangesGuard } from "@/components/forms/use-unsaved-changes-guard";
import {
  Accessibility,
  Baby,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Dog,
  HeartHandshake,
  Home,
  Mars,
  Users,
  Venus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AccommodationCard } from "@/components/accommodations/accommodation-card";
import {
  type Accommodation,
  type AccommodationNeed,
  type AccommodationProfile,
  type PetAnswer,
  type RegistrationAnswer,
  type WheelchairNeed,
} from "@/data/demo-accommodations";
import {
  rankAccommodations,
  type WizardAnswers,
} from "@/lib/accommodations/matching";

type WizardStep = "profile" | "wheelchair" | "registration" | "pet" | "needs";

const steps: Array<{
  id: WizardStep;
  eyebrow: string;
  title: string;
  note?: string;
}> = [
  {
    id: "profile",
    eyebrow: "Krok 1 z 5",
    title: "Dla kogo szukasz miejsca?",
  },
  {
    id: "wheelchair",
    eyebrow: "Krok 2 z 5",
    title: "Czy potrzebujesz miejsca dostępnego dla osoby poruszającej się na wózku?",
  },
  {
    id: "registration",
    eyebrow: "Krok 3 z 5",
    title: "Czy masz ostatnie zameldowanie w Łodzi?",
    note: "Ta odpowiedź służy tylko do bieżącego dopasowania miejsc.",
  },
  {
    id: "pet",
    eyebrow: "Krok 4 z 5",
    title: "Czy jesteś ze zwierzęciem?",
  },
  {
    id: "needs",
    eyebrow: "Krok 5 z 5",
    title: "Dodatkowe potrzeby",
    note: "Ten krok możesz pominąć.",
  },
];

const profileOptions: Array<{
  value: AccommodationProfile;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "woman", label: "Kobieta", icon: Venus },
  { value: "man", label: "Mężczyzna", icon: Mars },
  { value: "womanWithChildren", label: "Kobieta z dzieckiem / dziećmi", icon: Baby },
  { value: "family", label: "Rodzina", icon: Home },
  { value: "disability", label: "Osoba z niepełnosprawnością", icon: Accessibility },
  { value: "other", label: "Inna sytuacja", icon: CircleHelp },
];

const wheelchairOptions: Array<{ value: WheelchairNeed; label: string }> = [
  { value: "yes", label: "Tak" },
  { value: "no", label: "Nie" },
  { value: "unknown", label: "Nie dotyczy / Nie wiem" },
];

const registrationOptions: Array<{ value: RegistrationAnswer; label: string }> = [
  { value: "yes", label: "Tak" },
  { value: "no", label: "Nie" },
  { value: "unknown", label: "Nie wiem" },
];

const petOptions: Array<{ value: PetAnswer; label: string; icon: LucideIcon }> = [
  { value: "none", label: "Nie", icon: Check },
  { value: "dog", label: "Tak, z psem", icon: Dog },
  { value: "other", label: "Tak, z innym zwierzęciem", icon: Dog },
];

const needOptions: Array<{ value: AccommodationNeed; label: string }> = [
  { value: "noReferral", label: "Bez skierowania" },
  { value: "noDocuments", label: "Bez dokumentów" },
  { value: "careServices", label: "Potrzebuję usług opiekuńczych" },
  {
    value: "partialDependency",
    label: "Potrzebuję miejsca dla osoby częściowo niesamodzielnej",
  },
];

const initialAnswers: WizardAnswers = {
  needs: [],
};

const profileLabel = Object.fromEntries(
  profileOptions.map((option) => [option.value, option.label]),
) as Record<AccommodationProfile, string>;

function optionClasses(isSelected: boolean, compact = false) {
  return [
    "group flex w-full min-w-0 items-center gap-3 rounded-lg border bg-surface text-left font-medium text-foreground transition hover:border-[#0f766e] hover:bg-[#f7fafb] focus:outline-none focus:ring-4 focus:ring-[#0f766e]/25",
    compact ? "min-h-12 px-3 py-2 text-sm" : "min-h-16 px-4 py-3 text-base",
    isSelected
      ? "border-[#18364d] bg-[#eef4f6]"
      : "border-[#e5e5e5]",
  ].join(" ");
}

function selectedMarker(isSelected: boolean) {
  return (
    <span
      aria-hidden="true"
      className={[
        "ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
        isSelected
          ? "border-[#0f766e] bg-[#0f766e] text-white"
          : "border-[#e5e5e5] bg-surface text-transparent",
      ].join(" ")}
    >
      <Check size={15} strokeWidth={2.6} />
    </span>
  );
}

export function AccommodationWizard({ accommodations }: { accommodations: Accommodation[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>(initialAnswers);
  const [showResults, setShowResults] = useState(false);
  const draft = useFormDraft({ formType: "accommodation", storage: "local", ttlMs: 24 * 60 * 60 * 1000, data: answers, currentStep, enabled: !showResults });
  useUnsavedChangesGuard(!showResults && draft.isDirty);
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const canContinue =
    step.id === "needs" ||
    (step.id === "profile" && answers.profile) ||
    (step.id === "wheelchair" && answers.wheelchair) ||
    (step.id === "registration" && answers.registration) ||
    (step.id === "pet" && answers.pet);
  const matches = rankAccommodations(accommodations, answers);
  const exactMatches = matches.filter(
    (match) =>
      match.unmetConditions.length === 0 && match.confirmationConditions.length === 0,
  );
  const visibleMatches = exactMatches.length > 0 ? exactMatches : matches.slice(0, 6);

  function goNext() {
    if (!canContinue) {
      return;
    }

    if (currentStep === steps.length - 1) {
      draft.clear();
      setShowResults(true);
      return;
    }

    setCurrentStep((value) => value + 1);
  }

  function goBack() {
    setCurrentStep((value) => Math.max(0, value - 1));
  }

  function toggleNeed(need: AccommodationNeed) {
    setAnswers((current) => {
      const hasNeed = current.needs.includes(need);

      return {
        ...current,
        needs: hasNeed
          ? current.needs.filter((item) => item !== need)
          : [...current.needs, need],
      };
    });
  }

  return (
    <div className={`accommodation-page mx-auto w-full min-w-0 px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8 ${showResults ? "max-w-[1200px]" : "max-w-[760px]"}`}>
      <div className={`min-w-0 gap-5 lg:items-start lg:gap-8 ${showResults ? "grid lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]" : "block"}`}>
        <section className="min-w-0 space-y-4">
          <FormDraftResume draft={draft.storedDraft} label="Znajdź nocleg" onResume={() => { const restored = draft.resume(); if (restored) { setAnswers(restored.data); if (typeof restored.currentStep === "number") setCurrentStep(Math.min(steps.length - 1, Math.max(0, restored.currentStep))); } }} onDiscard={() => { draft.discard(); setAnswers(initialAnswers); setCurrentStep(0); }} />
          <div className="accommodation-flow">
            <div className="min-w-0 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-brand-strong">
                  Nocleg na dzisiaj
                </p>
                <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-4xl">
                  Znajdź miejsce, które może Cię przyjąć.
                </h1>
                <p className="text-base font-normal leading-7 text-muted-foreground">
                  Odpowiedz na kilka prostych pytań. Nie zapisujemy tych odpowiedzi
                  jako profilu.
                </p>
              </div>

              <div className="accommodation-progress rounded-lg border border-border bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{step.eyebrow}</p>
                  <p className="text-sm font-normal text-muted-foreground">
                    Łódź
                  </p>
                </div>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h2
                  id={`${step.id}-title`}
                  className="accommodation-question text-2xl font-semibold leading-tight text-foreground"
                >
                  {step.title}
                </h2>
                {step.note ? (
                  <p className="text-sm font-semibold leading-6 text-muted-foreground">
                    {step.note}
                  </p>
                ) : null}
              </div>

              {step.id === "profile" ? (
                <div
                  role="group"
                  aria-labelledby="profile-title"
                  className="grid min-w-0 gap-2"
                >
                  {profileOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = answers.profile === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        className={optionClasses(isSelected)}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            profile: option.value,
                          }))
                        }
                      >
                        <span className="accommodation-option-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Icon aria-hidden="true" size={23} strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0">{option.label}</span>
                        {selectedMarker(isSelected)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step.id === "wheelchair" ? (
                <div
                  role="group"
                  aria-labelledby="wheelchair-title"
                  className="grid min-w-0 gap-2"
                >
                  {wheelchairOptions.map((option) => {
                    const isSelected = answers.wheelchair === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        className={optionClasses(isSelected)}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            wheelchair: option.value,
                          }))
                        }
                      >
                        <span className="accommodation-option-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Accessibility aria-hidden="true" size={23} strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0">{option.label}</span>
                        {selectedMarker(isSelected)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step.id === "registration" ? (
                <div
                  role="group"
                  aria-labelledby="registration-title"
                  className="grid min-w-0 gap-2"
                >
                  {registrationOptions.map((option) => {
                    const isSelected = answers.registration === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        className={optionClasses(isSelected)}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            registration: option.value,
                          }))
                        }
                      >
                        <span className="accommodation-option-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Home aria-hidden="true" size={23} strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0">{option.label}</span>
                        {selectedMarker(isSelected)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step.id === "pet" ? (
                <div
                  role="group"
                  aria-labelledby="pet-title"
                  className="grid min-w-0 gap-2"
                >
                  {petOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = answers.pet === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        className={optionClasses(isSelected)}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            pet: option.value,
                          }))
                        }
                      >
                        <span className="accommodation-option-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Icon aria-hidden="true" size={23} strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0">{option.label}</span>
                        {selectedMarker(isSelected)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step.id === "needs" ? (
                <div className="grid min-w-0 gap-2">
                  {needOptions.map((option) => {
                    const isSelected = answers.needs.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        className={optionClasses(isSelected, true)}
                        onClick={() => toggleNeed(option.value)}
                      >
                        <span className="accommodation-option-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <HeartHandshake aria-hidden="true" size={20} strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0">{option.label}</span>
                        {selectedMarker(isSelected)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="accommodation-actions grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 pt-1">
                <button
                  type="button"
                  className="touch-target inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={currentStep === 0}
                  onClick={goBack}
                >
                  <ChevronLeft aria-hidden="true" size={17} />
                  Wstecz
                </button>
                <button
                  type="button"
                  className="touch-target inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg bg-[#18364d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#102b3d] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={!canContinue}
                  onClick={goNext}
                >
                  {currentStep === steps.length - 1 ? "Pokaż miejsca" : "Dalej"}
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              </div>
            </div>
          </div>

          <div className="accommodation-support-panel border-t border-[#e5e5e5] pt-5">
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
                aria-hidden="true"
              >
                <BedDouble size={22} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  Sprawdzimy najważniejsze warunki
                </h2>
                <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                  Grupa, przyjęcia dzisiaj, wolne miejsca, świeżość informacji i
                  wymagania placówki są ważniejsze niż sama odległość.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-4" aria-live="polite">
          {showResults ? (
            <>
              <div className="accommodation-results-header border-b border-[#e5e5e5] pb-5">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-brand-strong">
                      Wyniki kreatora
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold leading-tight text-foreground">
                      Proponowane miejsca
                    </h2>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {answers.profile ? (
                      <span className="inline-flex min-h-8 max-w-full items-center rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground">
                        {profileLabel[answers.profile]}
                      </span>
                    ) : null}
                    {answers.wheelchair === "yes" ? (
                      <span className="inline-flex min-h-8 max-w-full items-center rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground">
                        Dostępne dla wózka
                      </span>
                    ) : null}
                    {answers.pet && answers.pet !== "none" ? (
                      <span className="inline-flex min-h-8 max-w-full items-center rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground">
                        Ze zwierzęciem
                      </span>
                    ) : null}
                    {answers.needs.length === 0 ? (
                      <span className="inline-flex min-h-8 max-w-full items-center rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-muted-foreground">
                        Dodatkowe potrzeby pominięte
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {exactMatches.length === 0 ? (
                <div className="accommodation-empty border-b border-[#e5e5e5] py-5">
                  <h2 className="text-xl font-semibold leading-tight text-foreground">
                    Nie znaleźliśmy miejsca z potwierdzonym spełnieniem wszystkich warunków.
                  </h2>
                  <p className="mt-2 text-sm font-normal leading-6 text-muted-foreground">
                    Poniżej pokazujemy najbliższe możliwe opcje i wyraźnie
                    zaznaczamy warunki niespełnione lub wymagające potwierdzenia.
                  </p>
                </div>
              ) : null}

              <div className="grid min-w-0 gap-3 sm:gap-4">
                {visibleMatches.map((match, index) => (
                  <AccommodationCard
                    key={match.accommodation.id}
                    accommodation={match.accommodation}
                    isBestMatch={
                      index === 0 &&
                      match.unmetConditions.length === 0 &&
                      match.confirmationConditions.length === 0
                    }
                    unmetConditions={match.unmetConditions}
                    confirmationConditions={match.confirmationConditions}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="accommodation-preview hidden border-t border-[#e5e5e5] pt-5 lg:block">
              <div className="flex min-h-[28rem] flex-col justify-center">
                <Users aria-hidden="true" size={34} className="mb-4 text-brand-strong" />
                <h2 className="text-2xl font-semibold leading-tight text-foreground">
                  Wyniki pojawią się po ostatnim kroku.
                </h2>
                <p className="mt-3 max-w-md text-base font-normal leading-7 text-muted-foreground">
                  Najpierw ograniczamy liczbę decyzji. Potem pokazujemy miejsca,
                  które realnie mogą pasować do sytuacji i są oznaczone jasnymi
                  warunkami.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
