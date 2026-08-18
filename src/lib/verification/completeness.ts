export type CompletenessState = "complete" | "missing" | "unknown" | "optional";

export type VerificationCompletenessInput = {
  name: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  locationSource: "GEOCODER" | "MANUAL" | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  recordKind: "PRODUCTION" | "DEMO" | "TEST";
  publicationStatus: "DRAFT" | "PUBLISHED" | "TEMPORARILY_CLOSED" | "PERMANENTLY_CLOSED" | "ARCHIVED";
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "NEEDS_CONFIRMATION";
  verifiedAt: Date | null;
  verificationSource: string | null;
  primaryCategoryActive: boolean;
  categoryCount: number;
  hasKnownOpeningHours: boolean;
  hasKnownRequirements: boolean;
  hasImportSource: boolean;
  hasUnresolvedConflict: boolean;
  blockingContactReasons: readonly string[];
  accommodation: boolean;
  accommodationTargetGroupCount: number;
  now?: Date;
};

export function getVerificationCompleteness(input: VerificationCompletenessInput) {
  const hasLocation = input.latitude !== null && input.longitude !== null && input.locationSource !== null;
  const verificationCutoff = new Date((input.now ?? new Date()).getTime() - 90 * 24 * 60 * 60 * 1000);
  const hasCurrentVerification = Boolean(
    input.verificationStatus === "VERIFIED" &&
      input.verifiedAt &&
      input.verifiedAt >= verificationCutoff &&
      input.verificationSource,
  );
  const accommodationReady = !input.accommodation || input.accommodationTargetGroupCount > 0;
  const checks = [
    { key: "name", label: "Nazwa", state: input.name.trim() ? "complete" : "missing" },
    { key: "address", label: "Adres", state: input.addressLine.trim() ? "complete" : "missing" },
    { key: "location", label: "Zatwierdzona lokalizacja", state: hasLocation ? "complete" : "missing" },
    { key: "category", label: "Kategoria", state: input.categoryCount > 0 && input.primaryCategoryActive ? "complete" : "missing" },
    { key: "contact", label: "Kontakt", state: input.phone || input.email || input.website ? "complete" : "optional" },
    { key: "hours", label: "Godziny", state: input.hasKnownOpeningHours ? "complete" : "unknown" },
    { key: "requirements", label: "Warunki", state: input.hasKnownRequirements ? "complete" : "unknown" },
    { key: "source", label: "Źródło", state: input.hasImportSource ? "complete" : "optional" },
    { key: "verification", label: "Aktualna weryfikacja", state: hasCurrentVerification ? "complete" : "missing" },
    { key: "conflict", label: "Konflikty", state: input.hasUnresolvedConflict ? "missing" : "complete" },
    { key: "critical-contact", label: "Krytyczne dane", state: input.blockingContactReasons.length ? "missing" : "complete" },
    ...(input.accommodation ? [{ key: "accommodation-audience", label: "Grupa noclegu", state: accommodationReady ? "complete" : "missing" } as const] : []),
  ] as const satisfies ReadonlyArray<{ key: string; label: string; state: CompletenessState }>;

  const readyToPublish = Boolean(
    input.name.trim() &&
      input.addressLine.trim() &&
      hasLocation &&
      input.categoryCount > 0 &&
      input.primaryCategoryActive &&
      input.recordKind === "PRODUCTION" &&
      input.publicationStatus === "DRAFT" &&
      hasCurrentVerification &&
      !input.hasUnresolvedConflict &&
      input.blockingContactReasons.length === 0 &&
      accommodationReady,
  );
  return { checks, readyToPublish };
}
