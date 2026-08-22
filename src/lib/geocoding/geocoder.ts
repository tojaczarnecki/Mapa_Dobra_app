import { prisma } from "@/lib/prisma";
import { geocoderUserAgent } from "./config";
import { buildGeocodingAttempts, prepareGeocodingAddress, type GeocodingAddressInput, type GeocodingAttempt } from "./query";
import { normalizeGeocodingQuery, parseNominatimResults, scoreGeocodingSuggestion, type GeocodingSuggestion } from "./results";

export { buildGeocodingAttempts, prepareGeocodingAddress, type GeocodingAddressInput, type GeocodingAttempt } from "./query";
export { geocodingResultMatchesAddress, normalizeGeocodingQuery, parseNominatimResults, scoreGeocodingSuggestion, type GeocodingSuggestion } from "./results";

export const GEOCODER_PROVIDER = "NOMINATIM";
const CACHE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const EMPTY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REQUEST_INTERVAL_MS = 1_100;

const globalGeocoder = globalThis as unknown as {
  mapaDobraGeocoderTail?: Promise<void>;
  mapaDobraGeocoderNextAt?: number;
};

async function rateLimitedFetch(url: URL) {
  const previous = globalGeocoder.mapaDobraGeocoderTail ?? Promise.resolve();
  let release = () => {};
  globalGeocoder.mapaDobraGeocoderTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const wait = Math.max(0, (globalGeocoder.mapaDobraGeocoderNextAt ?? 0) - Date.now());
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  globalGeocoder.mapaDobraGeocoderNextAt = Date.now() + REQUEST_INTERVAL_MS;
  try {
    return await fetch(url, {
      headers: {
        "Accept-Language": "pl",
        "User-Agent": geocoderUserAgent(),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } finally {
    release();
  }
}

async function geocodeAttempt(attempt: GeocodingAttempt) {
  const trimmed = attempt.query.trim().slice(0, 700);
  if (trimmed.length < 5) throw new Error("Adres jest zbyt krótki do wyszukania.");
  const normalizedQuery = normalizeGeocodingQuery(`${attempt.id}:${JSON.stringify(attempt.params)}`);
  const cached = await prisma.geocodingCache.findUnique({
    where: { provider_normalizedQuery: { provider: GEOCODER_PROVIDER, normalizedQuery } },
  });
  if (cached) {
    const suggestions = parseNominatimResults(cached.results);
    const maxAge = suggestions.length ? CACHE_MAX_AGE_MS : EMPTY_CACHE_MAX_AGE_MS;
    if (cached.fetchedAt.getTime() >= Date.now() - maxAge) return { suggestions, cached: true };
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  for (const [key, value] of Object.entries(attempt.params)) url.searchParams.set(key, value);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "pl");
  url.searchParams.set("viewbox", "19.30,51.90,19.70,51.60");
  url.searchParams.set("bounded", "1");
  const response = await rateLimitedFetch(url);
  if (!response.ok) throw new Error("Geokoder chwilowo nie odpowiada. Spróbuj ponownie później.");
  const raw = await response.json();
  const suggestions = parseNominatimResults(raw);
  await prisma.geocodingCache.upsert({
    where: { provider_normalizedQuery: { provider: GEOCODER_PROVIDER, normalizedQuery } },
    create: { provider: GEOCODER_PROVIDER, normalizedQuery, query: trimmed, results: raw, fetchedAt: new Date() },
    update: { query: trimmed, results: raw, fetchedAt: new Date() },
  });
  return { suggestions, cached: false };
}

export async function geocodePublicAddress(input: GeocodingAddressInput) {
  const attempts = buildGeocodingAttempts(input);
  const expected = prepareGeocodingAddress(input);
  const suggestions = new Map<string, GeocodingSuggestion>();
  const attemptReport: Array<{ id: GeocodingAttempt["id"]; label: string; query: string; resultCount: number; cached: boolean }> = [];

  for (const attempt of attempts) {
    const result = await geocodeAttempt(attempt);
    const scored = result.suggestions.map((suggestion) => {
      const quality = scoreGeocodingSuggestion(suggestion, expected);
      return { ...suggestion, quality: quality.quality, qualityScore: quality.score, qualityReasons: quality.reasons };
    });
    attemptReport.push({ id: attempt.id, label: attempt.label, query: attempt.query, resultCount: scored.length, cached: result.cached });
    for (const suggestion of scored) {
      const locationKey = `${suggestion.latitude.toFixed(6)}:${suggestion.longitude.toFixed(6)}`;
      const existing = suggestions.get(locationKey);
      if (!existing || suggestion.qualityScore > existing.qualityScore || (suggestion.displayName.length < existing.displayName.length && suggestion.qualityScore === existing.qualityScore)) {
        suggestions.set(locationKey, suggestion);
      }
    }
    if (scored.some((suggestion) => suggestion.quality === "HIGH")) break;
  }

  return {
    suggestions: [...suggestions.values()].sort((left, right) => right.qualityScore - left.qualityScore || (right.importance ?? 0) - (left.importance ?? 0)).slice(0, 5),
    attempts: attemptReport,
    cached: attemptReport.length > 0 && attemptReport.every((attempt) => attempt.cached),
  };
}
