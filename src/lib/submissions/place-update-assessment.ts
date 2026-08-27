export type PlaceUpdateAssessment = "CURRENT" | "CHANGED" | "UNCERTAIN";

export const placeUpdateAssessmentOptions: Array<{
  value: PlaceUpdateAssessment;
  label: string;
  hint: string;
}> = [
  {
    value: "CHANGED",
    label: "Informacja się zmieniła",
    hint: "Wiem, że obecne dane są już nieaktualne.",
  },
  {
    value: "UNCERTAIN",
    label: "Nie wiem — warto sprawdzić",
    hint: "Mam wątpliwość, ale nie chcę podawać niesprawdzonej zmiany jako faktu.",
  },
  {
    value: "CURRENT",
    label: "Informacja jest aktualna",
    hint: "Potwierdzam, że wybrane dane nadal się zgadzają.",
  },
];

export function buildPlaceUpdateDescription(
  assessment: PlaceUpdateAssessment,
  note: string,
) {
  const normalizedNote = note.trim();
  const prefix = assessment === "CHANGED"
    ? "Zgłaszający wskazuje, że wybrane informacje uległy zmianie."
    : assessment === "UNCERTAIN"
      ? "Zgłaszający nie ma pewności i prosi o ponowne sprawdzenie wybranych informacji."
      : "Zgłaszający potwierdza, że wybrane informacje są aktualne.";

  return normalizedNote ? `${prefix} ${normalizedNote}` : prefix;
}
