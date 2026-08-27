"use client";

import { useState } from "react";
import {
  Accessibility,
  ArrowLeft,
  Baby,
  BedDouble,
  Check,
  ChevronRight,
  CircleHelp,
  Dog,
  HeartHandshake,
  Home,
  Mars,
  ShieldCheck,
  Users,
  Venus,
  type LucideIcon,
} from "lucide-react";
import { AccommodationCard } from "@/components/accommodations/accommodation-card";
import type {
  Accommodation,
  AccommodationNeed,
  AccommodationProfile,
  PetAnswer,
  RegistrationAnswer,
  WheelchairNeed,
} from "@/data/demo-accommodations";
import { rankAccommodations, type WizardAnswers } from "@/lib/accommodations/matching";

type WizardStep = "profile" | "wheelchair" | "registration" | "pet" | "needs";

type StepDefinition = {
  id: WizardStep;
  title: string;
  note?: string;
};

const steps: StepDefinition[] = [
  { id: "profile", title: "Dla kogo szukasz noclegu?" },
  { id: "wheelchair", title: "Czy potrzebna jest dostępność dla osoby na wózku?" },
  {
    id: "registration",
    title: "Czy masz ostatnie zameldowanie w Łodzi?",
    note: "Odpowiedź służy tylko do dopasowania miejsc i nie jest zapisywana.",
  },
  { id: "pet", title: "Czy jesteś ze zwierzęciem?" },
  { id: "needs", title: "Czy coś jeszcze jest ważne?", note: "Możesz zaznaczyć kilka opcji albo pominąć ten krok." },
];

const profileOptions: Array<{ value: AccommodationProfile; label: string; icon: LucideIcon }> = [
  { value: "woman", label: "Kobieta", icon: Venus },
  { value: "man", label: "Mężczyzna", icon: Mars },
  { value: "womanWithChildren", label: "Kobieta z dzieckiem / dziećmi", icon: Baby },
  { value: "family", label: "Rodzina", icon: Users },
  { value: "disability", label: "Osoba z niepełnosprawnością", icon: Accessibility },
  { value: "other", label: "Inna sytuacja", icon: CircleHelp },
];

const wheelchairOptions: Array<{ value: WheelchairNeed; label: string }> = [
  { value: "yes", label: "Tak" },
  { value: "no", label: "Nie" },
  { value: "unknown", label: "Nie dotyczy / nie wiem" },
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
  { value: "careServices", label: "Usługi opiekuńcze" },
  { value: "partialDependency", label: "Wsparcie dla osoby częściowo niesamodzielnej" },
];

const initialAnswers: WizardAnswers = { needs: [] };

