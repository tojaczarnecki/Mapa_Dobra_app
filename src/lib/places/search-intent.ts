import { normalizePublicSearch, type PublicSearchFilters } from "./search.ts";

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

  const today = containsAny(normalized, ["dzisiaj", "dzis", "na dzisiaj", "na dzis", "tego dnia"]);
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

  const nearest = containsAny(normalized, [
    "najblizej", "najblizsze", "najblizszy", "blisko mnie", "w poblizu", "niedaleko",
  ]);
  if (nearest) {
    filters.sort = "distance";
    addToken(tokens, "nearest", "Najbliżej", "sort", "distance");
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

const defaultSuggestions: SearchSuggestion[] = [
  { id: "food", label: "Jedzenie", description: "Kategoria pomocy", query: "jedzenie" },
  { id: "accommodation", label: "Nocleg na dzisiaj", description: "Kategoria pomocy", query: "nocleg na dzisiaj" },
  { id: "hygiene", label: "Higiena / prysznic", description: "Kategoria pomocy", query: "higiena" },
  { id: "medical", label: "Pomoc medyczna", description: "Kategoria pomocy", query: "pomoc medyczna" },
  { id: "legal", label: "Pomoc prawna", description: "Kategoria pomocy", query: "pomoc prawna" },
];

export function searchIntentSuggestions(query: string): SearchSuggestion[] {
  const normalized = normalizePublicSearch(query);
  if (!normalized) return defaultSuggestions;

  return categoryMatchers
    .filter((category) => category.phrases.some((phrase) => {
      const normalizedPhrase = normalizePublicSearch(phrase);
      return normalizedPhrase.includes(normalized) || normalized.includes(normalizedPhrase);
    }))
    .map((category) => ({
      id: `category-${category.slug}`,
      label: category.label,
      description: "Kategoria pomocy",
      query: category.phrases[0],
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
