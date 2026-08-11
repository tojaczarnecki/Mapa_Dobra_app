import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import { MapExperience } from "@/components/map/map-experience";
import type { MapCategoryFilter } from "@/components/map/map-filters";
import { demoMapPlaces } from "@/data/demo-map-places";

export const metadata: Metadata = {
  title: "Mapa miejsc pomocy | Mapa Dobra",
  description: "Znajdź miejsca pomocy w swojej okolicy na mapie Łodzi.",
};

type MapPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    kategoria?: string | string[];
    otwarte?: string | string[];
    bezplatne?: string | string[];
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

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = await searchParams;
  const requestedCategory = firstValue(params.kategoria) as MapCategoryFilter;
  const initialCategory = validCategories.has(requestedCategory)
    ? requestedCategory
    : "all";

  return (
    <MapExperience
      places={demoMapPlaces}
      initialQuery={firstValue(params.q)}
      initialCategory={initialCategory}
      initialOpenNow={firstValue(params.otwarte) === "1"}
      initialFree={firstValue(params.bezplatne) === "1"}
    />
  );
}
