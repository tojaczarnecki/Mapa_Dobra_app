export type PublicRecordKind = "PRODUCTION" | "DEMO";
export type PlaceRecordKind = PublicRecordKind | "TEST";

const PRODUCTION_RECORD_KINDS = ["PRODUCTION"] as const;
const DEVELOPMENT_RECORD_KINDS = ["PRODUCTION", "DEMO"] as const;

export function publicRecordKindsForEnvironment(environment: string | undefined = process.env.NODE_ENV) {
  const publicDataMode = process.env.PUBLIC_DATA_MODE;
  return (publicDataMode === "development" || (publicDataMode === undefined && environment === "development"))
    ? DEVELOPMENT_RECORD_KINDS
    : PRODUCTION_RECORD_KINDS;
}

export function isPublicRecordKind(
  kind: PlaceRecordKind,
  environment: string | undefined = process.env.NODE_ENV,
): kind is PublicRecordKind {
  return publicRecordKindsForEnvironment(environment).some((candidate) => candidate === kind);
}

export function isPubliclyVisiblePlace(place: {
  recordKind: PlaceRecordKind;
  publicationStatus: string;
}, environment: string | undefined = process.env.NODE_ENV) {
  return isPublicRecordKind(place.recordKind, environment) && [
    "PUBLISHED",
    "TEMPORARILY_CLOSED",
    "PERMANENTLY_CLOSED",
  ].includes(place.publicationStatus);
}
