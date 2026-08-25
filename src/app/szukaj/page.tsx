import type { Metadata } from "next";
import Link from "next/link";
import { List, LocateFixed, Map as MapIcon, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { getCategoryAccentMap } from "@/lib/home/category-accent";
import { CategoryChip } from "@/components/categories/category-chip";
import { NoResults } from "@/components/places/no-results";
import { PlaceCard } from "@/components/places/place-card";
import { SearchSortSelect } from "@/components/places/search-sort-select";
import { TextField } from "@/components/ui/text-field";
import { getPublicSearchPlaces } from "@/lib/places/public-data";
import { filterPublicSearchPlaces, type PublicSearchFilters } from "@/lib/places/search";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Znajdź pomoc | Mapa Dobra",
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
  const query = first(raw.q || raw.query);
  const category = first(raw.kategoria);
  const sortValue = first(raw.sort);
  const sort: PublicSearchFilters["sort"] = ["distance", "open"].includes(sortValue)
    ? sortValue as "distance" | "open"
    : "best";
  const filters: PublicSearchFilters = {
    query,
    category: category || undefined,
    openNow: first(raw.otwarte) === "1",
    free: first(raw.bezplatne) === "1",
    noReferral: first(raw.bez_skierowania) === "1",
    noDocuments: first(raw.bez_dokumentow) === "1",
    sort,
  };
  const allPlaces = await getPublicSearchPlaces();
  const places = filterPublicSearchPlaces(allPlaces, filters);
  const current = new URLSearchParams();
  if (query) current.set("q", query);
  if (category) current.set("kategoria", category);
  if (filters.openNow) current.set("otwarte", "1");
  if (filters.free) current.set("bezplatne", "1");
  if (filters.noReferral) current.set("bez_skierowania", "1");
  if (filters.noDocuments) current.set("bez_dokumentow", "1");
  if (sort !== "best") current.set("sort", sort);
  const categories = Array.from(
    new Map(
      allPlaces.flatMap((place) =>
        place.categorySlugs.map((slug, index) => [slug, place.helpTypes[index] ?? slug] as const),
      ),
    ).entries(),
  ).sort((left, right) => left[1].localeCompare(right[1], "pl"));
  const quickFilters = [
    { label: "Otwarte teraz", key: "otwarte", value: "1", active: filters.openNow },
    { label: "Najbliżej", key: "sort", value: "distance", active: sort === "distance" },
    { label: "Bezpłatne", key: "bezplatne", value: "1", active: filters.free },
    { label: "Bez skierowania", key: "bez_skierowania", value: "1", active: filters.noReferral },
    { label: "Bez dokumentów", key: "bez_dokumentow", value: "1", active: filters.noDocuments },
  ];
  const categoryAccents = getCategoryAccentMap(categories.map(([slug]) => slug));

  return (
    <div className="search-page">
      <div className="search-layout">
        <section className="search-main">
          <header className="search-hero">
            <h1>Znajdź pomoc</h1>
            <p>Wpisz, czego potrzebujesz, prostym językiem.</p>

            <form action="/szukaj" method="get" aria-label="Wyszukiwarka miejsc pomocy">
                {category ? <input type="hidden" name="kategoria" value={category} /> : null}
                {filters.openNow ? <input type="hidden" name="otwarte" value="1" /> : null}
                {filters.free ? <input type="hidden" name="bezplatne" value="1" /> : null}
                {filters.noReferral ? <input type="hidden" name="bez_skierowania" value="1" /> : null}
                {filters.noDocuments ? <input type="hidden" name="bez_dokumentow" value="1" /> : null}
                {sort !== "best" ? <input type="hidden" name="sort" value={sort} /> : null}
              <TextField icon={<Search aria-hidden="true" size={22} strokeWidth={2.25} />} label="Czego szukasz?" name="q" defaultValue={query} placeholder="jedzenie" className="search-input" />
            </form>

            <div className="search-location">
              <span><MapPin aria-hidden="true" size={18} />Łódź</span>
              <Link href="/mapa">Zmień lokalizację</Link>
              <Link href={searchHref(current, "sort", "distance")}><LocateFixed aria-hidden="true" size={16} />Pokaż najbliższe</Link>
            </div>
          </header>

          <div className="search-controls">
            <div aria-label="Szybkie filtry" className="filter-scroll search-filter-row">
              {quickFilters.map((filter) => (
                <Link key={filter.label} className={["filter-chip", filter.active ? "filter-chip-active" : ""].join(" ")} href={searchHref(current, filter.key, filter.value)} aria-current={filter.active ? "true" : undefined}>{filter.label}</Link>
              ))}
              <a className="filter-chip filter-chip-filter" href="#filtry-kategorie"><SlidersHorizontal aria-hidden="true" size={16} />Filtry</a>
            </div>

            <details id="filtry-kategorie" className="search-category-filter">
              <summary>
                Kategorie pomocy
                {category ? <span className="search-active-category">{categories.find(([slug]) => slug === category)?.[1] ?? category} ×</span> : null}
              </summary>
              <div className="search-category-options">
                {categories.map(([slug, label]) => (
                  <CategoryChip
                    key={slug}
                    label={label}
                    slug={slug}
                    active={category === slug}
                    href={searchHref(current, "kategoria", slug)}
                  />
                ))}
              </div>
            </details>

            <div className="search-results-header">
              <div>
                <p>{places.length} {places.length === 1 ? "miejsce" : "miejsca"}</p>
                {query || category ? <span>{query ? `Wyniki dla: ${query}` : `Kategoria: ${categories.find(([slug]) => slug === category)?.[1] ?? category}`}</span> : null}
              </div>
              <label className="search-results-sort"><span className="sr-only">Sortuj</span><SearchSortSelect value={sort} queryString={current.toString()} /></label>
              <div aria-label="Widok wyników" className="search-view-toggle">
                <span className="search-view-active"><List aria-hidden="true" size={16} />Lista</span>
                <Link href={current.toString() ? `/mapa?${current.toString()}` : "/mapa"}><MapIcon aria-hidden="true" size={16} />Mapa</Link>
              </div>
            </div>
          </div>

          <div className="search-results-list">
            {places.map((place) => <PlaceCard key={place.id} place={place} accent={categoryAccents.get(place.categorySlug)} />)}
            {places.length === 0 ? <NoResults mapHref={current.toString() ? `/mapa?${current.toString()}` : "/mapa"} /> : null}
          </div>
        </section>

        <aside className="search-map-panel">
          <MapIcon aria-hidden="true" size={24} />
          <h2>Zobacz na mapie</h2>
          <p>Porównaj lokalizacje i wybierz miejsce, do którego najłatwiej dotrzeć.</p>
          <Link href={current.toString() ? `/mapa?${current.toString()}` : "/mapa"}>Otwórz mapę</Link>
        </aside>
      </div>
    </div>
  );
}
