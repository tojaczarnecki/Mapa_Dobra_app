"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, HeartHandshake, Search, ShieldQuestion, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  helpCategoryHref,
  helpDecisionScenarioDetails,
  helpDecisionScenarios,
  type HelpDecisionCategory,
  type HelpDecisionScenarioId,
} from "@/lib/help-requests/help-decision";

function CategoryPanel({ categories }: { categories: HelpDecisionCategory[] }) {
  return (
    <nav id="help-category-panel" className="help-decision-options" aria-label="Kategorie pomocy">
      {categories.map((category) => (
        <Link key={category.slug} href={helpCategoryHref(category.slug)} className="help-decision-option">
          <span>{category.label}</span>
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      ))}
    </nav>
  );
}

function EmergencyAction() {
  return (
    <div className="help-decision-inline-emergency">
      <Image src="/brand/help-scenarios/help-emergency.png" alt="" width={64} height={64} aria-hidden="true" />
      <p>Bezpośrednie zagrożenie życia lub zdrowia? <a href="tel:112">Zadzwoń 112</a></p>
    </div>
  );
}

function ScenarioPanel({
  id,
  onChooseCategories,
  unsureSafety,
  onUnsureSafetyChange,
}: {
  id: HelpDecisionScenarioId;
  onChooseCategories: () => void;
  unsureSafety: "yes" | "no" | null;
  onUnsureSafetyChange: (value: "yes" | "no") => void;
}) {
  const detail = helpDecisionScenarioDetails[id];
  const isUnsure = id === "unsure";

  return (
    <div className="help-decision-scenario" aria-label={`Prowadzenie: ${detail.question}`}>
      {id === "public-place" ? <Image src="/brand/help-scenarios/help-sleeping.png" alt="" width={150} height={150} className="help-context-art" aria-hidden="true" /> : null}
      <p className="help-decision-scenario-intro">{detail.intro}</p>
      <h2>{detail.question}</h2>
      {isUnsure ? (
        <div className="help-decision-scenario-actions">
          <fieldset className="help-decision-radio-grid">
            <legend className="sr-only">Wybierz, czy czujesz się bezpiecznie, aby nawiązać kontakt</legend>
            {(["yes", "no"] as const).map((value) => (
              <label key={value} className="help-decision-radio">
                <input type="radio" name="unsure-contact-safety" value={value} checked={unsureSafety === value} onChange={() => onUnsureSafetyChange(value)} />
                <span>{value === "yes" ? "Tak, czuję się bezpiecznie" : "Nie / nie jestem pewien"}</span>
              </label>
            ))}
          </fieldset>
          {unsureSafety === "yes" ? (
            <div className="help-decision-answer">
              <p>Zapytaj spokojnie, czy osoba potrzebuje pomocy i czego najbardziej potrzebuje teraz.</p>
              <button type="button" onClick={onChooseCategories} className="help-decision-primary">Wiem już, czego potrzebuje <ArrowRight aria-hidden="true" size={18} /></button>
              <Link href="/uruchom-pomoc" className="help-decision-secondary">Nadal nie wiem lub nadal się martwię <ArrowRight aria-hidden="true" size={18} /></Link>
            </div>
          ) : null}
          {unsureSafety === "no" ? (
            <div className="help-decision-answer">
              <p>Nie musisz podchodzić. Jeśli sytuacja nadal budzi niepokój, możesz przekazać lokalizację i krótki opis.</p>
              <Link href="/uruchom-pomoc" className="help-decision-primary">Przekaż informację <ArrowRight aria-hidden="true" size={18} /></Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="help-decision-two-actions">
          <button type="button" onClick={onChooseCategories} className="help-decision-primary">Tak — znajdź konkretną pomoc <ArrowRight aria-hidden="true" size={18} /></button>
          <Link href="/uruchom-pomoc" className="help-decision-secondary">Nie / nie wiem — przekaż informację <ArrowRight aria-hidden="true" size={18} /></Link>
        </div>
      )}
      <EmergencyAction />
    </div>
  );
}

export function HelpDecisionEntry({ categories }: { categories: HelpDecisionCategory[] }) {
  const [activePanel, setActivePanel] = useState<"categories" | "scenario-picker" | HelpDecisionScenarioId | null>(null);
  const [unsureSafety, setUnsureSafety] = useState<"yes" | "no" | null>(null);
  const focusRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (activePanel) focusRef.current?.focus({ preventScroll: true });
  }, [activePanel]);

  function choosePanel(panel: "categories" | "scenario-picker" | HelpDecisionScenarioId) {
    setActivePanel(panel);
    if (panel !== "unsure") setUnsureSafety(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (activePanel && activePanel !== "categories" && activePanel !== "scenario-picker") {
      setActivePanel("scenario-picker");
    } else {
      setActivePanel(null);
    }
    setUnsureSafety(null);
  }

  if (activePanel) {
    const scenario = activePanel !== "categories" && activePanel !== "scenario-picker"
      ? helpDecisionScenarios.find((item) => item.id === activePanel)
      : undefined;

    return (
      <div className="journey-help help-decision-page help-decision-page-focus mx-auto w-full max-w-[900px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <button type="button" className="help-decision-back" onClick={goBack}><ArrowLeft aria-hidden="true" size={18} />Wstecz</button>
        <section ref={focusRef} tabIndex={-1} className="help-decision-focus" aria-live="polite">
          {activePanel === "categories" ? (
            <>
              <p className="help-decision-eyebrow">KONKRETNA POMOC</p>
              <h1>Czego ta osoba potrzebuje?</h1>
              <p className="help-decision-lead">Wybierz jedną kategorię. Potem pokażemy miejsca, które mogą pomóc.</p>
              <CategoryPanel categories={categories} />
            </>
          ) : null}

          {activePanel === "scenario-picker" ? (
            <>
              <p className="help-decision-eyebrow">NIE WIEM, CO ZROBIĆ</p>
              <h1>Która sytuacja jest najbliższa temu, co widzisz?</h1>
              <p className="help-decision-lead">Nie musisz mieć pewności. Wybierz najbliższy opis, a podpowiemy następny krok.</p>
              <div className="help-decision-options" aria-label="Możliwe sytuacje">
                {helpDecisionScenarios.map((item) => (
                  <button key={item.id} type="button" onClick={() => choosePanel(item.id)} className="help-decision-option">
                    <span>{item.label}</span><ArrowRight aria-hidden="true" size={18} />
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {scenario ? (
            <>
              <p className="help-decision-eyebrow">{scenario.label}</p>
              <ScenarioPanel id={activePanel as HelpDecisionScenarioId} onChooseCategories={() => choosePanel("categories")} unsureSafety={unsureSafety} onUnsureSafetyChange={setUnsureSafety} />
            </>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="journey-help help-decision-page mx-auto w-full max-w-[1040px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-20">
      <header className="help-decision-hero">
        <div>
          <p className="help-decision-eyebrow">CHCĘ KOMUŚ POMÓC</p>
          <h1>Co dzieje się teraz?</h1>
          <p className="help-decision-lead">Wybierz jedną drogę. Nie musisz od razu wiedzieć, jak rozwiązać całą sytuację.</p>
        </div>
        <Image src="/brand/journeys/journey-help.png" alt="" width={420} height={340} className="help-decision-hero-art" aria-hidden="true" priority />
      </header>

      <aside className="help-decision-emergency" aria-label="Informacja o bezpieczeństwie">
        <p><AlertTriangle aria-hidden="true" size={18} />Bezpośrednie zagrożenie życia lub zdrowia?</p>
        <a href="tel:112">Zadzwoń 112</a>
      </aside>

      <section className="help-decision-foyer" aria-labelledby="help-decision-title">
        <h2 id="help-decision-title" className="sr-only">Wybierz sposób pomocy</h2>
        <button type="button" onClick={() => choosePanel("categories")} className="help-decision-entry">
          <span className="help-decision-entry-icon"><Search aria-hidden="true" size={24} /></span>
          <span className="help-decision-entry-copy"><strong>Wiem, czego ta osoba potrzebuje</strong><small>Znajdź konkretną usługę lub miejsce pomocy.</small></span>
          <ArrowRight aria-hidden="true" size={21} />
        </button>

        <Link href="/uruchom-pomoc" className="help-decision-entry">
          <span className="help-decision-entry-icon"><HeartHandshake aria-hidden="true" size={24} /></span>
          <span className="help-decision-entry-copy"><strong>Martwię się o tę osobę</strong><small>Przekaż lokalizację i krótki opis sytuacji.</small></span>
          <ArrowRight aria-hidden="true" size={21} />
        </Link>

        <button type="button" onClick={() => choosePanel("scenario-picker")} className="help-decision-entry">
          <span className="help-decision-entry-icon"><ShieldQuestion aria-hidden="true" size={24} /></span>
          <span className="help-decision-entry-copy"><strong>Nie wiem, co najlepiej zrobić</strong><small>Przejdź przez kilka prostych możliwości.</small></span>
          <ArrowRight aria-hidden="true" size={21} />
        </button>

        <Link href="/potrzeby" className="help-decision-entry help-decision-entry-volunteer">
          <span className="help-decision-entry-icon"><UsersRound aria-hidden="true" size={24} /></span>
          <span className="help-decision-entry-copy"><strong>Chcę pomóc jako wolontariusz</strong><small>Zobacz aktualne potrzeby organizacji w Łodzi.</small></span>
          <ArrowRight aria-hidden="true" size={21} />
        </Link>
      </section>
    </div>
  );
}
