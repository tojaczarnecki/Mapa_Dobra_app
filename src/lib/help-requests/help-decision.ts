export type HelpDecisionCategory = { slug: string; label: string };
export type HelpDecisionScenarioId = "disoriented" | "public-place" | "unsure";

export function helpCategoryHref(slug: string) {
  return slug === "nocleg" ? "/znajdz-nocleg" : `/szukaj?kategoria=${encodeURIComponent(slug)}`;
}

export const helpDecisionScenarios = [
  { id: "disoriented", label: "Osoba wygląda na zagubioną lub zdezorientowaną" },
  { id: "public-place", label: "Osoba śpi lub przebywa w miejscu publicznym" },
  { id: "unsure", label: "Nie potrafię ocenić sytuacji" },
] as const;

export const helpDecisionScenarioDetails: Record<HelpDecisionScenarioId, {
  intro: string;
  question: string;
}> = {
  disoriented: {
    intro: "Jeśli czujesz się bezpiecznie, możesz spokojnie zapytać tę osobę, czy potrzebuje pomocy. Nie musisz wiedzieć, dlaczego zachowuje się w ten sposób.",
    question: "Czy udało Ci się dowiedzieć, czego potrzebuje?",
  },
  "public-place": {
    intro: "Sam fakt, że ktoś śpi lub przebywa w miejscu publicznym, nie mówi jeszcze, jakiej pomocy potrzebuje. Jeśli czujesz się bezpiecznie i chcesz nawiązać kontakt, możesz spokojnie zapytać, czy osoba czegoś potrzebuje.",
    question: "Czy wiesz już, czego osoba potrzebuje?",
  },
  unsure: {
    intro: "Nie musisz wiedzieć, czego dokładnie potrzeba. Najpierw pomyśl o swoim bezpieczeństwie i o tym, czy możesz spokojnie nawiązać kontakt.",
    question: "Czy czujesz się bezpiecznie, żeby zapytać tę osobę, czy potrzebuje pomocy?",
  },
};
