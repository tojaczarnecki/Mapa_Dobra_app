import { normalizePublicSearch, type PublicSearchPlace } from "../places/search.ts";

export type HomeSearchCategory = {
  label: string;
  slug: string;
};

export type HomeSuggestion = {
  id: string;
  label: string;
  secondary: "Kategoria" | "Usługa" | "Miejsce";
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

function suggestionMatches(value: string, query: string) {
  return normalizePublicSearch(value).includes(normalizePublicSearch(query));
}

export function getHomeSuggestions(
  query: string,
  categories: HomeSearchCategory[],
  places: PublicSearchPlace[],
): HomeSuggestion[] {
  const normalizedQuery = normalizePublicSearch(query);
  if (normalizedQuery.length < 2) return [];

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

  return [...categorySuggestions, ...serviceSuggestions, ...placeSuggestions].slice(0, 8);
}
