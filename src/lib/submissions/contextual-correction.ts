export const contextualCorrectionFields = [
  "name",
  "address",
  "phone",
  "email",
  "website",
  "hours",
  "categories",
  "requirements",
  "accommodation",
  "accessibility",
  "description",
  "closure",
  "other",
] as const;

export type ContextualCorrectionField = (typeof contextualCorrectionFields)[number];

export const contextualCorrectionLabels: Record<ContextualCorrectionField, string> = {
  name: "Nazwa miejsca",
  address: "Adres i lokalizacja",
  phone: "Numer telefonu",
  email: "E-mail",
  website: "Strona WWW",
  hours: "Godziny działania",
  categories: "Rodzaje pomocy",
  requirements: "Warunki skorzystania",
  accommodation: "Informacje o noclegu",
  accessibility: "Dostępność",
  description: "Opis i ważne informacje",
  closure: "Miejsce nie działa",
  other: "Inna informacja",
};

export type ContextualCorrectionEnvelope = {
  kind: "contextual-place-correction";
  field: ContextualCorrectionField;
  label: string;
  oldValue: string;
  proposedValue: string;
  comment: string;
};

export function encodeContextualCorrection(value: ContextualCorrectionEnvelope) {
  return JSON.stringify(value);
}

export function decodeContextualCorrection(value: string | null | undefined): ContextualCorrectionEnvelope | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ContextualCorrectionEnvelope>;
    if (parsed.kind !== "contextual-place-correction" || typeof parsed.field !== "string" || !contextualCorrectionFields.includes(parsed.field as ContextualCorrectionField)) return null;
    if (typeof parsed.label !== "string" || typeof parsed.oldValue !== "string" || typeof parsed.proposedValue !== "string" || typeof parsed.comment !== "string") return null;
    return parsed as ContextualCorrectionEnvelope;
  } catch {
    return null;
  }
}
