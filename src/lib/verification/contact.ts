export const verificationContactReasons = [
  ["MISSING_CURRENT_HOURS", "Brak aktualnych godzin"],
  ["UNCERTAIN_ADDRESS", "Niepewny adres"],
  ["OUTDATED_PHONE", "Nieaktualny telefon"],
  ["CONFLICTING_SOURCES", "Sprzeczne źródła"],
  ["REQUIREMENTS_CONFIRMATION", "Warunki pomocy wymagają potwierdzenia"],
  ["POSSIBLY_CLOSED_OR_MOVED", "Placówka może być zamknięta lub przeniesiona"],
  ["NO_RELIABLE_ONLINE_SOURCE", "Brak wiarygodnego źródła internetowego"],
  ["OTHER", "Inne"],
] as const;

export const verificationContactMethods = [
  ["PHONE", "Telefon"],
  ["EMAIL", "E-mail"],
  ["IN_PERSON", "Osobiście"],
] as const;

export type VerificationContactReasonValue = (typeof verificationContactReasons)[number][0];
export type VerificationContactMethodValue = (typeof verificationContactMethods)[number][0];

const reasonValues = new Set<string>(verificationContactReasons.map(([value]) => value));
const methodValues = new Set<string>(verificationContactMethods.map(([value]) => value));

export function parseVerificationContactReasons(values: FormDataEntryValue[]) {
  return [...new Set(values.filter((value): value is VerificationContactReasonValue => typeof value === "string" && reasonValues.has(value)))];
}

export function parseVerificationContactMethod(value: FormDataEntryValue | null): VerificationContactMethodValue | null {
  return typeof value === "string" && methodValues.has(value) ? value as VerificationContactMethodValue : null;
}

export function verificationContactReasonLabel(value: string) {
  return verificationContactReasons.find(([reason]) => reason === value)?.[1] ?? value;
}

export function verificationContactMethodLabel(value: string | null) {
  return verificationContactMethods.find(([method]) => method === value)?.[1] ?? "Nie podano";
}
