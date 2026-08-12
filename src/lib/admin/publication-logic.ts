export type DraftDecision = "PENDING" | "INCLUDE" | "REJECT";

export type PublicationItem<T = unknown> = {
  fieldKey: string;
  workingValue: T;
  decision: DraftDecision;
};

export function splitPublicationItems<T>(items: PublicationItem<T>[]) {
  return {
    included: items.filter((item) => item.decision === "INCLUDE"),
    rejected: items.filter((item) => item.decision === "REJECT"),
    pending: items.filter((item) => item.decision === "PENDING"),
  };
}

export function hasPlaceVersionConflict(
  basePlaceUpdatedAt: Date | string | null,
  currentPlaceUpdatedAt: Date | string | null,
) {
  if (!basePlaceUpdatedAt || !currentPlaceUpdatedAt) return false;
  return new Date(basePlaceUpdatedAt).getTime() !== new Date(currentPlaceUpdatedAt).getTime();
}

export function canPublishSubmission(
  moderationStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED",
  publicationStatus: "NOT_PUBLISHED" | "PUBLISHED",
) {
  return publicationStatus === "NOT_PUBLISHED" && moderationStatus !== "REJECTED";
}

export function publicationAuditValues(
  publishedValues: Record<string, unknown>,
  rejectedFields: string[],
  placeId?: string,
) {
  return { placeId: placeId ?? null, publishedValues, rejectedFields };
}
