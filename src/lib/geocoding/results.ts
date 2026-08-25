import type { GeographicContext } from "./geographic-context";

export type GeocodingPrecision = "address" | "street" | "area";

export type GeocodingSuggestion = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
  city: string | null;
  district: string | null;
  importance: number | null;
  road: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  countryCode: string | null;
  resultType: string | null;
  precision: GeocodingPrecision;
  quality: "HIGH" | "REVIEW" | "LOW" | "IMPROBABLE";
  qualityScore: number;
  qualityReasons: string[];
};

export type GeocodingExpectedAddress = {
  street: string;
  buildingNumber: string;
  postalCode: string;
  city: string;
};

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  importance?: number;
  address?: Record<string, string>;
  type?: string;
  category?: string;
  addresstype?: string;
  boundingbox?: string[];
};

export function normalizeGeocodingQuery(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pl-PL");
}

function normalizeAddressPart(value: string) {
  return normalizeGeocodingQuery(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function meaningfulTokens(value: string) {
  return normalizeAddressPart(value)
    .split(" ")
    .filter((token) => token.length > 1 && !["ul", "ulica", "al", "aleja", "plac", "pl", "marsz", "gen", "prof", "dr"].includes(token));
}

function canonicalBuildingNumber(value: string | null) {
  return normalizeAddressPart(value ?? "").replace(/\s+/gu, "");
}

function resultPrecision(raw: NominatimResult, address: Record<string, string>): GeocodingPrecision {
  const type = raw.addresstype ?? raw.type ?? "";
  if (address.house_number || ["house", "building", "address"].includes(type)) return "address";
  if (address.road || ["road", "street"].includes(type)) return "street";
  return "area";
}

function isInLodz(latitude: number, longitude: number, city: string | null) {
  const normalizedCity = normalizeAddressPart(city ?? "");
  const coordinatesInLodz = latitude >= 51.65 && latitude <= 51.86 && longitude >= 19.3 && longitude <= 19.7;
  return coordinatesInLodz && (!normalizedCity || normalizedCity === "lodz" || normalizedCity.includes("lodz"));
}

export function scoreGeocodingSuggestion(
  suggestion: Omit<GeocodingSuggestion, "quality" | "qualityScore" | "qualityReasons">,
  expected: GeocodingExpectedAddress,
) {
  const reasons: string[] = [];
  if (!isInLodz(suggestion.latitude, suggestion.longitude, suggestion.city)) {
    return { quality: "IMPROBABLE" as const, score: 0, reasons: ["Wynik znajduje się poza Łodzią lub wskazuje inne miasto."] };
  }

  let score = 40;
  reasons.push("Lokalizacja znajduje się w Łodzi.");
  const expectedStreetTokens = meaningfulTokens(expected.street);
  const resultStreet = suggestion.road ?? suggestion.displayName;
  const resultStreetTokens = new Set(meaningfulTokens(resultStreet));
  const matchingStreetTokens = expectedStreetTokens.filter((token) => resultStreetTokens.has(token)).length;
  const streetRatio = expectedStreetTokens.length ? matchingStreetTokens / expectedStreetTokens.length : 0;
  score += Math.round(streetRatio * 30);
  if (streetRatio >= 0.8) reasons.push("Nazwa ulicy jest zgodna.");
  else if (expectedStreetTokens.length) reasons.push("Nazwa ulicy wymaga sprawdzenia.");

  const expectedNumber = canonicalBuildingNumber(expected.buildingNumber);
  const resultNumber = canonicalBuildingNumber(suggestion.houseNumber);
  if (expectedNumber) {
    if (resultNumber === expectedNumber) {
      score += 25;
      reasons.push("Numer budynku jest zgodny.");
    } else {
      reasons.push(resultNumber ? "Numer budynku jest inny." : "Geokoder nie potwierdził numeru budynku.");
    }
  }
  if (expected.postalCode && suggestion.postalCode === expected.postalCode) {
    score += 5;
    reasons.push("Kod pocztowy jest zgodny.");
  }

  const quality = score >= 85 && (!expectedNumber || resultNumber === expectedNumber)
    ? "HIGH" as const
    : score >= 60
      ? "REVIEW" as const
      : "LOW" as const;
  return { quality, score, reasons };
}

export function geocodingResultMatchesAddress(suggestion: GeocodingSuggestion, street: string | null, buildingNumber: string | null) {
  const expectedParts = [street, buildingNumber].filter((value): value is string => Boolean(value)).map(normalizeAddressPart);
  if (!expectedParts.length) return false;
  const comparableResult = normalizeAddressPart(suggestion.displayName);
  return expectedParts.every((part) => comparableResult.includes(part));
}

function contextTextMatches(value: string | null, expected: string | undefined) {
  if (!value || !expected) return false;
  return normalizeAddressPart(value) === normalizeAddressPart(expected);
}

function distanceScore(suggestion: GeocodingSuggestion, context: GeographicContext | undefined) {
  if (!context?.center) return 0;
  const latitudeDistance = (suggestion.latitude - context.center.lat) * 111;
  const longitudeDistance = (suggestion.longitude - context.center.lng) * 111 * Math.cos(context.center.lat * Math.PI / 180);
  const kilometers = Math.sqrt(latitudeDistance ** 2 + longitudeDistance ** 2);
  return Math.max(0, 20 - Math.min(kilometers, 20));
}

export function rankAutocompleteSuggestions(
  suggestions: GeocodingSuggestion[],
  query: string,
  context?: GeographicContext,
) {
  const queryParts = meaningfulTokens(query);
  return suggestions
    .map((suggestion) => {
      const searchable = meaningfulTokens([suggestion.road, suggestion.houseNumber, suggestion.displayName].filter(Boolean).join(" "));
      const matchingTokens = queryParts.filter((token) => searchable.includes(token)).length;
      const score =
        matchingTokens * 12 +
        (contextTextMatches(suggestion.city, context?.city) ? 40 : 0) +
        (contextTextMatches(suggestion.district, context?.municipality) ? 15 : 0) +
        distanceScore(suggestion, context) +
        (suggestion.importance ?? 0) * 5;
      return { ...suggestion, qualityScore: score };
    })
    .sort((left, right) => right.qualityScore - left.qualityScore || (right.importance ?? 0) - (left.importance ?? 0));
}

export function parseNominatimResults(value: unknown, limit = 5): GeocodingSuggestion[] {
  if (!Array.isArray(value)) return [];
  const parsed: GeocodingSuggestion[] = [];
  for (const raw of value.slice(0, limit) as NominatimResult[]) {
    const latitude = Number(raw.lat);
    const longitude = Number(raw.lon);
    if (!raw.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (latitude < 49 || latitude > 55 || longitude < 14 || longitude > 25) continue;
    const address = raw.address ?? {};
    parsed.push({
      id: `${raw.osm_type ?? "place"}-${raw.osm_id ?? raw.place_id ?? parsed.length}`,
      displayName: raw.display_name.slice(0, 700),
      latitude,
      longitude,
      city: address.city ?? address.town ?? address.village ?? null,
      district: address.city_district ?? address.suburb ?? address.neighbourhood ?? null,
      importance: typeof raw.importance === "number" ? raw.importance : null,
      road: address.road ?? address.pedestrian ?? address.footway ?? null,
      houseNumber: address.house_number ?? null,
      postalCode: address.postcode ?? null,
      countryCode: address.country_code ?? null,
      resultType: raw.type ?? raw.category ?? null,
      precision: resultPrecision(raw, address),
      quality: "LOW",
      qualityScore: 0,
      qualityReasons: [],
    });
  }
  return parsed;
}