function ChoiceButton({
  selected,
  label,
  icon: Icon,
  onClick,
}: {
  selected: boolean;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="md-night-choice"
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onClick}
    >
      {Icon ? (
        <span className="md-night-choice-icon"><Icon aria-hidden="true" size={19} strokeWidth={2.15} /></span>
      ) : null}
      <span>{label}</span>
      <span className="md-night-choice-check" aria-hidden="true">
        {selected ? <Check size={14} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function AccommodationWizard({ accommodations }: { accommodations: Accommodation[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>(initialAnswers);
  const [showResults, setShowResults] = useState(false);

  const step = steps[currentStep];
  const canContinue =
    step.id === "needs" ||
    (step.id === "profile" && Boolean(answers.profile)) ||
    (step.id === "wheelchair" && Boolean(answers.wheelchair)) ||
    (step.id === "registration" && Boolean(answers.registration)) ||
    (step.id === "pet" && Boolean(answers.pet));

  const matches = rankAccommodations(accommodations, answers);
  const exactMatches = matches.filter(
    (match) => match.unmetConditions.length === 0 && match.confirmationConditions.length === 0,
  );
  const visibleMatches = exactMatches.length > 0 ? exactMatches : matches.slice(0, 6);

  function goNext() {
    if (!canContinue) return;
    if (currentStep === steps.length - 1) {
      setShowResults(true);
      return;
    }
    setCurrentStep((value) => value + 1);
  }

  function goBack() {
    if (showResults) {
      setShowResults(false);
      return;
    }
    setCurrentStep((value) => Math.max(0, value - 1));
  }

  function restart() {
    setAnswers(initialAnswers);
    setCurrentStep(0);
    setShowResults(false);
  }

  function toggleNeed(need: AccommodationNeed) {
    setAnswers((current) => ({
      ...current,
      needs: current.needs.includes(need)
        ? current.needs.filter((item) => item !== need)
        : [...current.needs, need],
    }));
  }

  if (showResults) {
    return (
      <main className="md-night-shell">
        <header className="md-night-topbar">
          <button type="button" className="md-night-back" onClick={goBack} aria-label="Wróć do pytań">
            <ArrowLeft aria-hidden="true" size={19} />
          </button>
          <div>
            <p className="md-night-kicker">Nocleg na dzisiaj</p>
            <h1>Najlepsze dopasowania</h1>
          </div>
        </header>

        <section className="md-night-result-summary" aria-live="polite">
          <span className="md-night-summary-icon"><ShieldCheck aria-hidden="true" size={19} /></span>
          <div>
            <strong>{exactMatches.length > 0 ? `${exactMatches.length} ${exactMatches.length === 1 ? "miejsce pasuje" : "miejsca pasują"} bez dodatkowych warunków` : "Nie znaleźliśmy pełnego dopasowania"}</strong>
            <p>{exactMatches.length > 0 ? "Najpierw pokazujemy miejsca najlepiej odpowiadające Twojej sytuacji." : "Pokazujemy najbliższe dopasowania i jasno oznaczamy, co trzeba sprawdzić przed wyjściem."}</p>
          </div>
        </section>

        <div className="md-night-results">
          {visibleMatches.length > 0 ? visibleMatches.map((match, index) => (
            <AccommodationCard
              key={match.accommodation.id}
              accommodation={match.accommodation}
              isBestMatch={index === 0}
              unmetConditions={match.unmetConditions}
              confirmationConditions={match.confirmationConditions}
            />
          )) : (
            <section className="md-night-empty">
              <BedDouble aria-hidden="true" size={24} />
              <h2>Brak miejsc do pokazania</h2>
              <p>Wróć do pytań albo sprawdź wszystkie miejsca noclegowe na mapie.</p>
            </section>
          )}
        </div>

        <button type="button" className="md-night-restart" onClick={restart}>Zmień odpowiedzi</button>
      </main>
    );
  }

  return (
    <main className="md-night-shell">
      <header className="md-night-topbar">
        <button
          type="button"
          className="md-night-back"
          onClick={goBack}
          disabled={currentStep === 0}
          aria-label="Poprzednie pytanie"
        >
          <ArrowLeft aria-hidden="true" size={19} />
        </button>
        <div>
          <p className="md-night-kicker">Nocleg na dzisiaj</p>
          <h1>Znajdź miejsce, które może Cię przyjąć</h1>
        </div>
      </header>

      <section className="md-night-progress" aria-label={`Krok ${currentStep + 1} z ${steps.length}`}>
        <div className="md-night-progress-meta">
          <span>Krok {currentStep + 1} z {steps.length}</span>
          <span>Łódź</span>
        </div>
        <div className="md-night-progress-track" aria-hidden="true">
          <span style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
        </div>
      </section>

      <section className="md-night-question" aria-labelledby={`${step.id}-title`}>
        <div className="md-night-question-heading">
          <span className="md-night-question-icon"><BedDouble aria-hidden="true" size={21} /></span>
          <div>
            <h2 id={`${step.id}-title`}>{step.title}</h2>
            {step.note ? <p>{step.note}</p> : null}
          </div>
        </div>

        <div className="md-night-options">
          {step.id === "profile" ? profileOptions.map((option) => (
            <ChoiceButton
              key={option.value}
              selected={answers.profile === option.value}
              label={option.label}
              icon={option.icon}
              onClick={() => setAnswers((current) => ({ ...current, profile: option.value }))}
            />
          )) : null}

          {step.id === "wheelchair" ? wheelchairOptions.map((option) => (
            <ChoiceButton
              key={option.value}
              selected={answers.wheelchair === option.value}
              label={option.label}
              icon={Accessibility}
              onClick={() => setAnswers((current) => ({ ...current, wheelchair: option.value }))}
            />
          )) : null}

          {step.id === "registration" ? registrationOptions.map((option) => (
            <ChoiceButton
              key={option.value}
              selected={answers.registration === option.value}
              label={option.label}
              icon={Home}
              onClick={() => setAnswers((current) => ({ ...current, registration: option.value }))}
            />
          )) : null}

          {step.id === "pet" ? petOptions.map((option) => (
            <ChoiceButton
              key={option.value}
              selected={answers.pet === option.value}
              label={option.label}
              icon={option.icon}
              onClick={() => setAnswers((current) => ({ ...current, pet: option.value }))}
            />
          )) : null}

          {step.id === "needs" ? needOptions.map((option) => (
            <ChoiceButton
              key={option.value}
              selected={answers.needs.includes(option.value)}
              label={option.label}
              icon={HeartHandshake}
              onClick={() => toggleNeed(option.value)}
            />
          )) : null}
        </div>
      </section>

      <section className="md-night-privacy">
        <ShieldCheck aria-hidden="true" size={17} />
        <span>Nie tworzymy profilu i nie zapisujemy odpowiedzi z tego formularza.</span>
      </section>

      <div className="md-night-actions">
        {step.id === "needs" ? (
          <button type="button" className="md-night-secondary" onClick={() => setShowResults(true)}>Pomiń</button>
        ) : (
          <button type="button" className="md-night-secondary" onClick={goBack} disabled={currentStep === 0}>Wstecz</button>
        )}
        <button type="button" className="md-night-primary" disabled={!canContinue} onClick={goNext}>
          {currentStep === steps.length - 1 ? "Pokaż miejsca" : "Dalej"}
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </main>
  );
}
