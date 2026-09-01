"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  type PetAnswer,
} from "@/data/demo-accommodations";
import type { PartyProfile } from "@/lib/accommodations/types";
import { getAccommodationResultHeading } from "@/lib/accommodations/presentation";
import {
  rankAccommodations,
  type WizardAnswers,
} from "@/lib/accommodations/matching";
import {
  ACCOMMODATION_WIZARD_STORAGE_KEY,
  LEGACY_ACCOMMODATION_WIZARD_STORAGE_KEY,
  clearAccommodationWizardState,
  getAccommodationWizardProgress,
  parseAccommodationWizardState,
  serializeAccommodationWizardState,
} from "@/lib/accommodations/wizard-state";

type WizardStep = "profile" | "needs" | "pet";

const steps: Array<{
  id: WizardStep;
  eyebrow: string;
  title: string;
  note?: string;
}> = [
  {
    id: "profile",
    eyebrow: "Krok 1 z 4",
    title: "Dla kogo szukasz miejsca?",
  },
  {
    id: "needs",
    eyebrow: "Krok 2 z 3",
    title: "Czy któraś z tych rzeczy jest dla Ciebie ważna?",
    note: "Możesz zaznaczyć kilka odpowiedzi albo przejść dalej bez wyboru.",
  },
  {
    id: "pet",
    eyebrow: "Krok 3 z 3",
    title: "Z jakim zwierzęciem jesteś?",
  },
];

const profileOptions: Array<{
  value: PartyProfile;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "woman", label: "Kobieta", icon: Venus },
  { value: "man", label: "Mężczyzna", icon: Mars },
  { value: "womanWithChildren", label: "Kobieta z dzieckiem / dziećmi", icon: Baby },
  { value: "family", label: "Rodzina", icon: Home },
  { value: "other", label: "Inna sytuacja", icon: CircleHelp },
];

const petOptions: Array<{ value: PetAnswer; label: string; icon: LucideIcon }> = [
  { value: "none", label: "Nie", icon: Check },
  { value: "dog", label: "Tak, z psem", icon: Dog },
  { value: "other", label: "Tak, z innym zwierzęciem", icon: Dog },
];

const needOptions: Array<{ value: AccommodationNeed; label: string }> = [
  { value: "noReferral", label: "Potrzebuję miejsca bez skierowania" },
  { value: "noDocuments", label: "Potrzebuję miejsca bez dokumentu" },
  { value: "careServices", label: "Potrzebuję usług opiekuńczych" },
  {
    value: "partialDependency",
    label: "Potrzebuję wsparcia, bo nie jestem w pełni samodzielna/y",
  },
];

const initialAnswers: WizardAnswers = {
  needs: [],
};

const profileLabel = Object.fromEntries(
  profileOptions.map((option) => [option.value, option.label]),
) as Record<PartyProfile, string>;

function optionClasses(isSelected: boolean, compact = false) {
  return [
    "group flex w-full min-w-0 items-center gap-3 rounded-xl border bg-surface text-left font-extrabold text-foreground shadow-[0_8px_22px_rgb(17_24_39_/_5%)] transition hover:border-brand hover:bg-brand-soft focus:outline-none focus:ring-4 focus:ring-brand-strong/35",
    compact ? "min-h-12 px-3 py-2 text-sm" : "min-h-16 px-4 py-3 text-base",
    isSelected
      ? "border-brand bg-brand-soft"
      : "border-border",
  ].join(" ");
}

