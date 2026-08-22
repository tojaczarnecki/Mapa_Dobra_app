import type { InformationState } from "@/lib/accommodations/types";

export type PublicSearchPlace = {
  id: string;
  name: string;
  categorySlugs: string[];
  searchText: string;
  status: string;
  openNow: boolean | null;
  free: InformationState;
  referralRequired: InformationState;
  documentRequired: InformationState;
  distanceKm: number;
};

export type PublicSearchFilters = {
  query?: string;
  category?: string;
  openNow?: boolean;
  free?: boolean;
  noReferral?: boolean;
  noDocuments?: boolean;
  sort?: "best" | "distance" | "open";
};

const categoryAliases: Record<string, string[]> = {
  food: ["jedzenie"],
  accommodation: ["nocleg"],
  hygiene: ["higiena", "prysznic"],
  medical: ["pomoc-medyczna"],
  legal: ["pomoc-prawna"],
};

export function normalizePublicSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/gu, "l")
    .replace(/\s+/gu, " ")
    .trim();
}

function categoryMatches(place: PublicSearchPlace, category: string) {
  const requested = categoryAliases[category] ?? [category];
  return requested.some((slug) => place.categorySlugs.includes(slug));
}

function relevance(place: PublicSearchPlace, query: string) {
  if (!query) return 0;
  const name = normalizePublicSearch(place.name);
  if (name === query) return 100;
  if (name.startsWith(query)) return 80;
  if (name.includes(query)) return 60;
  if (place.categorySlugs.some((slug) => normalizePublicSearch(slug).includes(query))) return 40;
  return 10;
}

export function filterPublicSearchPlaces<T extends PublicSearchPlace>(
  places: T[],
  filters: PublicSearchFilters,
) {
  const query = normalizePublicSearch(filters.query ?? "");
  const filtered = places.filter((place) => {
    if (query && !normalizePublicSearch(place.searchText).includes(query)) return false;
    if (filters.category && !categoryMatches(place, filters.category)) return false;
    if (filters.openNow && place.openNow !== true) return false;
    if (filters.free && place.free !== "YES") return false;
    if (filters.noReferral && place.referralRequired !== "NO") return false;
    if (filters.noDocuments && place.documentRequired !== "NO") return false;
    return true;
  });

  return filtered.sort((left, right) => {
    if (filters.sort === "distance") return left.distanceKm - right.distanceKm;
    if (filters.sort === "open") return Number(right.openNow === true) - Number(left.openNow === true) || left.distanceKm - right.distanceKm;
    return relevance(right, query) - relevance(left, query) || left.distanceKm - right.distanceKm;
  });
}
