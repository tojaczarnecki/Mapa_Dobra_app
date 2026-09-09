import { normalizePublicSearch, type PublicSearchFilters, type PublicSearchPlace } from "./search.ts";

export type SearchIntentToken = {
  id: string;
  label: string;
  filterKey: keyof PublicSearchFilters;
  value: string | boolean;
};

export type SearchIntent = {
  recognized: boolean;
  sentenceLike: boolean;
  filters: Partial<PublicSearchFilters>;
  tokens: SearchIntentToken[];
};

const categoryMatchers = [
  {
    slug: "jedzenie",
    label: "Jedzenie",
    phrases: [
      "jedzenie", "jesc", "zjesc", "zjem", "jem", "posilek", "cieply posilek", "obiad", "zupa",
      "jadlodajnia", "stolowka", "glodny", "glodna", "kanapki", "zywnosc",
    ],
  },
  {
    slug: "nocleg",
    label: "Nocleg",
    phrases: [
      "nocleg", "spac", "spac dzisiaj", "przenocowac", "noclegownia", "schronisko",
      "ogrzewalnia", "lozko", "dach nad glowa", "nie mam gdzie spac",
    ],
  },
  {
    slug: "higiena",
    label: "Higiena",
    phrases: ["higiena", "prysznic", "kapiel", "umyc sie", "chce sie umyc", "umycie", "umyć"],
  },
  {
    slug: "pomoc-medyczna",
    label: "Zdrowie",
    phrases: ["lekarz", "medyczna", "medyczny", "zdrowie", "rana", "opatrunek", "pielegniarka"],
  },
  {
    slug: "pomoc-prawna",
    label: "Pomoc prawna",
    phrases: ["prawnik", "prawna", "prawny", "prawo", "porada prawna", "porady prawne", "prawnicza"],
  },
  {
    slug: "pomoc-psychologiczna",
    label: "Wsparcie psychologiczne",
    phrases: ["psycholog", "psychologiczna", "psychiczny", "kryzys psychiczny", "rozmowa z psychologiem"],
  },
  {
    slug: "pomoc-socjalna",
    label: "Pomoc socjalna",
    phrases: ["pomoc socjalna", "praca socjalna", "wsparcie socjalne"],
  },
  {
    slug: "odziez",
    label: "Odzież",
    phrases: [
      "odziez", "ubranie", "ubrania", "ubran", "buty", "kurtka", "kurtk", "cieple ubrania", "cieplej kurtki",
    ],
  },
  {
    slug: "lodowka-spoleczna",
    label: "Lodówka społeczna",
    phrases: ["lodowka", "lodowka spoleczna", "jadlodzielnia"],
  },
] as const;

function containsAny(query: string, phrases: readonly string[]) {
  return phrases.some((phrase) => query.includes(normalizePublicSearch(phrase)));
}

function addToken(
  tokens: SearchIntentToken[],
  id: string,
  label: string,
  filterKey: keyof PublicSearchFilters,
  value: string | boolean,
) {
  tokens.push({ id, label, filterKey, value });
}