function selectedMarker(isSelected: boolean) {
  return (
    <span
      aria-hidden="true"
      className={[
        "ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
        isSelected
          ? "border-brand bg-brand text-foreground"
          : "border-border bg-surface text-transparent",
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
  const [hydrated, setHydrated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const canContinue =
    (step.id === "profile" && answers.partyProfile) ||
    step.id === "needs" ||
    (step.id === "pet" && answers.pet);
  const matches = rankAccommodations(accommodations, answers);
  const safeMatches = matches.filter((match) => !match.hardMismatch);
  const exactMatches = safeMatches.filter(
    (match) =>
      match.unmetConditions.length === 0 && match.confirmationConditions.length === 0,
  );
  const visibleMatches = exactMatches.length > 0 ? exactMatches : safeMatches.slice(0, 6);
  const bestMatch = visibleMatches[0];
  const otherMatches = visibleMatches.slice(1);
  const confirmationMatches = exactMatches.length === 0
    ? visibleMatches.filter((match) => match !== bestMatch && match.confirmationConditions.length > 0 && match.unmetConditions.length === 0)
    : [];
  const alternativeMatches = exactMatches.length === 0
    ? visibleMatches.filter((match) => match !== bestMatch && !confirmationMatches.includes(match))
    : otherMatches;

  useEffect(() => {
    window.sessionStorage.removeItem(LEGACY_ACCOMMODATION_WIZARD_STORAGE_KEY);
    const saved = parseAccommodationWizardState(window.sessionStorage.getItem(ACCOMMODATION_WIZARD_STORAGE_KEY));
    queueMicrotask(() => {
      if (saved) {
        setCurrentStep(Math.min(saved.step, steps.length - 1));
        setAnswers(saved.answers);
        setShowResults(saved.showResults);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(
      ACCOMMODATION_WIZARD_STORAGE_KEY,
      serializeAccommodationWizardState({ version: 3, step: currentStep, answers, showResults }),
    );
  }, [answers, currentStep, hydrated, showResults]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep, showResults]);

  function goNext() {
    if (!canContinue) {
      return;
    }

    if (step.id === "needs" && answers.petPresent && !answers.pet) {
      setCurrentStep((value) => value + 1);
      return;
    }

    if (currentStep === steps.length - 1 || step.id === "needs") {
      setShowResults(true);
      return;
    }

    setCurrentStep((value) => value + 1);
  }

  function goBack() {
    setCurrentStep((value) => Math.max(0, value - 1));
  }

  function restart() {
    clearAccommodationWizardState(window.sessionStorage);
    setCurrentStep(0);
    setAnswers(initialAnswers);
    setShowResults(false);
  }

  function editAnswers() {
    setShowResults(false);
    setCurrentStep(0);
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

  function toggleWheelchair() {
    setAnswers((current) => {
      if (current.wheelchair === "yes") {
        const next = { ...current };
        delete next.wheelchair;
        return next;
      }
      return { ...current, wheelchair: "yes" };
    });
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <section className={["min-w-0 space-y-4", showResults ? "hidden lg:block" : ""].join(" ")}>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
            <div className="min-w-0 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-extrabold text-brand-strong">
                  Nocleg na dzisiaj
                </p>
                <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">
                  Znajdź miejsce, które może Cię przyjąć.
                </h1>
                <p className="text-base font-semibold leading-7 text-muted-foreground">
                  Odpowiedz na kilka prostych pytań. Nie zapisujemy tych odpowiedzi
                  jako profilu.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-3">
                  <p
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-sm font-extrabold text-foreground focus:outline-none"
                    aria-live="polite"
                  >
                    {getAccommodationWizardProgress(currentStep, answers.petPresent === true)}
                  </p>
                  <p className="text-sm font-bold text-muted-foreground">
                    Łódź
                  </p>
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-surface"
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
                  className="text-xl font-extrabold leading-tight text-foreground"
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
                  role="radiogroup"
                  aria-labelledby="profile-title"
                  className="grid min-w-0 gap-2"
                >
                  {profileOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = answers.partyProfile === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={optionClasses(isSelected)}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            partyProfile: option.value,
                          }))
                        }
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Icon aria-hidden="true" size={23} strokeWidth={2.2} />
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
                  role="radiogroup"
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
                        role="radio"
                        aria-checked={isSelected}
                        className={optionClasses(isSelected)}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            petPresent: true,
                            pet: option.value,
                          }))
                        }
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
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
                <div role="group" aria-label="Dodatkowe potrzeby" className="grid min-w-0 gap-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={answers.wheelchair === "yes"}
                    className={optionClasses(answers.wheelchair === "yes")}
                    onClick={toggleWheelchair}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Accessibility aria-hidden="true" size={23} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0">Potrzebuję miejsca dostępnego dla osoby poruszającej się na wózku</span>
                    {selectedMarker(answers.wheelchair === "yes")}
                  </button>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={answers.petPresent === true}
                    className={optionClasses(answers.petPresent === true)}
                    onClick={() => setAnswers((current) => ({ ...current, petPresent: !current.petPresent, pet: undefined }))}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Dog aria-hidden="true" size={23} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0">Jestem ze zwierzęciem</span>
                    {selectedMarker(answers.petPresent === true)}
                  </button>
                  {needOptions.map((option) => {
                    const isSelected = answers.needs.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        className={optionClasses(isSelected, true)}
                        onClick={() => toggleNeed(option.value)}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <HeartHandshake aria-hidden="true" size={20} strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0">{option.label}</span>
                        {selectedMarker(isSelected)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 pt-1">
                <button
                  type="button"
                  className="touch-target inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-extrabold text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={currentStep === 0}
                  onClick={goBack}
                >
                  <ChevronLeft aria-hidden="true" size={17} />
                  Wstecz
                </button>
                <button
                  type="button"
                  className="touch-target inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-foreground shadow-sm transition hover:bg-brand-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={!canContinue}
                  onClick={goNext}
                >
                  {currentStep === steps.length - 1 || (step.id === "needs" && !answers.petPresent) ? "Pokaż miejsca" : "Dalej"}
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
                aria-hidden="true"
              >
                <BedDouble size={22} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-foreground">
                  Sprawdzimy najważniejsze warunki
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
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
              <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-sm font-extrabold text-brand-strong">
                      Wyniki kreatora
                    </p>
                    <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-extrabold leading-tight text-foreground focus:outline-none">
                      Proponowane miejsca
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="touch-target inline-flex w-fit items-center rounded-lg border border-border px-3 py-2 text-sm font-extrabold text-foreground transition hover:bg-surface-muted"
                    onClick={restart}
                  >
                    Zacznij od nowa
                  </button>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {answers.partyProfile ? (
                      <span className="inline-flex min-h-8 max-w-full items-center rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground">
                        {profileLabel[answers.partyProfile]}
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

              {exactMatches.length === 0 && bestMatch ? (
                <div className="rounded-xl border border-urgent-border bg-urgent-soft p-4 sm:p-5">
                  <h2 className="text-xl font-extrabold leading-tight text-foreground">
                    Nie znaleźliśmy miejsca z potwierdzonym spełnieniem wszystkich warunków.
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
                    Poniżej pokazujemy najbliższe możliwe opcje i wyraźnie
                    zaznaczamy warunki niespełnione lub wymagające potwierdzenia.
                  </p>
                </div>
              ) : null}

              {!bestMatch ? (
                <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                  <h2 className="text-xl font-extrabold leading-tight text-foreground">
                    Nie znaleźliśmy noclegu, który pasuje do wskazanej sytuacji.
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                    Nie pokazujemy miejsc z potwierdzonym konfliktem. Możesz zmienić odpowiedzi albo zobaczyć wszystkie noclegi.
                  </p>
                  <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                    <button type="button" className="touch-target rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-foreground" onClick={editAnswers}>
                      Zmień odpowiedzi
                    </button>
                    <Link className="touch-target rounded-lg border border-border px-4 py-2 text-sm font-extrabold text-foreground" href="/szukaj?kategoria=nocleg">
                      Pokaż wszystkie noclegi
                    </Link>
                  </div>
                </div>
              ) : null}

              {bestMatch ? (
                <section className="grid min-w-0 gap-3" aria-labelledby="best-accommodation-title">
                  <h2 id="best-accommodation-title" className="text-xl font-extrabold text-foreground">{getAccommodationResultHeading(bestMatch.unmetConditions, bestMatch.confirmationConditions)}</h2>
                  <AccommodationCard
                    accommodation={bestMatch.accommodation}
                    isBestMatch={exactMatches.length > 0 && bestMatch.unmetConditions.length === 0 && bestMatch.confirmationConditions.length === 0}
                    unmetConditions={bestMatch.unmetConditions}
                    confirmationConditions={bestMatch.confirmationConditions}
                  />
                </section>
              ) : null}

              {confirmationMatches.length > 0 ? (
                <section className="grid min-w-0 gap-3" aria-labelledby="confirmation-accommodation-title">
                  <h2 id="confirmation-accommodation-title" className="text-xl font-extrabold text-foreground">Miejsca, które warto potwierdzić</h2>
                  {confirmationMatches.map((match) => (
                    <AccommodationCard key={match.accommodation.id} accommodation={match.accommodation} unmetConditions={match.unmetConditions} confirmationConditions={match.confirmationConditions} />
                  ))}
                </section>
              ) : null}

              {alternativeMatches.length > 0 ? (
                <section className="grid min-w-0 gap-3" aria-labelledby="alternative-accommodation-title">
                  <h2 id="alternative-accommodation-title" className="text-xl font-extrabold text-foreground">Inne możliwe miejsca</h2>
                  {alternativeMatches.map((match) => (
                    <AccommodationCard key={match.accommodation.id} accommodation={match.accommodation} unmetConditions={match.unmetConditions} confirmationConditions={match.confirmationConditions} />
                  ))}
                </section>
              ) : null}
            </>
          ) : (
            <div className="hidden rounded-xl border border-border bg-surface p-5 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] lg:block">
              <div className="flex min-h-[28rem] flex-col justify-center">
                <Users aria-hidden="true" size={34} className="mb-4 text-brand-strong" />
                <h2 className="text-2xl font-extrabold leading-tight text-foreground">
                  Wyniki pojawią się po ostatnim kroku.
                </h2>
                <p className="mt-3 max-w-md text-base font-semibold leading-7 text-muted-foreground">
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
