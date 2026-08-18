import { prisma } from "@/lib/prisma";
import { normalizeGeocodingQuery, parseNominatimResults } from "./results";

export { geocodingResultMatchesAddress, normalizeGeocodingQuery, parseNominatimResults, type GeocodingSuggestion } from "./results";

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
        "User-Agent": process.env.GEOCODER_USER_AGENT ?? "MapaDobraAdmin/1.0 (local address verification)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } finally {
    release();
  }
}

export async function geocodePublicAddress(query: string) {
  const trimmed = query.trim().slice(0, 700);
  if (trimmed.length < 5) throw new Error("Adres jest zbyt krótki do wyszukania.");
  const normalizedQuery = normalizeGeocodingQuery(trimmed);
  const cached = await prisma.geocodingCache.findUnique({
    where: { provider_normalizedQuery: { provider: GEOCODER_PROVIDER, normalizedQuery } },
  });
  if (cached) {
    const suggestions = parseNominatimResults(cached.results);
    const maxAge = suggestions.length ? CACHE_MAX_AGE_MS : EMPTY_CACHE_MAX_AGE_MS;
    if (cached.fetchedAt.getTime() >= Date.now() - maxAge) return { suggestions, cached: true };
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "pl");
  url.searchParams.set("viewbox", "19.30,51.90,19.70,51.60");
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
