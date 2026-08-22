export const ACCOMMODATION_FRESHNESS_LIMIT_MS = 24 * 60 * 60 * 1000;

export type StoredAvailabilityState =
  | "AVAILABLE"
  | "FEW"
  | "FULL"
  | "UNKNOWN"
  | "STALE"
  | "SUSPENDED";

export function resolveAvailabilityState(
  state: StoredAvailabilityState,
  confirmedAt: Date | null,
  now = new Date(),
): StoredAvailabilityState {
  if (["UNKNOWN", "STALE", "SUSPENDED"].includes(state)) return state;
  if (!confirmedAt) return "STALE";
  return now.getTime() - confirmedAt.getTime() > ACCOMMODATION_FRESHNESS_LIMIT_MS
    ? "STALE"
    : state;
}

export function staleAvailabilityNote(state: StoredAvailabilityState, freePlaces?: number) {
  if (state === "AVAILABLE" || state === "FEW") {
    return typeof freePlaces === "number"
      ? `Ostatnio zgłoszono ${freePlaces} ${freePlaces === 1 ? "wolne miejsce" : "wolne miejsca"}. Zadzwoń i potwierdź przed przyjazdem.`
      : "Ostatnio zgłoszono wolne miejsca. Zadzwoń i potwierdź przed przyjazdem.";
  }
  if (state === "FULL") {
    return "Ostatnio zgłoszono brak miejsc. Sytuacja mogła się zmienić - zadzwoń i potwierdź.";
  }
  return "Brak aktualnego potwierdzenia. Zadzwoń przed przyjazdem.";
}
