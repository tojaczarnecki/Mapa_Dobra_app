import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import { MapExperience } from "@/components/map/map-experience";
import type { MapCategoryFilter } from "@/components/map/map-filters";
import { getPublicMapPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Mapa miejsc pomocy | Mapa Dobra",
  description: "Znajdź miejsca pomocy w swojej okolicy na mapie Łodzi.",
  alternates: canonicalAlternates("/mapa"),
};

type MapPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    kategoria?: string | string[];
    otwarte?: string | string[];
    bezplatne?: string | string[];
    lokalizacja?: string | string[];
  }>;
};

const validCategories = new Set<MapCategoryFilter>([
  "all",
  "food",
  "accommodation",
  "hygiene",
  "medical",
  "legal",
]);

const categoryAliases: Record<string, MapCategoryFilter> = {
  jedzenie: "food",
  nocleg: "accommodation",
  higiena: "hygiene",
  prysznic: "hygiene",
  "pomoc-medyczna": "medical",
  "pomoc-prawna": "legal",
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const [params, places] = await Promise.all([searchParams, getPublicMapPlaces()]);
  const requestedCategoryValue = firstValue(params.kategoria);
  const requestedCategory = categoryAliases[requestedCategoryValue] ?? requestedCategoryValue as MapCategoryFilter;
  const initialCategory = validCategories.has(requestedCategory)
    ? requestedCategory
    : "all";

  return (
    <MapExperience
      places={places}
      initialQuery={firstValue(params.q)}
      initialCategory={initialCategory}
      initialOpenNow={firstValue(params.otwarte) === "1"}
      initialFree={firstValue(params.bezplatne) === "1"}
      initialLocate={firstValue(params.lokalizacja) === "moja"}
    />
  );
}
