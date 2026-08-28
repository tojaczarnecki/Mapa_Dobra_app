export const ACCOMMODATION_FRESHNESS_LIMIT_MS = 24 * 60 * 60 * 1000;
export const ACCOMMODATION_FRESHNESS_FRESH_LIMIT_MS = 12 * 60 * 60 * 1000;

export type AvailabilityFreshness = "FRESH" | "AGING" | "STALE" | "UNKNOWN";

export type StoredAvailabilityState =
  | "AVAILABLE"
  | "FEW"
  | "FULL"
  | "UNKNOWN"
  | "STALE"
  | "SUSPENDED";

export function resolveAvailabilityFreshness(
  _state: StoredAvailabilityState,
  confirmedAt: Date | null,
  now = new Date(),
): AvailabilityFreshness {
  if (!confirmedAt) return "UNKNOWN";

  const age = now.getTime() - confirmedAt.getTime();
  if (age > ACCOMMODATION_FRESHNESS_LIMIT_MS) return "STALE";
  if (age > ACCOMMODATION_FRESHNESS_FRESH_LIMIT_MS) return "AGING";
  return "FRESH";
}

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