export function interpretSearchQuery(query: string): SearchIntent {
  const normalized = normalizePublicSearch(query);
  const wordCount = normalized.split(" ").filter(Boolean).length;
  const sentenceLike = wordCount >= 2;
  const filters: Partial<PublicSearchFilters> = {};
  const tokens: SearchIntentToken[] = [];

  if (!normalized || !sentenceLike) {
    return { recognized: false, sentenceLike, filters, tokens };
  }

  const category = categoryMatchers.find((candidate) => containsAny(normalized, candidate.phrases));
  if (category) {
    filters.category = category.slug;
    addToken(tokens, `category-${category.slug}`, category.label, "category", category.slug);
  }

  const openNow = containsAny(normalized, [
    "teraz", "otwarte teraz", "czynne teraz", "w tej chwili", "jeszcze otwarte",
  ]);
  if (openNow) {
    filters.openNow = true;
    addToken(tokens, "open-now", "Otwarte teraz", "openNow", true);
  }

  const today = containsAny(normalized, ["dzisiaj", "dzis", "na dzisiaj", "na dzis", "tego dnia", "dostepne dzisiaj", "dostepne dzis"]);
  if (today && !openNow) {
    filters.today = true;
    addToken(tokens, "today", "Dzisiaj", "today", true);
  }

  const free = containsAny(normalized, [
    "bezplatnie", "za darmo", "darmowe", "darmowy", "darmowa", "bez oplat", "bez oplaty",
  ]);
  if (free) {
    filters.free = true;
    addToken(tokens, "free", "Bezpłatne", "free", true);
  }

  const noReferral = containsAny(normalized, [
    "bez skierowania", "nie mam skierowania", "bez zaswiadczenia", "bez zaświadczenia",
  ]);
  if (noReferral) {
    filters.noReferral = true;
    addToken(tokens, "no-referral", "Bez skierowania", "noReferral", true);
  }

  const noDocuments = containsAny(normalized, [
    "bez dokumentow", "bez dokumentu", "bez dowodu", "nie mam dokumentow", "nie mam dokumentu", "nie mam dowodu",
  ]);
  if (noDocuments) {
    filters.noDocuments = true;
    addToken(tokens, "no-documents", "Bez dokumentów", "noDocuments", true);
  }

  return {
    recognized: tokens.length > 0,
    sentenceLike,
    filters,
    tokens,
  };
}

export type SearchSuggestion = {
  id: string;
  label: string;
  description: string;
  query: string;
};

export type SmartSearchSuggestion = SearchSuggestion & {
  group: "Kategoria" | "Szybka akcja" | "Miejsce" | "Interpretacja" | "Wyszukiwanie";
  href: string;
};

export type SmartSearchPlace = Pick<PublicSearchPlace, "id" | "name" | "categorySlug" | "slug" | "searchText">;

type SmartSearchOptions = {
  categories?: Array<{ label: string; slug: string }>;
  places?: SmartSearchPlace[];
  limit?: number;
};

const quickActionSuggestions: SmartSearchSuggestion[] = [
  { id: "action-open-now", label: "Otwarte teraz", description: "Szybka akcja", group: "Szybka akcja", query: "otwarte teraz", href: "/szukaj?otwarte=1" },
  { id: "action-today", label: "Dostępne dzisiaj", description: "Szybka akcja", group: "Szybka akcja", query: "dostępne dzisiaj", href: "/szukaj?dzisiaj=1" },
];

function suggestionHref(query: string) {
  const intent = interpretSearchQuery(query);
  if (intent.recognized) return searchIntentHref(query);
  return `/szukaj?q=${encodeURIComponent(query.trim())}`;
}

function phraseMatches(value: string, query: string) {
  const normalizedValue = normalizePublicSearch(value);
  const normalizedQuery = normalizePublicSearch(query);
  return normalizedValue.includes(normalizedQuery) || normalizedQuery.includes(normalizedValue);
}

