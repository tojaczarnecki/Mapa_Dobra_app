import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/session";
import { hasPermission } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import { createApplicationRateLimiter, getTrustedClientAddress } from "@/lib/security/rate-limiter";
import {
  GEOAPIFY_PROVIDER,
  autocompleteQueryIsEligible,
  autocompleteProviderErrorMessage,
  buildGeoapifyAutocompleteUrl,
  geoapifyApiKey,
  normalizeGeoapifyFeatures,
  rankAutocompleteSuggestions,
} from "@/lib/geocoding/autocomplete";
import { normalizeGeocodingQuery } from "@/lib/geocoding/results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const rateLimiter = createApplicationRateLimiter(60 * 1000, 30);

function response(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || (!hasPermission(admin.user.permissions, "CREATE_PLACES") && !hasPermission(admin.user.permissions, "EDIT_PLACES"))) {
    return response({ suggestions: [], available: false }, 403);
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200) ?? "";
  if (!autocompleteQueryIsEligible(query)) return response({ suggestions: [], available: true });

  const limit = await rateLimiter.consume(`autocomplete:${getTrustedClientAddress(new Headers(request.headers))}`);
  if (!limit.allowed) {
    const result = response({ suggestions: [], available: true }, 429);
    result.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return result;
  }

  const apiKey = geoapifyApiKey();
  if (!apiKey) return response({ suggestions: [], available: false });

  const normalizedQuery = `autocomplete:v2:${normalizeGeocodingQuery(query)}:pl:lodz-bias`;
  try {
    const cached = await prisma.geocodingCache.findUnique({
      where: { provider_normalizedQuery: { provider: GEOAPIFY_PROVIDER, normalizedQuery } },
    });
    if (cached && cached.fetchedAt.getTime() >= Date.now() - CACHE_MAX_AGE_MS) {
      return response({ suggestions: rankAutocompleteSuggestions(query, normalizeGeoapifyFeatures(cached.results)), available: true });
    }

    const url = buildGeoapifyAutocompleteUrl(query, apiKey);
    const providerResponse = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!providerResponse.ok) return response({ suggestions: [], available: true, message: autocompleteProviderErrorMessage(providerResponse.status) }, 502);

    const raw = await providerResponse.json();
    const suggestions = rankAutocompleteSuggestions(query, normalizeGeoapifyFeatures(raw));
    await prisma.geocodingCache.upsert({
      where: { provider_normalizedQuery: { provider: GEOAPIFY_PROVIDER, normalizedQuery } },
      create: { provider: GEOAPIFY_PROVIDER, normalizedQuery, query, results: raw, fetchedAt: new Date() },
      update: { query, results: raw, fetchedAt: new Date() },
    });
    return response({ suggestions, available: true });
  } catch {
    return response({ suggestions: [], available: true, message: "Nie udało się pobrać podpowiedzi adresu." }, 502);
  }
}
