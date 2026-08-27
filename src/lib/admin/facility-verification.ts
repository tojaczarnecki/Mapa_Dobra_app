import type { PlacePublicationStatus, VerificationQueueStatus } from "@/generated/prisma/enums";

export type FacilityVerificationBlockReason = "NOT_PUBLIC" | "ACTIVE_VERIFICATION";

export type FacilityVerificationGate =
  | { allowed: true; reason: null }
  | { allowed: false; reason: FacilityVerificationBlockReason };

const confirmablePublicationStatuses: readonly PlacePublicationStatus[] = [
  "PUBLISHED",
  "TEMPORARILY_CLOSED",
  "PERMANENTLY_CLOSED",
];

export function facilityVerificationGate(
  publicationStatus: PlacePublicationStatus,
  verificationQueueStatus: VerificationQueueStatus | null,
): FacilityVerificationGate {
  if (!confirmablePublicationStatuses.includes(publicationStatus)) {
    return { allowed: false, reason: "NOT_PUBLIC" };
  }

  if (verificationQueueStatus && verificationQueueStatus !== "VERIFIED") {
    return { allowed: false, reason: "ACTIVE_VERIFICATION" };
  }

  return { allowed: true, reason: null };
}

export function facilityVerificationBlockMessage(reason: FacilityVerificationBlockReason) {
  if (reason === "NOT_PUBLIC") {
    return "Aktualność można potwierdzić tutaj tylko dla opublikowanego miejsca.";
  }

  return "To miejsce ma otwartą weryfikację administracyjną. Najpierw trzeba zakończyć ją w kolejce weryfikacji.";
}
