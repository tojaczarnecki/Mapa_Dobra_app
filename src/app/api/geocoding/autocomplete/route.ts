import { autocompletePublicAddress } from "@/lib/geocoding/geocoder";
import { geographicContextFromSearchParams, PUBLIC_GEOGRAPHIC_CONTEXT } from "@/lib/geocoding/geographic-context";
import { consumeGeocodingRateLimit } from "@/lib/geocoding/rate-limit";
import { getTrustedClientAddress } from "@/lib/security/rate-limiter";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return Response.json({ suggestions: [], cached: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const address = getTrustedClientAddress(request.headers);
  const limit = await consumeGeocodingRateLimit(`autocomplete:${address}`);
  if (!limit.allowed) {
    const response = Response.json({ ok: false, message: "Podpowiedzi są chwilowo ograniczone." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  try {
    const requestedContext = geographicContextFromSearchParams(url.searchParams);
    const context = requestedContext
      ? { ...requestedContext, countryCode: PUBLIC_GEOGRAPHIC_CONTEXT.countryCode }
      : PUBLIC_GEOGRAPHIC_CONTEXT;
    const result = await autocompletePublicAddress(query, context);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { ok: false, message: "Nie udało się pobrać podpowiedzi." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
