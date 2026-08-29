import type { PlaceProfileKindValue } from "@/types/place-admin";

export const placeProfileLabels: Record<PlaceProfileKindValue, string> = {
  SUPPORT: "Pomoc / wsparcie",
  ACCOMMODATION: "Nocleg / schronienie",
  FOOD_SHARING: "Jadłodzielnia / lodówka społeczna",
  MOBILE_SERVICE: "Mobilny / sezonowy punkt pomocy",
};

export const placeProfileDescriptions: Record<PlaceProfileKindValue, string> = {
  SUPPORT: "Punkt, w którym można otrzymać pomoc lub informacje.",
  ACCOMMODATION: "Miejsce zapewniające nocleg albo schronienie.",
  FOOD_SHARING: "Miejsce bezpośredniego, samoobsługowego dostępu do jedzenia.",
  MOBILE_SERVICE: "Jedna usługa działająca w wielu oznaczonych lokalizacjach.",
};

export function requiredProfileCategory(kind: PlaceProfileKindValue) {
  if (kind === "ACCOMMODATION") return "nocleg";
  if (kind === "FOOD_SHARING") return "lodowka-spoleczna";
  return null;
}

export function orderPrimaryCategorySlugs(categorySlugs: string[], primaryCategorySlug: string) {
  return [primaryCategorySlug, ...categorySlugs.filter((slug) => slug !== primaryCategorySlug)];
}

type ProfileInferenceInput = {
  name: string;
  description?: string | null;
  typeLabel?: string | null;
  categorySlugs: string[];
  hasAccommodationDetails?: boolean;
  services?: string[];
};

export function inferPlaceProfileKind(place: ProfileInferenceInput): PlaceProfileKindValue {
  const text = [place.name, place.description, place.typeLabel, ...place.services ?? []].filter(Boolean).join(" ").toLocaleLowerCase("pl-PL");
  if (place.categorySlugs.includes("lodowka-spoleczna") || /jadłodziel|jadlodziel|lodówk|lodowk/iu.test(text)) return "FOOD_SHARING";
  if (/mobiln|autobus pomoc|bus pomoc|przystank/iu.test(text)) return "MOBILE_SERVICE";
  if (place.hasAccommodationDetails || /schronisk|noclegown|ogrzewal|hostel|miejsce nocleg|dom samotn/iu.test(text)) return "ACCOMMODATION";
  return "SUPPORT";
}

export function placeProfileLabel(kind: PlaceProfileKindValue) {
  return placeProfileLabels[kind];
}
