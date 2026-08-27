import { normalizePublicSearch, type PublicSearchPlace } from "../places/search.ts";

export type HomeSearchCategory = {
  label: string;
  slug: string;
};

export type HomeSuggestion = {
  id: string;
  label: string;
  secondary: "Najlepsze dopasowanie" | "Kategoria" | "Usługa" | "Miejsce";
  href: string;
};

const popularSuggestions = [
  { label: "Noclegownia", query: "noclegownia", aliases: ["noc", "spać", "przenocować"], href: "/mapa?lokalizacja=moja&q=noclegownia" },
  { label: "Schronisko", query: "schronisko", aliases: ["noc", "nocleg", "spać"], href: "/mapa?lokalizacja=moja&q=schronisko" },
  { label: "Ogrzewalnia", query: "ogrzewalnia", aliases: ["noc", "zimno", "ciepło"], href: "/mapa?lokalizacja=moja&q=ogrzewalnia" },
  { label: "Posiłek", query: "posiłek", aliases: ["jedzenie", "obiad", "zupa"], href: "/mapa?lokalizacja=moja&q=posi%C5%82ek" },
  { label: "Jadłodajnia", query: "jadłodajnia", aliases: ["jedzenie", "obiad", "zupa"], href: "/mapa?lokalizacja=moja&q=jad%C5%82odajnia" },
  { label: "Umyć się", query: "umyć się", aliases: ["prysznic", "kąpiel", "higiena"], href: "/mapa?lokalizacja=moja&q=umy%C4%87%20si%C4%99" },
  { label: "Porada prawna", query: "porada prawna", aliases: ["prawnik", "prawo"], href: "/mapa?lokalizacja=moja&q=porada%20prawna" },
] as const;

const intentCategories = [
  { slug: "jedzenie", words: ["jedzenie", "jesc", "zjesc", "posilek", "obiad", "zupa", "glodny", "glodna"] },
  { slug: "nocleg", words: ["nocleg", "spac", "przenocowac", "noclegownia", "schronisko", "lozko"] },
  { slug: "higiena", words: ["higiena", "prysznic", "kapiel", "umyc", "umycie"] },
  { slug: "pomoc-medyczna", words: ["lekarz", "medyczna", "medyczny", "zdrowie", "rana", "opatrunek"] },
  { slug: "pomoc-prawna", words: ["prawnik", "prawna", "prawny", "prawo", "porada prawna"] },
  { slug: "pomoc-psychologiczna", words: ["psycholog", "psychologiczna", "kryzys psychiczny"] },
  { slug: "odziez", words: ["odziez", "ubranie", "ubrania", "buty", "kurtka"] },
] as const;

function suggestionMatches(value: string, query: string) {
  return normalizePublicSearch(value).includes(normalizePublicSearch(query));
}

function containsAny(query: string, phrases: readonly string[]) {
  return phrases.some((phrase) => query.includes(normalizePublicSearch(phrase)));
}

export function getHomeIntentSuggestion(query: string): HomeSuggestion | undefined {
  const normalizedQuery = normalizePublicSearch(query);
  const isSentenceLike = normalizedQuery.split(" ").filter(Boolean).length >= 2;
  if (!isSentenceLike) return undefined;

  const category = intentCategories.find((candidate) => containsAny(normalizedQuery, candidate.words));
  const openNow = containsAny(normalizedQuery, ["teraz", "otwarte", "dzisiaj", "dzis"]);
  const free = containsAny(normalizedQuery, ["bezplatnie", "za darmo", "darmowe", "darmo"]);
  const noReferral = containsAny(normalizedQuery, ["bez skierowania"]);
  const noDocuments = containsAny(normalizedQuery, ["bez dokumentow", "bez dokumentu", "bez dowodu"]);
  const nearest = containsAny(normalizedQuery, ["najblizej", "najblizsze", "blisko mnie", "w poblizu"]);

  if (!category && !openNow && !free && !noReferral && !noDocuments && !nearest) return undefined;

  const params = new URLSearchParams();
  if (category) params.set("kategoria", category.slug);
  if (openNow) params.set("otwarte", "1");
  if (free) params.set("bezplatne", "1");
  if (noReferral) params.set("bez_skierowania", "1");
  if (noDocuments) params.set("bez_dokumentow", "1");
  if (nearest) params.set("sort", "distance");

  const understood = [
    category ? category.slug.replace("pomoc-", "") : undefined,
    openNow ? "otwarte teraz" : undefined,
    free ? "bezpłatne" : undefined,
    noReferral ? "bez skierowania" : undefined,
    noDocuments ? "bez dokumentów" : undefined,
    nearest ? "najbliżej" : undefined,
  ].filter(Boolean);

  return {
    id: "intent-best-match",
    label: `Pokaż: ${understood.join(" · ")}`,
    secondary: "Najlepsze dopasowanie",
    href: `/szukaj?${params.toString()}`,
  };
}

export function getHomeSuggestions(
  query: string,
  categories: HomeSearchCategory[],
  places: PublicSearchPlace[],
): HomeSuggestion[] {
  const normalizedQuery = normalizePublicSearch(query);
  if (normalizedQuery.length < 2) return [];

  const intentSuggestion = getHomeIntentSuggestion(query);
  const categorySuggestions = categories
    .filter((category) => suggestionMatches(`${category.label} ${category.slug}`, normalizedQuery))
    .slice(0, 5)
    .map((category) => ({
      id: `category-${category.slug}`,
      label: category.label,
      secondary: "Kategoria" as const,
      href: `/szukaj?kategoria=${encodeURIComponent(category.slug)}`,
    }));

  const serviceSuggestions = popularSuggestions
    .filter((suggestion) => suggestionMatches(`${suggestion.label} ${suggestion.query} ${suggestion.aliases.join(" ")}`, normalizedQuery))
    .slice(0, 4)
    .map((suggestion) => ({
      id: `service-${suggestion.query}`,
      label: suggestion.label,
      secondary: "Usługa" as const,
      href: suggestion.href,
    }));

  const placeSuggestions = places
    .filter((place) => suggestionMatches(place.searchText, normalizedQuery))
    .slice(0, 5)
    .map((place) => ({
      id: `place-${place.id}`,
      label: place.name,
      secondary: "Miejsce" as const,
      href: `/lodz/${place.categorySlug || place.categorySlugs[0] || "inne"}/${place.slug}`,
    }));

  return [
    ...(intentSuggestion ? [intentSuggestion] : []),
    ...categorySuggestions,
    ...serviceSuggestions,
    ...placeSuggestions,
  ].slice(0, 8);
}
