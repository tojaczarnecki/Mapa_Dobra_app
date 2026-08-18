export type GeocodingSuggestion = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
  city: string | null;
  district: string | null;
  importance: number | null;
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

export function geocodingResultMatchesAddress(suggestion: GeocodingSuggestion, street: string | null, buildingNumber: string | null) {
  const expectedParts = [street, buildingNumber].filter((value): value is string => Boolean(value)).map(normalizeAddressPart);
  if (!expectedParts.length) return false;
  const comparableResult = normalizeAddressPart(suggestion.displayName);
  return expectedParts.every((part) => comparableResult.includes(part));
}

export function parseNominatimResults(value: unknown): GeocodingSuggestion[] {
  if (!Array.isArray(value)) return [];
  const parsed: GeocodingSuggestion[] = [];
  for (const raw of value.slice(0, 5) as NominatimResult[]) {
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
    });
  }
  return parsed;
}
