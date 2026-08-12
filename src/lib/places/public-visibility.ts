export type PublicRecordKind = "PRODUCTION" | "DEMO";
export type PlaceRecordKind = PublicRecordKind | "TEST";

export const PUBLIC_RECORD_KINDS: readonly PublicRecordKind[] = ["PRODUCTION", "DEMO"];

export function isPublicRecordKind(kind: PlaceRecordKind): kind is PublicRecordKind {
  return PUBLIC_RECORD_KINDS.includes(kind as PublicRecordKind);
}
