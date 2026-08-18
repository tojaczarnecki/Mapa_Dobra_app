export type CompletenessState = "complete" | "missing" | "unknown" | "optional";

export type VerificationCompletenessInput = {
  name: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  recordKind: "PRODUCTION" | "DEMO" | "TEST";
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "NEEDS_CONFIRMATION";
  verifiedAt: Date | null;
  primaryCategoryActive: boolean;
  categoryCount: number;
  hasKnownOpeningHours: boolean;
  hasKnownRequirements: boolean;
  hasImportSource: boolean;
};

export function getVerificationCompleteness(input: VerificationCompletenessInput) {
  const hasLocation = input.latitude !== null && input.longitude !== null;
  const checks = [
    { key: "name", label: "Nazwa", state: input.name.trim() ? "complete" : "missing" },
    { key: "address", label: "Adres", state: input.addressLine.trim() ? "complete" : "missing" },
    { key: "location", label: "Lokalizacja na mapie", state: hasLocation ? "complete" : "missing" },
    { key: "category", label: "Kategoria", state: input.categoryCount > 0 && input.primaryCategoryActive ? "complete" : "missing" },
    { key: "contact", label: "Kontakt", state: input.phone || input.email || input.website ? "complete" : "optional" },
    { key: "hours", label: "Godziny", state: input.hasKnownOpeningHours ? "complete" : "unknown" },
    { key: "requirements", label: "Warunki", state: input.hasKnownRequirements ? "complete" : "unknown" },
    { key: "source", label: "Źródło", state: input.hasImportSource ? "complete" : "optional" },
    { key: "verification", label: "Aktualna weryfikacja", state: input.verificationStatus === "VERIFIED" && input.verifiedAt ? "complete" : "missing" },
  ] as const satisfies ReadonlyArray<{ key: string; label: string; state: CompletenessState }>;

  const readyToPublish = Boolean(
    input.name.trim() &&
      input.addressLine.trim() &&
      hasLocation &&
      input.categoryCount > 0 &&
      input.primaryCategoryActive &&
      input.recordKind === "PRODUCTION" &&
      input.verificationStatus === "VERIFIED" &&
      input.verifiedAt,
  );
  return { checks, readyToPublish };
}
