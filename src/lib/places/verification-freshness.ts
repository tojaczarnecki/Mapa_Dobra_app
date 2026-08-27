export const PLACE_VERIFICATION_REVIEW_DAYS = 30;
export const PLACE_VERIFICATION_STALE_DAYS = 90;

export type PlaceVerificationFreshness = "fresh" | "review" | "stale" | "unverified";

export function classifyPlaceVerificationFreshness(
  verificationStatus: string,
  verifiedAt: Date | null,
  now = new Date(),
): PlaceVerificationFreshness {
  if (verificationStatus !== "VERIFIED" || !verifiedAt) return "unverified";

  const ageMs = Math.max(0, now.getTime() - verifiedAt.getTime());
  const ageDays = ageMs / 86_400_000;

  if (ageDays <= PLACE_VERIFICATION_REVIEW_DAYS) return "fresh";
  if (ageDays <= PLACE_VERIFICATION_STALE_DAYS) return "review";
  return "stale";
}

export function placeVerificationNeedsAttention(freshness: PlaceVerificationFreshness) {
  return freshness !== "fresh";
}

export function placeVerificationNote(freshness: PlaceVerificationFreshness) {
  switch (freshness) {
    case "fresh":
      return "Informacje były niedawno sprawdzane.";
    case "review":
      return "Dane były weryfikowane ponad 30 dni temu. Przed wyjściem warto potwierdzić godziny i warunki.";
    case "stale":
      return "Dane były weryfikowane ponad 90 dni temu. Zadzwoń przed wyjściem albo zgłoś nowszą informację.";
    case "unverified":
      return "Nie mamy jeszcze aktualnego potwierdzenia tych danych. Przed wyjściem warto skontaktować się z placówką.";
  }
}
