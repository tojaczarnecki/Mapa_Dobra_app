import type { DuplicateDisposition } from "./duplicate-decisions.ts";

export type ImportIssueCode =
  | "SOURCE_ROW_DUPLICATE"
  | "SAME_PHONE"
  | "SAME_ADDRESS_AND_PHONE"
  | "SAME_NAME_AND_ADDRESS"
  | "MATCHED_BY_SLUG"
  | "MATCHED_BY_NAME"
  | "MATCHED_BY_NIP"
  | "MATCHED_BY_REGON"
  | "MATCHED_BY_KRS"
  | "CONFLICTING_IDENTIFIERS"
  | "INACTIVE_ORGANIZATION"
  | "INACTIVE_CATEGORY"
  | "SAME_NORMALIZED_ADDRESS"
  | "SAME_WEBSITE"
  | "SIMILAR_NAME"
  | "MULTIPLE_EXACT_CANDIDATES"
  | "UNRESOLVED_CATEGORY"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_EMAIL"
  | "INVALID_WEBSITE"
  | "INVALID_NIP"
  | "INVALID_REGON"
  | "INVALID_KRS"
  | "NEW_ORGANIZATION_CANDIDATE"
  | "MATCHED_BY_IDENTIFIER"
  | "MULTIPLE_NAME_MATCHES";

const labels: Record<ImportIssueCode, string> = {
  SOURCE_ROW_DUPLICATE: "Możliwy duplikat innego wiersza w tym pliku",
  SAME_PHONE: "Znaleziono ten sam numer telefonu",
  SAME_ADDRESS_AND_PHONE: "Zgodny adres i numer telefonu",
  SAME_NAME_AND_ADDRESS: "Zgodna nazwa i adres",
  MATCHED_BY_SLUG: "Dopasowano po identyfikatorze kategorii",
  MATCHED_BY_NAME: "Dopasowano po nazwie",
  MATCHED_BY_NIP: "Dopasowano po NIP",
  MATCHED_BY_REGON: "Dopasowano po REGON",
  MATCHED_BY_KRS: "Dopasowano po KRS",
  CONFLICTING_IDENTIFIERS: "Dane organizacji są ze sobą sprzeczne",
  INACTIVE_ORGANIZATION: "Dopasowana organizacja jest nieaktywna",
  INACTIVE_CATEGORY: "Dopasowana kategoria jest nieaktywna",
  SAME_NORMALIZED_ADDRESS: "Znaleziono zgodny adres",
  SAME_WEBSITE: "Znaleziono tę samą stronę WWW",
  SIMILAR_NAME: "Podobna nazwa organizacji lub miejsca",
  MULTIPLE_EXACT_CANDIDATES: "Znaleziono więcej niż jedno dokładne dopasowanie",
  UNRESOLVED_CATEGORY: "Nie udało się dopasować kategorii",
  MISSING_REQUIRED_FIELD: "Brak wymaganej wartości",
  INVALID_EMAIL: "Adres e-mail może wymagać poprawy",
  INVALID_WEBSITE: "Adres WWW może wymagać poprawy",
  INVALID_NIP: "NIP może wymagać poprawy",
  INVALID_REGON: "REGON może wymagać poprawy",
  INVALID_KRS: "KRS może wymagać poprawy",
  NEW_ORGANIZATION_CANDIDATE: "Organizacja wymaga ręcznego dopasowania",
  MATCHED_BY_IDENTIFIER: "Dopasowano po identyfikatorze organizacji",
  MULTIPLE_NAME_MATCHES: "Znaleziono wiele organizacji o tej samej nazwie",
};

export function importIssueLabel(code: string): string {
  return code in labels ? labels[code as ImportIssueCode] : "Wymaga ręcznego sprawdzenia";
}

function analysisRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringCodes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function activeImportIssueCodesForCandidate(
  proposedData: unknown,
  reviewReasons: readonly string[],
  duplicateDisposition: DuplicateDisposition,
): string[] {
  const root = analysisRecord(proposedData);
  const analysis = analysisRecord(root?.analysis);
  const place = analysisRecord(analysis?.place);
  const duplicateReasons = new Set<string>();
  const duplicates = Array.isArray(analysis?.inFileDuplicates) ? analysis.inFileDuplicates : [];
  for (const duplicate of duplicates) {
    const item = analysisRecord(duplicate);
    for (const reason of stringCodes(item?.reasons)) duplicateReasons.add(reason);
  }
  const placeReasons = new Set(stringCodes(place?.reasons));
  return reviewReasons.filter((code) => {
    if (code === "MATCHED_BY_SLUG") return false;
    if (duplicateDisposition !== "KEPT" && duplicateDisposition !== "RESOLVED_DIFFERENT" && duplicateDisposition !== "LOSER") return true;
    if (code === "SOURCE_ROW_DUPLICATE") return false;
    return !duplicateReasons.has(code) || placeReasons.has(code);
  });
}