export function getSmartSearchSuggestions(query: string, options: SmartSearchOptions = {}): SmartSearchSuggestion[] {
  const normalized = normalizePublicSearch(query);
  if (normalized.length < 2) return [];

  const categories = options.categories ?? categoryMatchers.map(({ label, slug }) => ({ label, slug }));
  const categoriesFound = categories
    .filter((category) => phraseMatches(`${category.label} ${category.slug}`, query) || categoryMatchers.some((matcher) => matcher.slug === category.slug && matcher.phrases.some((phrase) => phraseMatches(phrase, query))))
    .sort((left, right) => {
      const leftDirect = phraseMatches(`${left.label} ${left.slug}`, query) ? 0 : 1;
      const rightDirect = phraseMatches(`${right.label} ${right.slug}`, query) ? 0 : 1;
      return leftDirect - rightDirect;
    })
    .slice(0, 5)
    .map((category) => ({
      id: `category-${category.slug}`,
      label: category.label,
      description: "Kategoria pomocy",
      group: "Kategoria" as const,
      query: category.slug,
    }));

  const intent = interpretSearchQuery(query);
  const interpreted = intent.recognized
    ? [{
        id: "intent-best-match",
        label: `Rozumiem: ${intent.tokens.map((token) => token.label).join(" · ")}`,
        description: "Zastosuj rozpoznane kryteria",
        group: "Interpretacja" as const,
        query,
      }]
    : [];

  const actions = quickActionSuggestions
    .filter((suggestion) => phraseMatches(suggestion.label, query))
    .map((suggestion) => ({ ...suggestion }));

  const places = (options.places ?? [])
    .filter((place) => phraseMatches(`${place.name} ${place.searchText}`, query))
    .slice(0, 5)
    .map((place) => ({
      id: `place-${place.id}`,
      label: place.name,
      description: "Miejsce",
      group: "Miejsce" as const,
      query,
    }));

  const suggestions = [...interpreted, ...categoriesFound, ...actions, ...places].map((suggestion) => ({
    ...suggestion,
    href: suggestion.group === "Kategoria"
      ? `/szukaj?kategoria=${encodeURIComponent(suggestion.query)}`
      : suggestion.group === "Miejsce"
      ? `/lodz/${(options.places ?? []).find((place) => `place-${place.id}` === suggestion.id)?.categorySlug || "inne"}/${(options.places ?? []).find((place) => `place-${place.id}` === suggestion.id)?.slug || ""}`
      : suggestionHref(suggestion.query),
  }));

  if (suggestions.length > 0) return suggestions.slice(0, options.limit ?? 8);
  return [{
    id: "free-text-search",
    label: `Szukaj „${query.trim()}”`,
    description: "Wyszukiwanie tekstowe",
    group: "Wyszukiwanie",
    query: query.trim(),
    href: suggestionHref(query),
  }];
}

const defaultSuggestions: SearchSuggestion[] = [
  { id: "food", label: "Jedzenie", description: "Kategoria pomocy", query: "jedzenie" },
  { id: "accommodation", label: "Nocleg na dzisiaj", description: "Kategoria pomocy", query: "nocleg na dzisiaj" },
  { id: "hygiene", label: "Higiena / prysznic", description: "Kategoria pomocy", query: "higiena" },
  { id: "medical", label: "Pomoc medyczna", description: "Kategoria pomocy", query: "pomoc medyczna" },
  { id: "legal", label: "Pomoc prawna", description: "Kategoria pomocy", query: "pomoc prawna" },
];

export function searchIntentSuggestions(query: string): SearchSuggestion[] {
  if (!normalizePublicSearch(query)) return defaultSuggestions;
  return getSmartSearchSuggestions(query, { limit: 5 })
    .sort((left, right) => left.group === right.group ? 0 : left.group === "Kategoria" ? -1 : right.group === "Kategoria" ? 1 : 0)
    .map((suggestion) => ({
      id: suggestion.id,
      label: suggestion.label,
      description: suggestion.description,
      query: suggestion.query,
    }));
}

export function searchIntentHref(query: string) {
  const intent = interpretSearchQuery(query);
  const params = new URLSearchParams();
  params.set("zapytanie", query.trim());

  if (intent.filters.category) params.set("kategoria", intent.filters.category);
  if (intent.filters.openNow) params.set("otwarte", "1");
  if (intent.filters.today) params.set("dzisiaj", "1");
  if (intent.filters.free) params.set("bezplatne", "1");
  if (intent.filters.noReferral) params.set("bez_skierowania", "1");
  if (intent.filters.noDocuments) params.set("bez_dokumentow", "1");
  if (intent.filters.sort && intent.filters.sort !== "best") params.set("sort", intent.filters.sort);

  return `/szukaj?${params.toString()}`;
}
