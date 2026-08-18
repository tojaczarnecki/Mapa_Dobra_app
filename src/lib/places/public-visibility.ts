export type PublicRecordKind = "PRODUCTION" | "DEMO";
export type PlaceRecordKind = PublicRecordKind | "TEST";

export const PUBLIC_RECORD_KINDS: readonly PublicRecordKind[] = ["PRODUCTION", "DEMO"];

export function isPublicRecordKind(kind: PlaceRecordKind): kind is PublicRecordKind {
  return PUBLIC_RECORD_KINDS.includes(kind as PublicRecordKind);
}

export function isPubliclyVisiblePlace(place: {
  recordKind: PlaceRecordKind;
  publicationStatus: string;
}) {
  return isPublicRecordKind(place.recordKind) && [
    "PUBLISHED",
    "TEMPORARILY_CLOSED",
    "PERMANENTLY_CLOSED",
  ].includes(place.publicationStatus);
}
