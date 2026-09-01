export type PublicStatus = "confirmed" | "absent" | "unknown" | "condition";

export const publicStatusSymbol: Record<PublicStatus, string> = {
  confirmed: "✓",
  absent: "×",
  unknown: "?",
  condition: "!",
};

export const publicStatusLabel: Record<PublicStatus, string> = {
  confirmed: "Potwierdzone",
  absent: "Brak / nie",
  unknown: "Brak potwierdzenia",
  condition: "Ważny warunek",
};

export function detailToneToPublicStatus(tone: "positive" | "warning" | "neutral" | "unknown"): PublicStatus {
  if (tone === "positive") return "confirmed";
  if (tone === "warning") return "condition";
  if (tone === "neutral") return "absent";
  return "unknown";
}

export function publicStatusForLabel(label: string): PublicStatus {
  const normalized = label.toLocaleLowerCase("pl-PL");

  if (/(brak potwierdz|brak danych|wymaga potwierdzenia)/.test(normalized)) return "unknown";
  if (/(brak miejsc|nie przyjm|brak windy|nie są przyjm)/.test(normalized)) return "absent";
  if (/(^|\s)bez\b|niewymag|bezpłat/.test(normalized)) return "confirmed";
  if (/(wymag|trzeź|limit|najpierw zadzwoń)/.test(normalized)) return "condition";
  return "confirmed";
}
