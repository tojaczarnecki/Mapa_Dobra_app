import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import { MapExperience } from "@/components/map/map-experience";
import type { MapCategoryFilter } from "@/components/map/map-filters";
import { getPublicMapPlaces, getPublicSearchPlaces } from "@/lib/places/public-data";
import { interpretSearchQuery } from "@/lib/places/search-intent";
import { filterPublicSearchPlaces } from "@/lib/places/search";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Mapa miejsc pomocy | Mapa Dobra",
  description: "Znajdź miejsca pomocy w swojej okolicy na mapie Łodzi.",
  alternates: canonicalAlternates("/mapa"),
};

type MapPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    zapytanie?: string | string[];
    kategoria?: string | string[];
    otwarte?: string | string[];
    dzisiaj?: string | string[];
    bezplatne?: string | string[];
    bez_skierowania?: string | string[];
    bez_dokumentow?: string | string[];
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
  "psychological",
  "clothing",
  "other",
]);

const categoryAliases: Record<string, MapCategoryFilter> = {
  jedzenie: "food",
  nocleg: "accommodation",
  higiena: "hygiene",
  prysznic: "hygiene",
  "pomoc-medyczna": "medical",
  "pomoc-prawna": "legal",
  "pomoc-psychologiczna": "psychological",
  odziez: "clothing",
  inne: "other",
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const [params, places, searchPlaces] = await Promise.all([
    searchParams,
    getPublicMapPlaces(),
    getPublicSearchPlaces(),
  ]);

  const rawQuery = firstValue(params.q).trim();
  const savedIntentText = firstValue(params.zapytanie).trim();
  const detectedIntent = rawQuery && !savedIntentText ? interpretSearchQuery(rawQuery) : undefined;
  const intentFilters = detectedIntent?.recognized ? detectedIntent.filters : {};
  const intentText = savedIntentText || (detectedIntent?.recognized ? rawQuery : "");

  const requestedCategoryValue = firstValue(params.kategoria) || intentFilters.category || "";
  const requestedCategory = categoryAliases[requestedCategoryValue] ?? requestedCategoryValue as MapCategoryFilter;
  const initialCategory = validCategories.has(requestedCategory)
    ? requestedCategory
    : "all";

  const todayEligibleIds = filterPublicSearchPlaces(searchPlaces, { today: true }).map((place) => place.id);
  const noReferralEligibleIds = filterPublicSearchPlaces(searchPlaces, { noReferral: true }).map((place) => place.id);
  const noDocumentsEligibleIds = filterPublicSearchPlaces(searchPlaces, { noDocuments: true }).map((place) => place.id);

  return (
    <MapExperience
      places={places}
      initialQuery={detectedIntent?.recognized ? "" : rawQuery}
      initialIntentText={intentText}
      initialCategory={initialCategory}
      initialOpenNow={firstValue(params.otwarte) === "1" || intentFilters.openNow === true}
      initialToday={firstValue(params.dzisiaj) === "1" || intentFilters.today === true}
      initialFree={firstValue(params.bezplatne) === "1" || intentFilters.free === true}
      initialNoReferral={firstValue(params.bez_skierowania) === "1" || intentFilters.noReferral === true}
      initialNoDocuments={firstValue(params.bez_dokumentow) === "1" || intentFilters.noDocuments === true}
      initialLocate={firstValue(params.lokalizacja) === "moja"}
      todayEligibleIds={todayEligibleIds}
      noReferralEligibleIds={noReferralEligibleIds}
      noDocumentsEligibleIds={noDocumentsEligibleIds}
    />
  );
}
