import { matchPlace, normalizeMatchingAddress, normalizeMatchingPhone, normalizeMatchingText, normalizeMatchingWebsite, type ImportPlaceReference } from "./matching.ts";
import type { CanonicalImportValues } from "./column-mapping.ts";

export type LivePlaceMatch = {
  classification: "EXACT_MATCH" | "POSSIBLE_MATCH" | "NO_MATCH";
  candidates: Array<{ placeId: string; reasons: string[] }>;
  reasons: string[];
  conflict: boolean;
};

export function importValuesForLivePlace(proposedData: unknown): CanonicalImportValues {
  if (!proposedData || typeof proposedData !== "object" || Array.isArray(proposedData)) return {};
  const mappedValues = (proposedData as Record<string, unknown>).mappedValues;
  return mappedValues && typeof mappedValues === "object" && !Array.isArray(mappedValues)
    ? mappedValues as CanonicalImportValues
    : {};
}

export function findLivePlaceMatch(
  values: CanonicalImportValues,
  places: ImportPlaceReference[],
  organizationId: string | null,
  excludePlaceIds: readonly string[] = [],
): LivePlaceMatch {
  const excluded = new Set(excludePlaceIds);
  const result = matchPlace(values, places.filter((place) => !excluded.has(place.id)), organizationId);
  return { ...result, classification: result.classification === "NEW" ? "NO_MATCH" : result.classification };
}

export function livePlaceLockKeys(values: CanonicalImportValues, organizationId: string | null): string[] {
  const address = normalizeMatchingAddress(typeof values.addressLine === "string" ? values.addressLine : null);
  if (address) return [`address:${address}`];

  const name = normalizeMatchingText(typeof values.name === "string" ? values.name : "");
  const phone = normalizeMatchingPhone(typeof values.phone === "string" ? values.phone : null);
  const website = normalizeMatchingWebsite(typeof values.website === "string" ? values.website : null);
  const key = [name, phone, website, organizationId ?? ""].join("|");
  return key === "|||" ? [] : [`identity:${key}`];
}

export async function lockLivePlaceIdentity(
  queryRaw: (key: string) => Promise<unknown>,
  values: CanonicalImportValues,
  organizationId: string | null,
): Promise<void> {
  for (const key of livePlaceLockKeys(values, organizationId)) await queryRaw(key);
}
