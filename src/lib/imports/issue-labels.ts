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
  SIMILAR_NAME: "Znaleziono podobną nazwę miejsca",
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
