export type HelpGuideReviewStatus = "PUBLISHED" | "NEEDS_EXPERT_REVIEW";
export type HelpGuideReviewArea = "streetwork" | "social-work" | "emergency";

export type HelpGuide = {
  slug: string;
  title: string;
  shortTitle?: string;
  intro: string;
  situation?: string;
  steps: string[];
  avoid: string[];
  emergency?: {
    title: string;
    body: string;
  };
  nextAction: {
    label: string;
    href: string;
  };
  reviewStatus: HelpGuideReviewStatus;
  reviewArea?: HelpGuideReviewArea;
};

const emergencyGuidance = {
  title: "Kiedy zadzwonić pod 112",
  body: "Jeśli ktoś jest nieprzytomny, ma poważne trudności z oddychaniem, jest ciężko ranny lub znajduje się w bezpośrednim niebezpieczeństwie, zadzwoń pod 112. Dobra Mapa nie powiadamia służb ratunkowych.",
};

export const helpGuides: HelpGuide[] = [
  {
    slug: "jak-zaczac-rozmowe",
    title: "Jak zacząć rozmowę i uszanować odmowę",
    shortTitle: "Zacząć rozmowę",
    intro: "Nie musisz znać historii osoby ani od razu wiedzieć, czego potrzebuje. Wystarczy spokojne pytanie i gotowość, by uszanować jej odpowiedź.",
    steps: [
      "Jeśli czujesz się bezpiecznie, zachowaj spokojny ton i odpowiedni dystans.",
      "Zacznij od prostego pytania: „Czy mogę jakoś pomóc?”.",
      "Posłuchaj odpowiedzi i zapytaj, czego osoba potrzebuje teraz, jeśli chce rozmawiać.",
      "Jeśli wskazana jest konkretna pomoc, wspólnie znajdźcie najbliższe miejsce.",
      "Uszanuj odmowę. Możesz powiedzieć, że pomoc jest dostępna, gdy osoba zmieni zdanie.",
    ],
    avoid: [
      "Nie dotykaj osoby bez jej zgody i nie zmuszaj jej do rozmowy.",
      "Nie fotografuj ani nie publikuj sytuacji bez wyraźnej potrzeby i zgody.",
      "Nie obiecuj czegoś, czego nie możesz zrobić.",
    ],
    nextAction: { label: "Chcę komuś pomóc", href: "/pomagam" },
    reviewStatus: "PUBLISHED",
  },
  {
    slug: "pieniadze-czy-konkretna-pomoc",
    title: "Pieniądze czy konkretna pomoc?",
    shortTitle: "Pieniądze czy pomoc",
    intro: "Nie ma jednej dobrej odpowiedzi. Możesz zapytać, czego osoba potrzebuje, zaproponować konkretną rzecz albo zdecydować, że tym razem nie pomożesz.",
    steps: [
      "Jeśli chcesz, zapytaj, czego osoba potrzebuje najbardziej teraz.",
      "Możesz zaproponować konkretną rzecz, na przykład jedzenie lub napój.",
      "Jeśli osoba chce, wskaż jej miejsce, w którym może otrzymać pomoc.",
      "Jeśli sytuacja nadal budzi Twój niepokój, przejdź do „Pomagam” i sprawdź, co możesz zrobić.",
    ],
    avoid: [
      "Nie zakładaj, że wiesz lepiej, czego osoba potrzebuje.",
      "Nie żądaj wyjaśnień, na co osoba przeznaczy pomoc.",
      "Możesz odmówić bez zawstydzania i oceniania.",
    ],
    nextAction: { label: "Chcę komuś pomóc", href: "/pomagam" },
    reviewStatus: "PUBLISHED",
  },
  {
    slug: "jak-wskazac-miejsce-pomocy",
    title: "Jak wskazać konkretne miejsce pomocy",
    shortTitle: "Wskazać miejsce pomocy",
    intro: "Sama nazwa organizacji może nie wystarczyć. Pomocna informacja obejmuje także dostępność, warunki przyjęcia, godziny i sposób dotarcia.",
    steps: [
      "Zapytaj, jakiej pomocy osoba szuka, jeśli chce o tym powiedzieć.",
      "Wyszukaj kategorię odpowiadającą tej potrzebie.",
      "Sprawdź na karcie miejsce, adres, godziny i najważniejsze warunki.",
      "Pokaż trasę albo przekaż adres i możliwie prosty sposób dotarcia.",
      "Jeśli dane wymagają potwierdzenia, zachęć do telefonu przed wyjściem.",
    ],
    avoid: [
      "Nie obiecuj, że miejsce na pewno przyjmie osobę.",
      "Nie pomijaj warunków, które mogą mieć znaczenie dla skorzystania z pomocy.",
    ],
    nextAction: { label: "Znajdź miejsce pomocy", href: "/szukam" },
    reviewStatus: "PUBLISHED",
  },
  {
    slug: "kiedy-przekazac-informacje",
    title: "Kiedy warto przekazać informację o sytuacji",
    shortTitle: "Przekazać informację",
    intro: "Przekazanie informacji może być właściwym następnym krokiem, gdy sytuacja nadal budzi niepokój, a osoba nie może lub nie chce teraz skorzystać z konkretnej pomocy.",
    steps: [
      "Najpierw pomyśl o swoim bezpieczeństwie i nie podchodź, jeśli nie czujesz się bezpiecznie.",
      "Jeśli to możliwe, zapytaj spokojnie, czy osoba potrzebuje pomocy.",
      "Jeśli nie znasz potrzeby, przekaż możliwie dokładne miejsce i krótki opis sytuacji.",
      "Pamiętaj, że formularz zapisuje informację do kolejki weryfikacji i nie wysyła automatycznie służb.",
    ],
    avoid: [
      "Nie opisuj osoby bardziej szczegółowo, niż to potrzebne do zrozumienia sytuacji.",
      "Nie przedstawiaj obserwacji jako pewnej diagnozy.",
      "Nie zakładaj, że po wysłaniu ktoś natychmiast przyjedzie.",
    ],
    nextAction: { label: "Chcę komuś pomóc", href: "/pomagam" },
    reviewStatus: "NEEDS_EXPERT_REVIEW",
    reviewArea: "streetwork",
  },
  {
    slug: "kiedy-dzwonic-pod-112",
    title: "Kiedy dzwonić pod 112",
    intro: "Numer 112 służy do zgłaszania bezpośredniego zagrożenia życia lub zdrowia. W takiej sytuacji nie czekaj na formularz Dobrej Mapy.",
    steps: [
      "Jeśli ktoś jest nieprzytomny, ma poważne trudności z oddychaniem lub jest ciężko ranny, zadzwoń pod 112.",
      "Zadzwoń także wtedy, gdy ktoś znajduje się w bezpośrednim niebezpieczeństwie.",
      "Powiedz dyspozytorowi, gdzie jesteś i co widzisz.",
    ],
    avoid: [
      "Nie czekaj na odpowiedź z formularza, jeśli zagrożenie jest bezpośrednie.",
      "Nie zakładaj, że Dobra Mapa powiadomi służby za Ciebie.",
    ],
    emergency: emergencyGuidance,
    nextAction: { label: "Zadzwoń 112", href: "tel:112" },
    reviewStatus: "NEEDS_EXPERT_REVIEW",
    reviewArea: "emergency",
  },
  {
    slug: "osoba-spi-w-miejscu-publicznym",
    title: "Gdy ktoś śpi lub przebywa w miejscu publicznym",
    shortTitle: "Osoba śpi w miejscu publicznym",
    intro: "Sam fakt spania lub przebywania w miejscu publicznym nie mówi jeszcze, jakiej pomocy potrzebuje. Zacznij od bezpieczeństwa i szacunku.",
    steps: [
      "Jeśli czujesz się bezpiecznie i chcesz nawiązać kontakt, możesz spokojnie zapytać, czy osoba czegoś potrzebuje.",
      "Jeśli osoba wskaże konkretną potrzebę, znajdź odpowiednie miejsce pomocy.",
      "Jeśli nie chcesz podchodzić albo nadal się martwisz, możesz przekazać lokalizację i krótki opis sytuacji.",
    ],
    avoid: [
      "Nie zakładaj na podstawie samej obserwacji, że osoba potrzebuje noclegu.",
      "Nie budź osoby fizycznym kontaktem i nie zmuszaj jej do rozmowy.",
      "Nie używaj etykiet zamiast opisu tego, co faktycznie widzisz.",
    ],
    emergency: emergencyGuidance,
    nextAction: { label: "Sprawdź, co możesz zrobić", href: "/pomagam" },
    reviewStatus: "NEEDS_EXPERT_REVIEW",
    reviewArea: "streetwork",
  },
  {
    slug: "pomoc-w-trudnych-warunkach",
    title: "Jak pomagać podczas trudnych warunków pogodowych",
    shortTitle: "Trudne warunki pogodowe",
    intro: "Mróz, upał lub długotrwały deszcz mogą zwiększać ryzyko. Zadbaj o własne bezpieczeństwo i wybierz działanie, które jest możliwe tu i teraz.",
    steps: [
      "Jeśli czujesz się bezpiecznie, zapytaj, czy osoba potrzebuje konkretnej pomocy.",
      "Możesz wskazać miejsce z jedzeniem, higieną lub noclegiem, zależnie od odpowiedzi.",
      "Jeśli nie możesz nawiązać kontaktu, przekaż lokalizację i krótki opis sytuacji.",
    ],
    avoid: [
      "Nie podejmuj działań, które narażają Ciebie lub tę osobę na dodatkowe ryzyko.",
      "Nie diagnozuj stanu zdrowia na podstawie wyglądu.",
    ],
    emergency: emergencyGuidance,
    nextAction: { label: "Sprawdź, co możesz zrobić", href: "/pomagam" },
    reviewStatus: "NEEDS_EXPERT_REVIEW",
    reviewArea: "streetwork",
  },
  {
    slug: "czego-unikac-pomagajac",
    title: "Czego lepiej nie robić, pomagając",
    shortTitle: "Czego unikać",
    intro: "Dobra pomoc nie musi oznaczać przejęcia kontroli. Najważniejsze są bezpieczeństwo, zgoda i poszanowanie decyzji osoby.",
    steps: [
      "Zapytaj, czy osoba chce pomocy, zamiast od razu działać za nią.",
      "Zaproponuj konkretną możliwość i pozwól jej zdecydować.",
      "Uszanuj odmowę oraz własne granice.",
      "Jeśli sytuacja budzi niepokój, przejdź do „Pomagam” i sprawdź, co możesz zrobić.",
    ],
    avoid: [
      "Nie dotykaj osoby bez jej zgody, nie zawstydzaj jej i nie podnoś głosu.",
      "Nie fotografuj ani nie publikuj wizerunku osoby bez jej zgody.",
      "Nie diagnozuj i nie przypisuj osobie historii, której nie znasz.",
      "Nie obiecuj interwencji ani rezultatu, na który nie masz wpływu.",
    ],
    nextAction: { label: "Chcę komuś pomóc", href: "/pomagam" },
    reviewStatus: "PUBLISHED",
  },
];

export function getHelpGuide(slug: string) {
  return helpGuides.find((guide) => guide.slug === slug);
}

export function getPublicHelpGuides() {
  return helpGuides.filter((guide) => guide.reviewStatus === "PUBLISHED");
}

export function getPublicHelpGuide(slug: string) {
  const guide = getHelpGuide(slug);
  return guide?.reviewStatus === "PUBLISHED" ? guide : undefined;
}
