"use client";

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowRight, ChevronUp, HeartHandshake, Search, ShieldQuestion } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { helpCategoryHref, helpDecisionScenarioDetails, helpDecisionScenarios, type HelpDecisionCategory, type HelpDecisionScenarioId } from "@/lib/help-requests/help-decision";

function CategoryPanel({ categories }: { categories: HelpDecisionCategory[] }) {
  return <nav id="help-category-panel" className="mt-3 grid gap-2 border-t border-border pt-3" aria-label="Kategorie pomocy">
    {categories.map((category) => <Link key={category.slug} href={helpCategoryHref(category.slug)} className="inline-flex min-h-11 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-bold hover:border-brand hover:bg-brand-soft"><span className="min-w-0 break-words">{category.label}</span><ArrowRight aria-hidden="true" className="shrink-0" size={16} /></Link>)}
  </nav>;
}

function EmergencyAction() {
  return <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
    <Image src="/brand/help-scenarios/help-emergency.png" alt="" width={72} height={72} className="help-situation-emergency-art" aria-hidden="true" />
    <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-[#7e2b0f]">Bezpośrednie zagrożenie? <a href="tel:112" className="font-extrabold text-[#b42318] underline underline-offset-2">Zadzwoń 112</a></p>
  </div>;
}

function ScenarioPanel({ id, onChooseCategories, panelRef, unsureSafety, onUnsureSafetyChange }: { id: HelpDecisionScenarioId; onChooseCategories: () => void; panelRef: RefObject<HTMLDivElement | null>; unsureSafety: "yes" | "no" | null; onUnsureSafetyChange: (value: "yes" | "no") => void }) {
  const detail = helpDecisionScenarioDetails[id];
  const isUnsure = id === "unsure";
  return <div ref={panelRef} tabIndex={-1} className="mt-3 border-t border-border pt-4 outline-none" aria-label={`Prowadzenie: ${detail.question}`}>
    {id === "public-place" ? <Image src="/brand/help-scenarios/help-sleeping.png" alt="" width={150} height={150} className="help-context-art" aria-hidden="true" /> : null}
    <p className="text-sm leading-6 text-muted-foreground">{detail.intro}</p>
    <p className="mt-4 text-sm font-extrabold">{detail.question}</p>
    {isUnsure ? <div className="mt-3 grid gap-3">
      <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="sr-only">Wybierz, czy czujesz się bezpiecznie, aby nawiązać kontakt</legend>{(["yes", "no"] as const).map((value) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm font-extrabold hover:border-brand"><input type="radio" name="unsure-contact-safety" value={value} checked={unsureSafety === value} onChange={() => onUnsureSafetyChange(value)} className="h-5 w-5 accent-[#0b7768]" />{value === "yes" ? "Tak" : "Nie / nie jestem pewien"}</label>)}</fieldset>
      {unsureSafety === "yes" ? <div className="grid gap-2"><p className="rounded-lg bg-brand-soft px-3 py-3 text-sm leading-6">Jeśli chcesz nawiązać kontakt, zapytaj spokojnie, czy osoba potrzebuje pomocy i czego najbardziej potrzebuje teraz.</p><button type="button" onClick={onChooseCategories} className="inline-flex min-h-11 items-center justify-between rounded-lg border border-brand px-3 py-2 text-left text-sm font-extrabold text-brand-strong hover:bg-brand-soft">Wiem już, czego potrzebuje <ArrowRight aria-hidden="true" size={16} /></button><Link href="/uruchom-pomoc" className="inline-flex min-h-11 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-extrabold hover:border-brand hover:bg-brand-soft">Nadal nie wiem lub nadal się martwię <ArrowRight aria-hidden="true" size={16} /></Link></div> : null}
      {unsureSafety === "no" ? <div className="grid gap-2"><p className="rounded-lg bg-surface-muted px-3 py-3 text-sm leading-6">Nie musisz podchodzić. Jeśli sytuacja nadal budzi Twój niepokój, możesz przekazać lokalizację i krótki opis.</p><Link href="/uruchom-pomoc" className="inline-flex min-h-11 items-center justify-between rounded-lg border border-brand px-3 py-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft">Przekaż informację <ArrowRight aria-hidden="true" size={16} /></Link></div> : null}
    </div> : <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={onChooseCategories} className="inline-flex min-h-11 items-center justify-between rounded-lg border border-brand px-3 py-2 text-left text-sm font-extrabold text-brand-strong hover:bg-brand-soft">Tak — znajdź konkretną pomoc <ArrowRight aria-hidden="true" size={16} /></button>
      <Link href="/uruchom-pomoc" className="inline-flex min-h-11 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-extrabold hover:border-brand hover:bg-brand-soft">Nie / nie wiem — przekaż informację <ArrowRight aria-hidden="true" size={16} /></Link>
    </div>}
    <EmergencyAction />
  </div>;
}

export function HelpDecisionEntry({ categories }: { categories: HelpDecisionCategory[] }) {
  const [activePanel, setActivePanel] = useState<"categories" | "scenario-picker" | HelpDecisionScenarioId | null>(null);
  const [unsureSafety, setUnsureSafety] = useState<"yes" | "no" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePanel) panelRef.current?.focus();
  }, [activePanel]);

  const showCategories = activePanel === "categories";

  function togglePanel(panel: "categories" | "scenario-picker" | HelpDecisionScenarioId) {
    setActivePanel((current) => current === panel ? null : panel);
    if (panel !== "unsure") setUnsureSafety(null);
  }

  return (
    <div className="journey-help mx-auto w-full max-w-[1040px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-20">
      <header className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">Chcę komuś pomóc</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">Chcesz komuś pomóc?</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Wybierz sytuację, a podpowiemy Ci, co możesz zrobić teraz.</p>
      </header>

      <aside className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-[#e9521a]/35 bg-[#fff8f3] p-3 sm:mt-6 sm:flex-row sm:gap-3 sm:p-4" aria-label="Informacja o bezpieczeństwie">
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold leading-5 text-[#7e2b0f] sm:items-start sm:gap-3 sm:leading-6"><AlertTriangle aria-hidden="true" className="shrink-0" size={18} />Bezpośrednie zagrożenie życia lub zdrowia?</p>
        <a href="tel:112" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[#b42318] px-3 py-2 text-sm font-bold text-white hover:bg-[#8f1d14] sm:min-h-11 sm:px-4">Zadzwoń 112</a>
      </aside>

      <section className="mt-8 grid items-start gap-4 lg:grid-cols-2" aria-labelledby="help-decision-title">
        <h2 id="help-decision-title" className="sr-only">Wybierz, co możesz zrobić</h2>
        <article className="help-situation-card flex min-w-0 flex-col rounded-xl border border-border bg-surface p-5 shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
          <div className="help-situation-copy">
            <Search aria-hidden="true" className="text-brand-strong" size={27} />
            <h3 className="mt-4 text-xl font-extrabold">Chcę znaleźć konkretną pomoc</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Wiesz mniej więcej, czego ta osoba potrzebuje? Wybierz kategorię i znajdź miejsce.</p>
            <button type="button" onClick={() => togglePanel("categories")} aria-expanded={showCategories} aria-controls="help-category-panel" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-foreground hover:bg-brand-strong hover:text-white">{showCategories ? "Ukryj kategorie" : "Wybierz kategorię"}{showCategories ? <ChevronUp aria-hidden="true" size={17} /> : <ArrowRight aria-hidden="true" size={17} />}</button>
          </div>
          <Image src="/brand/help-scenarios/help-general.png" alt="" width={220} height={220} className="help-situation-art" aria-hidden="true" />
          {showCategories ? <CategoryPanel categories={categories} /> : null}
        </article>

        <article className="help-situation-card flex min-w-0 flex-col rounded-xl border border-border bg-surface p-5 shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
          <div className="help-situation-copy">
            <HeartHandshake aria-hidden="true" className="text-brand-strong" size={27} />
            <h3 className="mt-4 text-xl font-extrabold">Martwię się o tę osobę</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Przekaż lokalizację i opisz sytuację. Nie musisz znać dokładnej potrzeby.</p>
            <Link href="/uruchom-pomoc" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft">Chcę przekazać informację <ArrowRight aria-hidden="true" size={17} /></Link>
          </div>
          <Image src="/brand/help-scenarios/help-concern.png" alt="" width={220} height={220} className="help-situation-art" aria-hidden="true" />
        </article>

        <article className="help-situation-card help-situation-card-feature flex min-w-0 flex-col rounded-xl border border-border bg-surface p-5 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] lg:col-span-2">
          <div className="help-situation-copy">
            <ShieldQuestion aria-hidden="true" className="text-brand-strong" size={27} />
            <h3 className="mt-4 text-xl font-extrabold">Nie wiem, co najlepiej zrobić</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Przejdź przez kilka prostych możliwości i wybierz następny krok.</p>
            <button type="button" onClick={() => setActivePanel((current) => current === "scenario-picker" ? null : "scenario-picker")} aria-expanded={activePanel === "scenario-picker"} aria-controls="help-scenario-flow-panel" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft">{activePanel === "scenario-picker" ? "Ukryj możliwości" : activePanel && activePanel !== "categories" ? "Zmień sytuację" : "Sprawdź możliwości"}{activePanel === "scenario-picker" ? <ChevronUp aria-hidden="true" size={17} /> : <ArrowRight aria-hidden="true" size={17} />}</button>
          </div>
          {activePanel !== null && activePanel !== "categories" ? <div id="help-scenario-flow-panel">{activePanel === "scenario-picker" ? <div className="mt-3 grid gap-2 border-t border-border pt-3" aria-label="Możliwe sytuacje">{helpDecisionScenarios.map((scenario) => <button key={scenario.id} type="button" onClick={() => togglePanel(scenario.id)} className="inline-flex min-h-11 items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm font-bold hover:border-brand hover:bg-brand-soft"><span className="min-w-0 break-words">{scenario.label}</span><ArrowRight aria-hidden="true" className="shrink-0" size={16} /></button>)}</div> : <><p className="mt-3 border-t border-border pt-4 text-xs font-bold uppercase tracking-wide text-brand-strong">{helpDecisionScenarios.find((scenario) => scenario.id === activePanel)?.label}</p><ScenarioPanel id={activePanel} onChooseCategories={() => setActivePanel("categories")} panelRef={panelRef} unsureSafety={unsureSafety} onUnsureSafetyChange={setUnsureSafety} /></>}</div> : null}
        </article>
      </section>

      {activePanel === null ? <section className="mt-9 border-t border-border pt-7" aria-labelledby="practical-help-title">
        <h2 id="practical-help-title" className="text-xl font-extrabold">Co możesz zrobić teraz?</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
          <li>Jeśli jest bezpiecznie, zapytaj tę osobę, czego potrzebuje.</li>
          <li>Możesz wskazać jej konkretne miejsce pomocy.</li>
          <li>Jeśli nie wiesz, wybierz krótką ścieżkę decyzji powyżej.</li>
          <li>Przekaż informację dopiero wtedy, gdy jest to potrzebne.</li>
        </ul>
      </section> : null}
    </div>
  );
}
