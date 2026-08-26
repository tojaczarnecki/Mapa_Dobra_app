import type { GeocodingSuggestion } from "../geocoding/results.ts";

export function addressFieldsFromSuggestion(suggestion: GeocodingSuggestion) {
  const addressLine = [suggestion.road, suggestion.houseNumber].filter(Boolean).join(" ") || suggestion.displayName.split(",")[0]?.trim() || "";
  return {
    addressLine,
    street: suggestion.road ?? addressLine,
    buildingNumber: suggestion.houseNumber ?? "",
    postalCode: suggestion.postalCode ?? "",
    city: suggestion.city ?? "",
    district: suggestion.district ?? "",
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  };
}
