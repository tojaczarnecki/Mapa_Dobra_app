export const FAVORITES_STORAGE_KEY = "mapa-dobra:favorites:v1";
export const FAVORITES_CHANGED_EVENT = "mapa-dobra:favorites-changed";

export type FavoritePlace = {
  id: string;
  href: string;
  name: string;
  categoryLabel: string;
  statusLabel: string;
  statusTone: "open" | "openToday" | "closed" | "unknown";
  todayHours: string;
  distanceLabel: string;
  address: string;
  phone?: string;
  savedAt: string;
};

function isFavoritePlace(value: unknown): value is FavoritePlace {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FavoritePlace>;
  return Boolean(
    typeof item.id === "string" &&
      typeof item.href === "string" &&
      typeof item.name === "string" &&
      typeof item.categoryLabel === "string" &&
      typeof item.statusLabel === "string" &&
      typeof item.todayHours === "string" &&
      typeof item.distanceLabel === "string" &&
      typeof item.address === "string" &&
      typeof item.savedAt === "string",
  );
}

export function readFavorites(): FavoritePlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFavoritePlace);
  } catch {
    return [];
  }
}

function persistFavorites(items: FavoritePlace[]) {
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export function isFavorite(id: string) {
  return readFavorites().some((item) => item.id === id);
}

export function toggleFavorite(place: Omit<FavoritePlace, "savedAt">) {
  const current = readFavorites();
  const exists = current.some((item) => item.id === place.id);
  if (exists) {
    persistFavorites(current.filter((item) => item.id !== place.id));
    return false;
  }
  persistFavorites([{ ...place, savedAt: new Date().toISOString() }, ...current].slice(0, 50));
  return true;
}

export function removeFavorite(id: string) {
  persistFavorites(readFavorites().filter((item) => item.id !== id));
}
