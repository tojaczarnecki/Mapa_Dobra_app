"use client";

import { useState } from "react";
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

type WizardStep = "profile" | "wheelchair" | "registration" | "pet" | "needs";

type WizardAnswers = {
  profile?: AccommodationProfile;
  wheelchair?: WheelchairNeed;
  registration?: RegistrationAnswer;
  pet?: PetAnswer;
  needs: AccommodationNeed[];
};

type MatchResult = {
  accommodation: Accommodation;
  score: number;
  unmetConditions: string[];
};

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

function isAvailableNow(accommodation: Accommodation) {
  return accommodation.availability.state === "fresh" || accommodation.availability.state === "few";
}

function availabilityScore(accommodation: Accommodation) {
  switch (accommodation.availability.state) {
    case "fresh":
      return 70;
    case "few":
      return 55;
    case "stale":
      return 12;
    case "unknown":
      return 4;
    case "none":
      return -90;
    case "suspended":
      return -120;
  }
}

function getUnmetConditions(accommodation: Accommodation, answers: WizardAnswers) {
  const unmet: string[] = [];

  if (
    answers.profile &&
    answers.profile !== "other" &&
    !accommodation.acceptedProfiles.includes(answers.profile)
  ) {
    unmet.push("Miejsce nie jest wskazane dla wybranej grupy.");
  }

  if (answers.wheelchair === "yes" && accommodation.accessibility !== "yes") {
    unmet.push("Brak potwierdzonej pełnej dostępności dla osoby na wózku.");
  }

  if (
    (answers.registration === "no" || answers.registration === "unknown") &&
    accommodation.lodzRegistrationRequired
  ) {
    unmet.push("Wymaga ostatniego meldunku w Łodzi.");
  }

  if (answers.pet === "dog" && accommodation.petPolicy === "none") {
    unmet.push("Nie przyjmuje psa.");
  }

  if (answers.pet === "other" && accommodation.petPolicy !== "byArrangement") {
    unmet.push("Nie potwierdzono przyjęcia tego zwierzęcia.");
  }

  if (answers.needs.includes("noReferral") && accommodation.referralRequired) {
    unmet.push("Wymaga skierowania.");
  }

  if (answers.needs.includes("noDocuments") && accommodation.documentRequired) {
    unmet.push("Wymaga dokumentu.");
  }

  if (answers.needs.includes("careServices") && !accommodation.careServices) {
    unmet.push("Brak usług opiekuńczych.");
  }

  if (
    answers.needs.includes("partialDependency") &&
    !accommodation.partialDependencySupport
  ) {
    unmet.push("Nie potwierdzono wsparcia dla osoby częściowo niesamodzielnej.");
  }

  if (accommodation.availability.state === "none") {
    unmet.push("Brak wolnych miejsc.");
  }

  if (accommodation.availability.state === "unknown") {
    unmet.push("Brak aktualnego potwierdzenia wolnych miejsc.");
  }

  if (accommodation.availability.state === "stale") {
    unmet.push("Dane o wolnych miejscach mogą być nieaktualne.");
  }

  if (accommodation.availability.state === "suspended" || !accommodation.acceptsToday) {
    unmet.push("Nie potwierdzono przyjęć dzisiaj.");
  }

  return unmet;
}

function rankAccommodations(accommodations: Accommodation[], answers: WizardAnswers): MatchResult[] {
  return accommodations
    .map((accommodation) => {
      const unmetConditions = getUnmetConditions(accommodation, answers);
      const groupMatch =
        !answers.profile ||
        answers.profile === "other" ||
        accommodation.acceptedProfiles.includes(answers.profile);
      const baseConditionsMet =
        unmetConditions.filter(
          (condition) =>
            !condition.includes("wolnych miejsc") &&
            !condition.includes("przyjęć dzisiaj") &&
            !condition.includes("nieaktualne"),
        ).length === 0;
      let score = 0;

      score += groupMatch ? 180 : -160;
      score += baseConditionsMet ? 70 : -unmetConditions.length * 24;
      score += accommodation.acceptsToday ? 50 : -80;
      score += availabilityScore(accommodation);
      score += isAvailableNow(accommodation) ? 35 : 0;
      score += answers.needs.includes("careServices") && accommodation.careServices ? 35 : 0;
      score +=
        answers.needs.includes("partialDependency") &&
        accommodation.partialDependencySupport
          ? 30
          : 0;
      score -= accommodation.distanceKm * 4;

      return {
        accommodation,
        score,
        unmetConditions,
      };
    })
    .sort((first, second) => {
      const firstExact = first.unmetConditions.length === 0;
      const secondExact = second.unmetConditions.length === 0;

      if (firstExact !== secondExact) {
        return firstExact ? -1 : 1;
      }

      return second.score - first.score;
    });
}

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
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const canContinue =
    step.id === "needs" ||
    (step.id === "profile" && answers.profile) ||
    (step.id === "wheelchair" && answers.wheelchair) ||
    (step.id === "registration" && answers.registration) ||
    (step.id === "pet" && answers.pet);
  const matches = rankAccommodations(accommodations, answers);
  const exactMatches = matches.filter((match) => match.unmetConditions.length === 0);
  const visibleMatches = exactMatches.length > 0 ? exactMatches : matches.slice(0, 6);

  function goNext() {
    if (!canContinue) {
      return;
    }

    if (currentStep === steps.length - 1) {
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
    <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <section className="min-w-0 space-y-4">
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
                  <p className="text-sm font-extrabold text-foreground">{step.eyebrow}</p>
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
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
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
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
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
                  {currentStep === steps.length - 1 ? "Pokaż miejsca" : "Dalej"}
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
                    <h2 className="mt-1 text-2xl font-extrabold leading-tight text-foreground">
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
                <div className="rounded-xl border border-urgent-border bg-urgent-soft p-4 sm:p-5">
                  <h2 className="text-xl font-extrabold leading-tight text-foreground">
                    Nie znaleźliśmy miejsca spełniającego wszystkie wybrane warunki.
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
                    Poniżej pokazujemy najbliższe możliwe opcje i wyraźnie
                    zaznaczamy, które warunki nie są spełnione.
                  </p>
                </div>
              ) : null}

              <div className="grid min-w-0 gap-3 sm:gap-4">
                {visibleMatches.map((match, index) => (
                  <AccommodationCard
                    key={match.accommodation.id}
                    accommodation={match.accommodation}
                    isBestMatch={index === 0 && match.unmetConditions.length === 0}
                    unmetConditions={match.unmetConditions}
                  />
                ))}
              </div>
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
