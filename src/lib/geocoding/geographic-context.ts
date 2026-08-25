export type GeographicContext = {
  city?: string;
  municipality?: string;
  region?: string;
  countryCode?: string;
  center?: { lat: number; lng: number };
  bounds?: { north: number; south: number; east: number; west: number };
};

export const PUBLIC_GEOGRAPHIC_CONTEXT: GeographicContext = {
  city: "Łódź",
  countryCode: "pl",
  center: { lat: 51.7592, lng: 19.456 },
  bounds: { north: 51.9, south: 51.6, east: 19.7, west: 19.3 },
};

const MAX_CONTEXT_TEXT_LENGTH = 120;

function cleanText(value: string | null | undefined) {
  const normalized = value?.normalize("NFKC").replace(/\s+/gu, " ").trim();
  return normalized && normalized.length <= MAX_CONTEXT_TEXT_LENGTH ? normalized : undefined;
}

function finiteNumber(value: string | null | undefined) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function countryCode(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[a-z]{2}$/u.test(normalized) ? normalized : undefined;
}

export function geographicContextFromSearchParams(params: URLSearchParams): GeographicContext | undefined {
  const context: GeographicContext = {
    city: cleanText(params.get("city")),
    municipality: cleanText(params.get("municipality")),
    region: cleanText(params.get("region")),
    countryCode: countryCode(params.get("countryCode")) ?? "pl",
  };
  const lat = finiteNumber(params.get("centerLat"));
  const lng = finiteNumber(params.get("centerLng"));
  if (lat !== undefined && lng !== undefined && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    context.center = { lat, lng };
  }
  const north = finiteNumber(params.get("north"));
  const south = finiteNumber(params.get("south"));
  const east = finiteNumber(params.get("east"));
  const west = finiteNumber(params.get("west"));
  if (
    north !== undefined && south !== undefined && east !== undefined && west !== undefined &&
    north >= -90 && north <= 90 && south >= -90 && south <= 90 &&
    east >= -180 && east <= 180 && west >= -180 && west <= 180 && north >= south
  ) {
    context.bounds = { north, south, east, west };
  }
  return context.city || context.municipality || context.region || context.center || context.bounds
    ? context
    : undefined;
}

export function geographicContextToSearchParams(context?: GeographicContext) {
  const params = new URLSearchParams();
  if (!context) return params;
  for (const [key, value] of [["city", context.city], ["municipality", context.municipality], ["region", context.region]] as const) {
    if (value?.trim()) params.set(key, value.trim());
  }
  if (context.countryCode?.trim()) params.set("countryCode", context.countryCode.trim().toLowerCase());
  if (context.center) {
    params.set("centerLat", String(context.center.lat));
    params.set("centerLng", String(context.center.lng));
  }
  if (context.bounds) {
    params.set("north", String(context.bounds.north));
    params.set("south", String(context.bounds.south));
    params.set("east", String(context.bounds.east));
    params.set("west", String(context.bounds.west));
  }
  return params;
}
