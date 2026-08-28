import type { PlaceAdminPayload } from "../../types/place-admin";
import { formatSuggestionAddress } from "../geocoding/autocomplete.ts";
import type { GeocodingSuggestion } from "../geocoding/results.ts";

type AddressFields = Pick<PlaceAdminPayload, "addressLine" | "street" | "buildingNumber" | "postalCode" | "city" | "district" | "latitude" | "longitude">;

export function addressFieldsFromSuggestion(suggestion: GeocodingSuggestion): Partial<AddressFields> {
  const fields: Partial<AddressFields> = { addressLine: formatSuggestionAddress(suggestion) };
  if (suggestion.road) fields.street = suggestion.road;
  if (suggestion.houseNumber) fields.buildingNumber = suggestion.houseNumber;
  if (suggestion.postalCode) fields.postalCode = suggestion.postalCode;
  if (suggestion.city) fields.city = suggestion.city;
  if (suggestion.district) fields.district = suggestion.district;
  if (Number.isFinite(suggestion.latitude) && Number.isFinite(suggestion.longitude)) {
    fields.latitude = suggestion.latitude;
    fields.longitude = suggestion.longitude;
  }
  return fields;
}
