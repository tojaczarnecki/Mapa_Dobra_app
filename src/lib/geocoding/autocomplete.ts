import type { GeocodingSuggestion } from "./results";

export const GEOAPIFY_PROVIDER = "GEOAPIFY";
export const AUTOCOMPLETE_MAX_RESULTS = 7;

type GeoapifyFeature = {
  properties?: {
    place_id?: string;
    formatted?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    city_district?: string;
    suburb?: string;
    quarter?: string;
    neighbourhood?: string;
    lat?: number;
    lon?: number;
    country_code?: string;
    result_type?: string;
  };
};

export function autocompleteQueryIsEligible(query: string) {
  return query.trim().length >= 3;
}

export function geoapifyApiKey(environment: Record<string, string | undefined> = process.env) {
  const value = environment.GEOAPIFY_API_KEY?.trim();
  return value || null;
}

export function buildGeoapifyAutocompleteUrl(query: string, apiKey: string) {
  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", query);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("filter", "countrycode:pl");
  url.searchParams.set("bias", "proximity:19.455,51.759");
  url.searchParams.set("lang", "pl");
  url.searchParams.set("limit", String(AUTOCOMPLETE_MAX_RESULTS));
  return url;
}

function isAdministrativeDistrict(value: string) {
  return /^(?:gmina|powiat|wojew[oó]dztwo)\b/iu.test(value.trim());
}

export function normalizeGeoapifyDistrict(properties: GeoapifyFeature["properties"]) {
  const candidates = [properties?.city_district, properties?.suburb, properties?.quarter, properties?.neighbourhood, properties?.district];
  return candidates
    .map((value) => value?.trim() || null)
    .find((value) => value && !isAdministrativeDistrict(value)) ?? null;
}

export function normalizeGeoapifyFeatures(value: unknown): GeocodingSuggestion[] {
  if (!value || typeof value !== "object" || !("features" in value) || !Array.isArray(value.features)) return [];

  const suggestions: GeocodingSuggestion[] = [];
  for (const feature of (value.features as GeoapifyFeature[]).slice(0, AUTOCOMPLETE_MAX_RESULTS)) {
    const properties = feature?.properties;
    const latitude = Number(properties?.lat);
    const longitude = Number(properties?.lon);
    const displayName = properties?.formatted?.trim();
    if (!displayName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    suggestions.push({
      id: properties?.place_id || `geoapify-${suggestions.length}`,
      displayName: displayName.slice(0, 700),
      latitude,
      longitude,
      city: properties?.city?.trim() || null,
      district: normalizeGeoapifyDistrict(properties),
      importance: null,
      road: properties?.street?.trim() || null,
      houseNumber: properties?.housenumber?.trim() || null,
      postalCode: properties?.postcode?.trim() || null,
      countryCode: properties?.country_code?.trim() || null,
      resultType: properties?.result_type?.trim() || null,
      quality: "LOW",
      qualityScore: 0,
      qualityReasons: [],
    });
  }
  return suggestions;
}

function normalizeAddressText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("pl-PL")
    .replace(/\bulica\b|\bul\.?\b/gu, " ")
    .replace(/[^\p{L}\p{N}/-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function autocompleteScore(query: string, suggestion: GeocodingSuggestion) {
  const queryTokens = normalizeAddressText(query).split(" ").filter(Boolean);
  const queryBuildingNumber = [...queryTokens].reverse().find((token) => /^\d/iu.test(token)) ?? null;
  const queryStreet = queryTokens.filter((token) => token !== queryBuildingNumber).join(" ");
  const resultStreet = normalizeAddressText(suggestion.road ?? "");
  const sameStreet = Boolean(queryStreet && (resultStreet === queryStreet || resultStreet.includes(queryStreet)));
  const resultBuildingNumber = normalizeAddressText(suggestion.houseNumber ?? "");

  if (!queryBuildingNumber) return sameStreet ? 100 : 0;
  if (sameStreet && resultBuildingNumber === queryBuildingNumber) return 400;
  if (sameStreet && resultBuildingNumber && resultBuildingNumber !== queryBuildingNumber && resultBuildingNumber.includes(queryBuildingNumber)) return 300;
  if (sameStreet && !resultBuildingNumber) return 200;
  return 0;
}

export function rankAutocompleteSuggestions(query: string, suggestions: GeocodingSuggestion[]) {
  return suggestions
    .map((suggestion, index) => ({ suggestion, index, score: autocompleteScore(query, suggestion) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ suggestion }) => suggestion);
}

export function autocompleteProviderErrorMessage(status?: number) {
  return status === 401 || status === 403
    ? "Automatyczne wyszukiwanie adresu jest obecnie niedostępne."
    : "Nie udało się pobrać podpowiedzi adresu.";
}

export function formatSuggestionAddress(suggestion: GeocodingSuggestion) {
  const street = [suggestion.road, suggestion.houseNumber].filter(Boolean).join(" ");
  return [street, [suggestion.postalCode, suggestion.city].filter(Boolean).join(" "), suggestion.district]
    .filter(Boolean)
    .join(", ") || suggestion.displayName;
}
