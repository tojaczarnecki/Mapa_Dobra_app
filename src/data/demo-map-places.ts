import type { PlaceStatus } from "@/data/demo-places";
import { demoAccommodations } from "@/data/demo-accommodations";
import { demoPlaceDetails } from "@/data/demo-place-details";
import { demoPlaces } from "@/data/demo-places";

export type MapCategory =
  | "food"
  | "accommodation"
  | "hygiene"
  | "medical"
  | "legal";

type StandardMapStatus = {
  kind: "standard";
  status: PlaceStatus;
  todayHours: string;
};

type AccommodationMapStatus = {
  kind: "accommodation";
  availabilityState: "available" | "few" | "full" | "unknown" | "stale" | "suspended";
  availabilityLabel: string;
  confirmed: string;
  admissionsToday: string;
  availabilityNote?: string;
};

export type MapPlace = {
  id: string;
  name: string;
  helpTypes: string[];
  categories: MapCategory[];
  latitude: number;
  longitude: number;
  distanceLabel: string;
  address: string;
  phone?: string;
  detailsHref: string;
  openNow: boolean;
  free: boolean;
  searchTerms: string[];
  status: StandardMapStatus | AccommodationMapStatus;
};

const categoryBySlug: Record<string, MapCategory> = {
  jedzenie: "food",
  nocleg: "accommodation",
  higiena: "hygiene",
  "pomoc-medyczna": "medical",
  "pomoc-prawna": "legal",
};

function isConfirmedFree(placeId: string) {
  const detail = demoPlaceDetails.find((place) => place.id === placeId);

  return Boolean(
    detail?.requirements.some(
      (requirement) => requirement.label.toLocaleLowerCase("pl-PL") === "bezpłatnie",
    ) ||
      detail?.accommodation?.overnightInfo.some(
        (item) =>
          item.label.toLocaleLowerCase("pl-PL") === "odpłatność" &&
          item.value.toLocaleLowerCase("pl-PL") === "bezpłatnie",
      ),
  );
}

const standardPlaces: MapPlace[] = demoPlaces
  .filter((place) => place.id !== "nocleg-na-dzis")
  .map((place) => ({
    id: place.id,
    name: place.name,
    helpTypes: place.helpTypes,
    categories: Array.from(
      new Set([
        categoryBySlug[place.categorySlug],
        ...(place.helpTypes.includes("Higiena") || place.helpTypes.includes("Prysznic")
          ? (["hygiene"] as const)
          : []),
      ].filter(Boolean)),
    ),
    latitude: place.latitude,
    longitude: place.longitude,
    distanceLabel: place.distance,
    address: place.address,
    phone: place.phone,
    detailsHref: `/lodz/${place.categorySlug}/${place.slug}`,
    openNow: place.status === "open",
    free: isConfirmedFree(place.id),
    searchTerms: [place.name, ...place.helpTypes, ...place.conditions],
    status: {
      kind: "standard",
      status: place.status,
      todayHours: place.todayHours,
    },
  }));

const detailedAccommodationIds = new Set(
  demoPlaceDetails
    .filter((place) => place.variant === "accommodation")
    .map((place) => place.id),
);

const accommodationPlaces: MapPlace[] = demoAccommodations
  .filter((place) => detailedAccommodationIds.has(place.id))
  .map((place) => ({
    id: place.id,
    name: place.name,
    helpTypes: ["Nocleg"],
    categories: ["accommodation"],
    latitude: place.latitude,
    longitude: place.longitude,
    distanceLabel: place.distanceLabel,
    address:
      demoPlaceDetails.find((detail) => detail.id === place.id)?.address ?? "Łódź",
    phone: place.phone,
    detailsHref: `/lodz/${place.categorySlug}/${place.slug}`,
    openNow:
      place.acceptsToday &&
      place.availability.state !== "none" &&
      place.availability.state !== "suspended",
    free: isConfirmedFree(place.id),
    searchTerms: [
      place.name,
      place.typeLabel,
      place.audienceLabel,
      "nocleg",
      "schronisko",
    ],
    status: {
      kind: "accommodation",
      availabilityState:
        place.availability.state === "fresh"
          ? "available"
          : place.availability.state === "none"
            ? "full"
            : place.availability.state,
      availabilityLabel: place.availability.label,
      confirmed: place.availability.confirmed,
      admissionsToday: place.admissionsToday,
      availabilityNote: place.availability.note,
    },
  }));

// Fikcyjne dane demonstracyjne mapy. Współrzędne służą wyłącznie do testowania UI
// i nie mogą być traktowane jako produkcyjne lokalizacje organizacji.
export const demoMapPlaces: MapPlace[] = [
  ...standardPlaces,
  ...accommodationPlaces,
];

export const lodzMapCenter = [51.7592, 19.456] as const;
