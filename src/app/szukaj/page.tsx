import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { List, Map as MapIcon, Sparkles, X } from "lucide-react";
import { NoResults } from "@/components/places/no-results";
import { PlaceCard } from "@/components/places/place-card";
import { SearchResultsFilterPanel } from "@/components/places/search-results-filter-panel";
import { FoodSharingModule } from "@/components/places/food-sharing-module";
import { SearchResultsInteractive, SearchResultsMapToggle } from "@/components/places/search-results-interactive";
import { SearchControl } from "@/components/search/search-control";
import { LocationControl } from "@/components/search/location-control";
import { getPublicMapPlaces, getPublicSearchPlaces } from "@/lib/places/public-data";
import { interpretSearchQuery, searchIntentHref, type SearchIntentToken } from "@/lib/places/search-intent";
import { filterPublicSearchPlaces, type PublicSearchFilters } from "@/lib/places/search";
import { canonicalAlternates } from "@/lib/site-url";

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

const intentParamByFilter: Record<SearchIntentToken["filterKey"], string | undefined> = {
  query: "q",
  category: "kategoria",
  openNow: "otwarte",
  today: "dzisiaj",
  free: "bezplatne",
  noReferral: "bez_skierowania",
  noDocuments: "bez_dokumentow",
  sort: "sort",
};

function tokenIsActive(token: SearchIntentToken, filters: PublicSearchFilters) {
  return filters[token.filterKey] === token.value;
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
  const originalIntent = interpretedText ? interpretSearchQuery(interpretedText) : undefined;
  const activeIntentTokens = originalIntent?.tokens.filter((token) => tokenIsActive(token, filters)) ?? [];
  const searchValue = interpretedText || query;
  const preserveFiltersOnSubmit = !interpretedText;
  const resultsMode = visiblePlaces.length > 0;
  const resultCountLabel = visiblePlaces.length === 1
    ? "miejsce"
    : visiblePlaces.length >= 2 && visiblePlaces.length <= 4
      ? "miejsca"
      : "miejsc";

  return (
    <div className={["search-results-page journey-search mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8", resultsMode ? "search-results-results-mode" : ""].join(" ")}>
      <SearchResultsInteractive places={mapPlaces}>
        <section className="min-w-0 space-y-3 sm:space-y-4">
          <div className="search-results-query-area w-full min-w-0 max-w-full">
            <div className="min-w-0 space-y-3 sm:space-y-4">
              <div className="search-results-heading-row flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-2">
                <div className="space-y-1 sm:space-y-2">
                  <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">Znajdź pomoc</h1>
                  <p className="hidden text-base leading-7 text-muted-foreground sm:block">Napisz po prostu, czego potrzebujesz.</p>
                </div>
                <div className="search-results-meta-toolbar hidden lg:flex">
                  <span className="search-results-meta-count">{visiblePlaces.length} {resultCountLabel}</span>
                  <SearchResultsMapToggle />
                  <LocationControl />
                </div>
              </div>

              <div className="search-results-mobile-toolbar lg:hidden">
                <LocationControl />
                <div aria-label="Widok wyników" className="search-results-mobile-view-toggle">
                  <span aria-current="page"><List aria-hidden="true" size={15} />Lista</span>
                  <Link href={current.toString() ? `/mapa?${current.toString()}` : "/mapa"}><MapIcon aria-hidden="true" size={15} />Mapa</Link>
                </div>
              </div>

              <div className="search-results-mobile-search-row">
                <SearchControl
                  action="/szukaj"
                  id="search-query"
                  label="Czego szukasz?"
                  defaultValue={searchValue}
                  placeholder="np. ciepły posiłek dzisiaj bez skierowania"
                  categories={categories.map(([slug, label]) => ({ slug, label }))}
                  places={allPlaces.map(({ id, name, categorySlug, slug, searchText }) => ({ id, name, categorySlug, slug, searchText }))}
                  hiddenFields={<>{preserveFiltersOnSubmit && category ? <input type="hidden" name="kategoria" value={category} /> : null}{preserveFiltersOnSubmit && filters.openNow ? <input type="hidden" name="otwarte" value="1" /> : null}{preserveFiltersOnSubmit && filters.today ? <input type="hidden" name="dzisiaj" value="1" /> : null}{preserveFiltersOnSubmit && filters.free ? <input type="hidden" name="bezplatne" value="1" /> : null}{preserveFiltersOnSubmit && filters.noReferral ? <input type="hidden" name="bez_skierowania" value="1" /> : null}{preserveFiltersOnSubmit && filters.noDocuments ? <input type="hidden" name="bez_dokumentow" value="1" /> : null}{preserveFiltersOnSubmit && sort !== "best" ? <input type="hidden" name="sort" value={sort} /> : null}</>}
                  trailing={<SearchResultsFilterPanel activeFilterCount={activeFilterCount} practicalFilters={practicalFilterOptions} categories={categoryOptions} sortOptions={sortOptions} baseParams={Object.fromEntries(current.entries())} baseFilters={filters} places={filterablePlaces.map(({ id, name, categorySlug, slug, categorySlugs, searchText, status, openNow, todayHours, free, referralRequired, documentRequired, distanceKm }) => ({ id, name, categorySlug, slug, categorySlugs, searchText, status, openNow, todayHours, free, referralRequired, documentRequired, distanceKm }))} />}
                />
                <span className="search-results-mobile-count">{visiblePlaces.length} {resultCountLabel}</span>
              </div>

              {interpretedText ? (
                <div className="smart-intent-summary" aria-label="Interpretacja wyszukiwania">
                  <div className="smart-intent-copy">
                    <Sparkles aria-hidden="true" size={17} />
                    <div>
                      <strong>Rozumiem:</strong>
                      <span>{activeIntentTokens.length ? activeIntentTokens.map((token) => token.label).join(" · ") : "bez dodatkowych filtrów"}</span>
                    </div>
                  </div>
                  {activeIntentTokens.length ? (
                    <div className="smart-intent-chips">
                      {activeIntentTokens.map((token) => {
                        const param = intentParamByFilter[token.filterKey];
                        return param ? (
                          <Link key={token.id} href={searchHref(current, param)} title={`Usuń filtr: ${token.label}`}>
                            {token.label}<X aria-hidden="true" size={12} />
                          </Link>
                        ) : null;
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

            </div>
          </div>

          {interpretedText || query ? <p className="min-w-0 text-xs font-semibold text-muted-foreground sm:text-sm">{interpretedText ? `Dopasowane do: ${interpretedText}` : `Wyniki dla: ${query}`}</p> : null}

          <div data-search-result-list className="grid min-w-0 gap-3 overscroll-contain sm:gap-4 lg:max-h-[calc(100dvh-18rem)] lg:overflow-y-auto lg:scroll-pb-6 lg:pr-2">
            {visiblePlaces.map((place) => <PlaceCard key={place.id} place={place} returnTo={current.toString() ? `/szukaj?${current.toString()}` : "/szukaj"} />)}
            {visiblePlaces.length === 0 ? <NoResults /> : null}
          </div>
          {foodJourney && foodSharingPlaces.length ? <FoodSharingModule fallback={visiblePlaces.length === 0} /> : null}
        </section>

      </SearchResultsInteractive>
    </div>
  );
}
