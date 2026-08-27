import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, List, LocateFixed, Map as MapIcon, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { NoResults } from "@/components/places/no-results";
import { PlaceRow } from "@/components/places/place-row";
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

  const categoryLabel = category
    ? categories.find(([slug]) => slug === category)?.[1] ?? category
    : undefined;

  return (
    <div className="md-results-page">
      <div className="md-results-topbar">
        <Link className="md-icon-button" href="/" aria-label="Wróć na start">
          <ArrowLeft aria-hidden="true" size={20} />
        </Link>

        <form action="/szukaj" method="get" className="md-results-search" aria-label="Wyszukiwarka miejsc pomocy">
          {category ? <input type="hidden" name="kategoria" value={category} /> : null}
          {filters.openNow ? <input type="hidden" name="otwarte" value="1" /> : null}
          {filters.free ? <input type="hidden" name="bezplatne" value="1" /> : null}
          {filters.noReferral ? <input type="hidden" name="bez_skierowania" value="1" /> : null}
          {filters.noDocuments ? <input type="hidden" name="bez_dokumentow" value="1" /> : null}
          {sort !== "best" ? <input type="hidden" name="sort" value={sort} /> : null}
          <Search aria-hidden="true" size={16} />
          <label htmlFor="results-search" className="sr-only">Czego szukasz?</label>
          <input id="results-search" name="q" type="search" defaultValue={query} placeholder={categoryLabel ?? "Czego potrzebujesz?"} />
        </form>

        <details className="md-filter-popover">
          <summary><SlidersHorizontal aria-hidden="true" size={15} />Filtry</summary>
          <div className="md-filter-panel">
            <p className="md-filter-title">Szybkie filtry</p>
            <div className="md-filter-chips">
              {quickFilters.map((filter) => (
                <Link
                  key={filter.label}
                  className="md-filter-chip"
                  href={searchHref(current, filter.key, filter.value)}
                  aria-current={filter.active ? "true" : undefined}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            <p className="md-filter-title" style={{ marginTop: 12 }}>Kategorie</p>
            <div className="md-filter-chips">
              {categories.map(([slug, label]) => (
                <Link
                  key={slug}
                  href={searchHref(current, "kategoria", slug)}
                  className="md-filter-chip"
                  aria-current={category === slug ? "true" : undefined}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </details>
      </div>

      <div className="md-view-toggle" aria-label="Widok wyników">
        <span className="is-active"><List aria-hidden="true" size={16} />Lista</span>
        <Link href={current.toString() ? `/mapa?${current.toString()}` : "/mapa"}><MapIcon aria-hidden="true" size={16} />Mapa</Link>
      </div>

      <div className="md-results-location">
        <span><MapPin aria-hidden="true" size={16} />Moja lokalizacja: Łódź</span>
        <Link href={searchHref(current, "sort", "distance")}><LocateFixed aria-hidden="true" size={14} /> Najbliższe</Link>
      </div>

      <div className="md-results-meta">
        <span>{places.length} {places.length === 1 ? "miejsce" : "miejsc"}</span>
        <span>{query ? `„${query}”` : categoryLabel ?? "Najlepsze dopasowania"}</span>
      </div>

      <div className="md-place-list">
        {places.map((place) => <PlaceRow key={place.id} place={place} />)}
        {places.length === 0 ? <NoResults /> : null}
      </div>
    </div>
  );
}
