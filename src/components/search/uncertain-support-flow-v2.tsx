"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MainNeed = "basic" | "shelter" | "health" | "advice";
type Screen = "main" | "branch" | "shelter" | "unknown";

const mainNeeds = [
  ["basic", "Potrzebuję czegoś podstawowego", "Jedzenie, higiena albo odzież."],
  ["shelter", "Potrzebuję bezpiecznego miejsca", "Na dziś lub na noc."],
  ["health", "Chodzi o zdrowie lub samopoczucie", "Pomoc związana ze zdrowiem albo rozmową."],
  ["advice", "Potrzebuję porady lub wsparcia", "Nie wiem, co zrobić albo z kim porozmawiać."],
] as const;

const branchOptions: Record<Exclude<MainNeed, "shelter">, readonly [string, string, string][]> = {
  basic: [
    ["Coś zjeść lub napić się", "", "/szukaj?kategoria=jedzenie"],
    ["Umyć się lub zadbać o higienę", "", "/szukaj?kategoria=higiena"],
    ["Potrzebuję odzieży", "", "/szukaj?kategoria=odziez"],
  ],
  health: [
    ["Potrzebuję pomocy związanej ze zdrowiem", "", "/szukaj?kategoria=pomoc-medyczna"],
    ["Potrzebuję rozmowy albo wsparcia", "Nie wiem, co zrobić albo z kim porozmawiać.", "/szukaj?kategoria=pomoc-socjalna"],
  ],
  advice: [
    ["Potrzebuję porady w konkretnej sprawie", "Formalności, prawo, dokumenty.", "/szukaj?kategoria=pomoc-prawna"],
    ["Chcę z kimś porozmawiać", "Potrzebuję wsparcia lub nie wiem, co zrobić.", "/szukaj?kategoria=pomoc-socjalna"],
  ],
};

const branchHeadings: Record<Exclude<MainNeed, "shelter">, string> = {
  basic: "Czego potrzebujesz najpierw?",
  health: "Co jest bliższe Twojej sytuacji?",
  advice: "Jakiego rodzaju pomocy szukasz?",
};

const branchDescriptions: Record<Exclude<MainNeed, "shelter">, string> = {
  basic: "Wybierz jedną rzecz, od której najłatwiej zacząć.",
  health: "Nie musisz opisywać objawów. Wybierz najbliższą drogę.",
  advice: "Wybierz kierunek, który najlepiej pasuje do Twojej sytuacji.",
};

function EmergencyEscape() {
  return <p className="uncertain-flow-emergency"><Phone aria-hidden="true" size={16} /><span>Bezpośrednie zagrożenie życia lub zdrowia?</span> <a href="tel:112">Zadzwoń 112</a></p>;
}

function readScreenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const urlNeed = params.get("potrzeba") as MainNeed | null;
  const urlStep = params.get("krok");
  const validNeed = ["basic", "shelter", "health", "advice"].includes(urlNeed ?? "") ? urlNeed : null;
  const screen: Screen = urlStep === "2" && validNeed === "shelter"
    ? "shelter"
    : urlStep === "2" && validNeed
      ? "branch"
      : urlStep === "2"
        ? "unknown"
        : "main";
  return { need: validNeed, screen };
}

