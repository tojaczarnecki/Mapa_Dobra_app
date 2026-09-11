import type { Metadata } from "next";
import Link from "next/link";
import { Roboto } from "next/font/google";
import { redirect } from "next/navigation";
import { Maximize2, Minimize2 } from "lucide-react";
import { NoResults } from "@/components/places/no-results";
import { PlaceCard } from "@/components/places/place-card";
import { SearchResultsFilterPanel } from "@/components/places/search-results-filter-panel";
import { FoodSharingModule } from "@/components/places/food-sharing-module";
import { SearchResultsInteractive } from "@/components/places/search-results-interactive";
import { SearchControl } from "@/components/search/search-control";
import { LocationControl } from "@/components/search/location-control";
import { getPublicMapPlaces, getPublicSearchPlaces } from "@/lib/places/public-data";
import { interpretSearchQuery, searchIntentHref } from "@/lib/places/search-intent";
import { filterPublicSearchPlaces, type PublicSearchFilters } from "@/lib/places/search";
import { canonicalAlternates } from "@/lib/site-url";

const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Znajdź pomoc | Dobra Mapa",
  description: "Wyszukaj miejsca pomocy w Łodzi.",
  alternates: canonicalAlternates("/szukaj"),
};

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function searchHref(current: URLSearchParams, key: string, value?: string) {
  const params = new URLSearchParams(current);
  if (!value || params.get(key) === value) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  return query ? `/szukaj?${query}` : "/szukaj";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const query = first(raw.q || raw.query).trim();
  const interpretedText = first(raw.zapytanie).trim();

  if (query && !interpretedText) {
    const detected = interpretSearchQuery(query);
    if (detected.recognized) redirect(searchIntentHref(query));
  }

  const category = first(raw.kategoria);
  const sortValue = first(raw.sort);
  const sort: PublicSearchFilters["sort"] = ["distance", "open"].includes(sortValue)
    ? sortValue as "distance" | "open"
    : "best";
  const filters: PublicSearchFilters = {
    query: interpretedText ? undefined : query || undefined,
    category: category || undefined,
    openNow: first(raw.otwarte) === "1",
    today: first(raw.dzisiaj) === "1",
    free: first(raw.bezplatne) === "1",
    noReferral: first(raw.bez_skierowania) === "1",
    noDocuments: first(raw.bez_dokumentow) === "1",
    sort,
  };

  const [allPlaces, allMapPlaces] = await Promise.all([getPublicSearchPlaces(), getPublicMapPlaces()]);
  const places = filterPublicSearchPlaces(allPlaces, filters);
  const foodJourney = category === "jedzenie";
  const foodSharingPlaces = allPlaces.filter(
    (place) => place.profileKind === "FOOD_SHARING" &&
      (place.categorySlugs.includes("jedzenie") || place.categorySlugs.includes("lodowka-spoleczna")),
  );
  const visiblePlaces = foodJourney ? places.filter((place) => place.profileKind !== "FOOD_SHARING") : places;
  const filterablePlaces = foodJourney ? allPlaces.filter((place) => place.profileKind !== "FOOD_SHARING") : allPlaces;
  const resultIds = new Set(visiblePlaces.map((place) => place.id));
  const mapPlaces = allMapPlaces.filter((place) => resultIds.has(place.id));

  const current = new URLSearchParams();
  if (interpretedText) current.set("zapytanie", interpretedText);
  else if (query) current.set("q", query);
  if (category) current.set("kategoria", category);
  if (filters.openNow) current.set("otwarte", "1");
  if (filters.today) current.set("dzisiaj", "1");
  if (filters.free) current.set("bezplatne", "1");
  if (filters.noReferral) current.set("bez_skierowania", "1");
  if (filters.noDocuments) current.set("bez_dokumentow", "1");
  if (sort !== "best") current.set("sort", sort);
  const location = first(raw.lokalizacja);
  if (location) current.set("lokalizacja", location);

  const mapView = first(raw.view) === "map";
  const mapViewParams = new URLSearchParams(current);
  mapViewParams.set("view", "map");
  const locationHrefParams = new URLSearchParams(mapViewParams);
  locationHrefParams.set("lokalizacja", "moja");
  const listHref = current.toString() ? `/szukaj?${current.toString()}` : "/szukaj";
  const mapHref = `/szukaj?${mapViewParams.toString()}`;

  const categories = Array.from(
    new Map(
      allPlaces.flatMap((place) =>
        place.categorySlugs.map((slug, index) => [slug, place.helpTypes[index] ?? slug] as const),
      ),
    ).entries(),
  ).sort((left, right) => left[1].localeCompare(right[1], "pl"));

  const quickFilters = [
    { label: "Otwarte teraz", key: "otwarte", value: "1", active: filters.openNow },
    { label: "Dzisiaj", key: "dzisiaj", value: "1", active: filters.today },
    { label: "Najbliżej", key: "sort", value: "distance", active: sort === "distance" },
    { label: "Bezpłatne", key: "bezplatne", value: "1", active: filters.free },
    { label: "Bez skierowania", key: "bez_skierowania", value: "1", active: filters.noReferral },
    { label: "Bez dokumentów", key: "bez_dokumentow", value: "1", active: filters.noDocuments },
  ];
  const activeFilterCount = Number(Boolean(category)) + quickFilters.filter((filter) => filter.active && filter.key !== "sort").length;
  const practicalFilterOptions = quickFilters
    .filter((filter) => filter.key !== "sort")
    .map((filter) => ({ ...filter, active: Boolean(filter.active), href: searchHref(current, filter.key, filter.value) }));
  const categoryOptions = categories.map(([slug, label]) => ({
    label,
    key: "kategoria",
    value: slug,
    href: searchHref(current, "kategoria", slug),
    active: category === slug,
  }));
  const sortOptions = [
    { label: "Najlepiej dopasowane", key: "sort", value: "best", href: searchHref(current, "sort"), active: sort === "best" },
    { label: "Najbliżej", key: "sort", value: "distance", href: searchHref(current, "sort", "distance"), active: sort === "distance" },
  ];

  const searchValue = interpretedText || query;
  const preserveFiltersOnSubmit = !interpretedText;
  const resultsMode = visiblePlaces.length > 0;
  const resultCountLabel = visiblePlaces.length === 1
    ? "miejsce"
    : visiblePlaces.length >= 2 && visiblePlaces.length <= 4
      ? "miejsca"
      : "miejsc";

  return (
    <div
      className={[
        roboto.className,
        "search-results-page search-results-xd-page journey-search mobile-nav-safe-content",
        resultsMode ? "search-results-results-mode" : "",
        mapView ? "search-results-map-mode" : "",
      ].join(" ")}
      data-search-design="xd-screen-2"
    >
      <SearchResultsInteractive places={mapPlaces} mapView={mapView} listHref={listHref}>
        <section className="search-xd-column">
          <div className="search-results-query-area">
            <div className="search-xd-query-stack">
              <div className="search-results-route-label" aria-hidden="true">SZUKAM WSPARCIA</div>

              <div className="search-results-heading-row">
                <h1 className="search-xd-title">Znajdź pomoc</h1>
                <p className="search-xd-subtitle">Napisz po prostu, czego potrzebujesz.</p>
              </div>

              <div className="search-results-mobile-search-row">
                <SearchControl
                  action="/szukaj"
                  id="search-query"
                  label="Czego szukasz?"
                  defaultValue={searchValue}
                  placeholder="Np. Ciepły posiłek, prysznic, pomoc praw…"
                  categories={categories.map(([slug, label]) => ({ slug, label }))}
                  places={allPlaces.map(({ id, name, categorySlug, slug, searchText }) => ({ id, name, categorySlug, slug, searchText }))}
                  hiddenFields={<>{preserveFiltersOnSubmit && category ? <input key="kategoria" type="hidden" name="kategoria" value={category} /> : null}{preserveFiltersOnSubmit && filters.openNow ? <input key="otwarte" type="hidden" name="otwarte" value="1" /> : null}{preserveFiltersOnSubmit && filters.today ? <input key="dzisiaj" type="hidden" name="dzisiaj" value="1" /> : null}{preserveFiltersOnSubmit && filters.free ? <input key="bezplatne" type="hidden" name="bezplatne" value="1" /> : null}{preserveFiltersOnSubmit && filters.noReferral ? <input key="bez_skierowania" type="hidden" name="bez_skierowania" value="1" /> : null}{preserveFiltersOnSubmit && filters.noDocuments ? <input key="bez_dokumentow" type="hidden" name="bez_dokumentow" value="1" /> : null}{preserveFiltersOnSubmit && sort !== "best" ? <input key="sort" type="hidden" name="sort" value={sort} /> : null}</>}
                  trailing={<SearchResultsFilterPanel activeFilterCount={activeFilterCount} practicalFilters={practicalFilterOptions} categories={categoryOptions} sortOptions={sortOptions} baseParams={Object.fromEntries(current.entries())} baseFilters={filters} places={filterablePlaces.map(({ id, name, categorySlug, slug, categorySlugs, searchText, status, openNow, todayHours, free, referralRequired, documentRequired, distanceKm }) => ({ id, name, categorySlug, slug, categorySlugs, searchText, status, openNow, todayHours, free, referralRequired, documentRequired, distanceKm }))} />}
                />
              </div>

              <div className="search-results-meta-toolbar" aria-label="Widok i lokalizacja wyników">
                <span className="search-results-meta-count">{visiblePlaces.length} {resultCountLabel}</span>
                <Link className="search-xd-map-link" href={mapView ? listHref : mapHref} aria-label={mapView ? "Wróć do listy wyników" : "Pokaż wyniki na mapie"}>
                  {mapView ? <Minimize2 aria-hidden="true" size={15} /> : <Maximize2 aria-hidden="true" size={15} />}
                </Link>
                <LocationControl changeHref={`/szukaj?${locationHrefParams.toString()}`} />
              </div>
            </div>
          </div>

          <div data-search-result-list className="search-xd-result-list">
            {visiblePlaces.map((place) => <PlaceCard key={place.id} place={place} returnTo={listHref} visualMode="xd-results" />)}
            {visiblePlaces.length === 0 ? <NoResults /> : null}
          </div>

          {foodJourney && foodSharingPlaces.length ? <FoodSharingModule fallback={visiblePlaces.length === 0} /> : null}
        </section>
      </SearchResultsInteractive>
    </div>
  );
}
