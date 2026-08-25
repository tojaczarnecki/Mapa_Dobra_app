export type SavedPlace = {
  id: string;
  name: string;
  category: string;
  detailHref: string;
  address: string;
  status: string;
  hours: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  savedAt: string;
};

const STORAGE_KEY = "mapa-dobra:saved-places:v1";
const CHANGE_EVENT = "mapa-dobra:saved-places-change";
let cachedRaw: string | null = null;
let cachedPlaces: SavedPlace[] = [];

function isSavedPlace(value: unknown): value is SavedPlace {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<SavedPlace>;
  return typeof place.id === "string" && typeof place.name === "string" &&
    typeof place.detailHref === "string" && typeof place.address === "string";
}

export function readSavedPlaces(): SavedPlace[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
    if (raw === cachedRaw) return cachedPlaces;
    const value: unknown = JSON.parse(raw);
    cachedRaw = raw;
    cachedPlaces = Array.isArray(value) ? value.filter(isSavedPlace) : [];
    return cachedPlaces;
  } catch {
    cachedRaw = null;
    cachedPlaces = [];
    return cachedPlaces;
  }
}

function writeSavedPlaces(places: SavedPlace[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(places.slice(0, 100)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToSavedPlaces(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function savePlace(place: Omit<SavedPlace, "savedAt">) {
  const places = readSavedPlaces().filter((item) => item.id !== place.id);
  writeSavedPlaces([{ ...place, savedAt: new Date().toISOString() }, ...places]);
}

export function removeSavedPlace(id: string) {
  writeSavedPlaces(readSavedPlaces().filter((place) => place.id !== id));
}

export function isPlaceSaved(id: string) {
  return readSavedPlaces().some((place) => place.id === id);
}

export const savedPlacesStorageKey = STORAGE_KEY;