export function UncertainSupportFlow() {
  const [screen, setScreen] = useState<Screen>("main");
  const [need, setNeed] = useState<MainNeed | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    function syncFromUrl() {
      const state = readScreenFromUrl();
      setNeed(state.need);
      setScreen(state.screen);
    }
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    flowRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [screen]);

  const progress = screen === "main" ? 1 : 2;

  function navigateTo(nextScreen: Screen, nextNeed: MainNeed | null = need) {
    const url = new URL(window.location.href);
    url.searchParams.set("tryb", "guided");
    url.searchParams.set("krok", nextScreen === "main" ? "1" : "2");
    if (nextNeed) url.searchParams.set("potrzeba", nextNeed);
    else url.searchParams.delete("potrzeba");
    window.history.pushState({}, "", url);
    setNeed(nextNeed);
    setScreen(nextScreen);
  }

  function chooseNeed(value: MainNeed) {
    navigateTo(value === "shelter" ? "shelter" : "branch", value);
  }

  return <div ref={flowRef} className="uncertain-flow-page guided-flow-page mobile-nav-safe-content mx-auto w-full max-w-[820px] px-4 pb-28 pt-6 sm:px-6 sm:pt-12 lg:px-8" aria-labelledby="uncertain-flow-title">
    <div className="uncertain-flow-progress" aria-label={`Krok ${progress} z 2`}><span>Krok {progress} z 2</span><span className="uncertain-flow-progress-track"><span style={{ width: `${progress * 50}%` }} /></span></div>

    <section className={`uncertain-flow-canvas uncertain-flow-screen-${screen}`}>
      <p className="uncertain-flow-eyebrow">{screen === "shelter" ? "NA DZIŚ" : screen === "unknown" ? "TO TEŻ JEST OK" : "NIE WIEM, CZEGO POTRZEBUJĘ"}</p>

      {screen === "main" ? <div className="uncertain-flow-question">
        <h1 ref={headingRef} id="uncertain-flow-title" tabIndex={-1}>Co byłoby teraz największą pomocą?</h1>
        <p>Wybierz odpowiedź, która jest najbliżej Twojej sytuacji. Nie musisz znać nazwy usługi ani miejsca.</p>
        <div className="uncertain-flow-choices" role="list">{mainNeeds.map(([value, title, description]) => <button key={value} type="button" className="uncertain-flow-choice" onClick={() => chooseNeed(value)}><span className="uncertain-flow-choice-copy"><strong>{title}</strong><small>{description}</small></span><ArrowRight aria-hidden="true" size={20} /></button>)}</div>
        <button type="button" className="uncertain-flow-secondary" onClick={() => navigateTo("unknown", null)}>Nadal nie wiem <ArrowRight aria-hidden="true" size={17} /></button>
      </div> : null}

      {screen === "branch" && need && need !== "shelter" ? <div className="uncertain-flow-question">
        <h1 ref={headingRef} id="uncertain-flow-title" tabIndex={-1}>{branchHeadings[need]}</h1>
        <p>{branchDescriptions[need]}</p>
        <div className="uncertain-flow-choices" role="list">{branchOptions[need].map(([title, description, href]) => <Link key={href} href={href} className="uncertain-flow-choice"><span className="uncertain-flow-choice-copy"><strong>{title}</strong>{description ? <small>{description}</small> : null}</span><ArrowRight aria-hidden="true" size={20} /></Link>)}</div>
      </div> : null}

      {screen === "shelter" ? <div className="uncertain-flow-result">
        <h1 ref={headingRef} id="uncertain-flow-title" tabIndex={-1}>Poszukajmy miejsca, w którym możesz zostać.</h1>
        <p>Sprawdzimy miejsca, które mogą przyjąć dziś.</p>
        <div className="uncertain-flow-result-actions">
          <Link href="/znajdz-nocleg" className="uncertain-flow-primary">Znajdź nocleg na dzisiaj <ArrowRight aria-hidden="true" size={20} /></Link>
          <Link href="/szukaj?kategoria=nocleg" className="uncertain-flow-secondary">Pokaż wszystkie miejsca noclegowe <ArrowRight aria-hidden="true" size={17} /></Link>
        </div>
      </div> : null}

      {screen === "unknown" ? <div className="uncertain-flow-result">
        <h1 ref={headingRef} id="uncertain-flow-title" tabIndex={-1}>Możesz zacząć od miejsc, które pomagają teraz.</h1>
        <p>Nie musisz od razu wiedzieć, czego dokładnie potrzebujesz. Zobacz dostępne możliwości i wybierz pierwszy krok.</p>
        <div className="uncertain-flow-result-actions">
          <Link href="/mapa?otwarte=1" className="uncertain-flow-primary">Pokaż pomoc dostępną teraz <ArrowRight aria-hidden="true" size={20} /></Link>
          <Link href="/szukaj" className="uncertain-flow-secondary">Pokaż wszystkie miejsca <ArrowRight aria-hidden="true" size={17} /></Link>
        </div>
      </div> : null}
    </section>

    <div className="uncertain-flow-footer">
      {screen === "main" ? <Link href="/szukam" className="uncertain-flow-back"><ArrowLeft aria-hidden="true" size={18} />Wróć do wyszukiwania</Link> : <button type="button" className="uncertain-flow-back" onClick={() => window.history.back()}><ArrowLeft aria-hidden="true" size={18} />Wstecz</button>}
      <EmergencyEscape />
    </div>
  </div>;
}
