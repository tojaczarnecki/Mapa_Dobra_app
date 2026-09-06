import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPinned, Navigation } from "lucide-react";
import { PlaceCard } from "@/components/places/place-card";
import { SearchResultsFilterPanel } from "@/components/places/search-results-filter-panel";
import { SearchResultsInteractive } from "@/components/places/search-results-interactive";
import { LocationControl } from "@/components/search/location-control";
import { SearchControl } from "@/components/search/search-control";
import { filterPublicSearchPlaces, type PublicSearchFilters } from "@/lib/places/search";
import { getPublicMapPlaces, getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Lodówki społeczne w pobliżu | Dobra Mapa",
  description: "Sprawdź pobliskie lodówki społeczne i ich lokalizację na mapie.",
  alternates: canonicalAlternates("/lodowki-spoleczne"),
};

type FoodSharingPageProps = { searchParams: Promise<{ sort?: string | string[] }> };

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function FoodSharingPage({ searchParams }: FoodSharingPageProps) {
  const params = await searchParams;
  const sort = first(params.sort) === "distance" ? "distance" : "best";
  const allPlaces = await getPublicSearchPlaces();
  const fridges = filterPublicSearchPlaces(
    allPlaces.filter((place) => place.profileKind === "FOOD_SHARING"),
    { sort },
  );
  const ids = new Set(fridges.map((place) => place.id));
  const mapPlaces = (await getPublicMapPlaces()).filter((place) => ids.has(place.id));
  const sortHref = sort === "distance" ? "/lodowki-spoleczne" : "/lodowki-spoleczne?sort=distance";
  const categories = Array.from(
    new Map(
      allPlaces.flatMap((place) =>
        place.categorySlugs.map((slug, index) => [slug, place.helpTypes[index] ?? slug] as const),
      ),
    ).entries(),
  ).sort((left, right) => left[1].localeCompare(right[1], "pl"));
  const searchFilterPlaces = allPlaces.map(({ id, name, categorySlug, slug, categorySlugs, searchText, status, openNow, todayHours, free, referralRequired, documentRequired, distanceKm }) => ({ id, name, categorySlug, slug, categorySlugs, searchText, status, openNow, todayHours, free, referralRequired, documentRequired, distanceKm }));
  const baseFilters: PublicSearchFilters = { query: undefined, category: undefined, openNow: false, today: false, free: false, noReferral: false, noDocuments: false, sort };
  const practicalFilters = [
    { label: "Otwarte teraz", key: "otwarte", value: "1", active: false },
    { label: "Dzisiaj", key: "dzisiaj", value: "1", active: false },
    { label: "Bezpłatne", key: "bezplatne", value: "1", active: false },
    { label: "Bez skierowania", key: "bez_skierowania", value: "1", active: false },
    { label: "Bez dokumentów", key: "bez_dokumentow", value: "1", active: false },
  ];
  const categoryOptions = categories.map(([slug, label]) => ({ label, key: "kategoria", value: slug, href: "/szukaj", active: false }));
  const sortOptions = [
    { label: "Najlepiej dopasowane", key: "sort", value: "best", href: "/szukaj", active: sort === "best" },
    { label: "Najbliżej", key: "sort", value: "distance", href: "/szukaj?sort=distance", active: sort === "distance" },
  ];

  return (
    <div className="food-sharing-page search-results-page journey-search mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8">
      <Link href="/szukaj?kategoria=jedzenie" className="touch-target mb-4 inline-flex items-center gap-2 rounded-lg px-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft">
        <ArrowLeft aria-hidden="true" size={17} /> Wróć do Jedzenia
      </Link>
      <header className="food-sharing-page-header">
        <p className="food-sharing-module-eyebrow">LODÓWKI SPOŁECZNE</p>
        <h1>Mapa lodówek społecznych</h1>
        <p>Dostępne przez całą dobę, ale ich zawartość zależy od bieżących darów.</p>
        <div className="food-sharing-search">
          <SearchControl
            action="/szukaj"
            id="food-sharing-search"
            label="Czego szukasz?"
            placeholder="np. jedzenie, nocleg, higiena..."
            categories={categories.map(([slug, label]) => ({ slug, label }))}
            places={allPlaces.map(({ id, name, categorySlug, slug, searchText }) => ({ id, name, categorySlug, slug, searchText }))}
            trailing={<SearchResultsFilterPanel activeFilterCount={0} practicalFilters={practicalFilters} categories={categoryOptions} sortOptions={sortOptions} baseParams={{}} baseFilters={baseFilters} places={searchFilterPlaces} />}
          />
        </div>
        <div className="food-sharing-toolbar">
          <LocationControl />
          <span className="food-sharing-result-count">{fridges.length} {fridges.length === 1 ? "lodówka" : "lodówek"}</span>
          <Link href={sortHref} className="food-sharing-sort"><Navigation aria-hidden="true" size={16} />{sort === "distance" ? "Sortuj: polecane" : "Sortuj: najbliżej"}</Link>
          <span className="food-sharing-map-hint"><MapPinned aria-hidden="true" size={16} /> Lista + mapa</span>
        </div>
      </header>
      <SearchResultsInteractive places={mapPlaces}>
        <section className="min-w-0">
          <div data-search-result-list className="grid min-w-0 gap-3 sm:gap-4 lg:max-h-[calc(100dvh-20rem)] lg:overflow-y-auto lg:pr-2">
            {fridges.map((place) => <PlaceCard key={place.id} place={place} returnTo="/lodowki-spoleczne" />)}
          </div>
        </section>
      </SearchResultsInteractive>
    </div>
  );
}
