import type {
  PlaceOperationalStatusValue,
  PlacePublicationStatusValue,
} from "../../types/place-admin.ts";

export function validatePlaceStatusCombination(
  publicationStatus: PlacePublicationStatusValue,
  operationalStatus: PlaceOperationalStatusValue,
) {
  if (
    (publicationStatus === "TEMPORARILY_CLOSED" || publicationStatus === "PERMANENTLY_CLOSED") &&
    operationalStatus !== "CLOSED"
  ) {
    return {
      ok: false as const,
      error: "Miejsce oznaczone jako zamknięte musi mieć status operacyjny Zamknięte.",
    };
  }
  return { ok: true as const };
}

export function requiresOperationalStatusOnRepublish(
  previousStatus: PlacePublicationStatusValue,
  nextStatus: PlacePublicationStatusValue,
) {
  return nextStatus === "PUBLISHED" && (
    previousStatus === "TEMPORARILY_CLOSED" || previousStatus === "PERMANENTLY_CLOSED"
  );
}
