import type { Metadata } from "next";
import Link from "next/link";
import { List, LocateFixed, Map as MapIcon, MapPin, Search, SlidersHorizontal } from "lucide-react";
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

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,680px)_minmax(320px,1fr)] lg:items-start lg:gap-8">
        <section className="min-w-0 space-y-3 sm:space-y-4">
          <div className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-3 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
            <div className="min-w-0 space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">Znajdź pomoc</h1>
                <p className="hidden text-base leading-7 text-muted-foreground sm:block">Wpisz, czego potrzebujesz, prostym językiem.</p>
              </div>

              <form action="/szukaj" method="get" className="min-w-0" aria-label="Wyszukiwarka miejsc pomocy">
                {category ? <input type="hidden" name="kategoria" value={category} /> : null}
                {filters.openNow ? <input type="hidden" name="otwarte" value="1" /> : null}
                {filters.free ? <input type="hidden" name="bezplatne" value="1" /> : null}
                {filters.noReferral ? <input type="hidden" name="bez_skierowania" value="1" /> : null}
                {filters.noDocuments ? <input type="hidden" name="bez_dokumentow" value="1" /> : null}
                {sort !== "best" ? <input type="hidden" name="sort" value={sort} /> : null}
                <TextField icon={<Search aria-hidden="true" size={22} strokeWidth={2.25} />} label="Czego szukasz?" name="q" defaultValue={query} placeholder="jedzenie" className="min-h-12 py-2.5 text-base sm:min-h-16 sm:py-3 sm:text-lg" />
              </form>

              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-border pt-2 text-sm sm:gap-x-3 sm:pt-3">
                <div className="flex items-center gap-1.5 text-base font-extrabold text-foreground"><MapPin aria-hidden="true" size={19} className="text-brand-strong" />Łódź</div>
                <div className="flex min-w-0 flex-wrap gap-1">
                  <Link className="inline-action" href="/mapa">Zmień lokalizację</Link>
                  <Link className="inline-action" href={searchHref(current, "sort", "distance")}><LocateFixed aria-hidden="true" size={16} />Pokaż najbliższe</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div aria-label="Szybkie filtry" className="filter-scroll -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {quickFilters.map((filter) => (
                <Link key={filter.label} className={["filter-chip", filter.active ? "filter-chip-strong bg-brand-soft" : ""].join(" ")} href={searchHref(current, filter.key, filter.value)} aria-current={filter.active ? "true" : undefined}>{filter.label}</Link>
              ))}
              <a className="filter-chip filter-chip-strong" href="#filtry-kategorie"><SlidersHorizontal aria-hidden="true" size={17} />Filtry</a>
            </div>

            <details id="filtry-kategorie" className="rounded-lg border border-border bg-surface px-3 py-2">
              <summary className="touch-target flex cursor-pointer items-center text-sm font-extrabold text-foreground">Kategorie pomocy{category ? " - wybrano" : ""}</summary>
              <div className="flex flex-wrap gap-2 pb-2 pt-1">
                {categories.map(([slug, label]) => (
                  <Link key={slug} href={searchHref(current, "kategoria", slug)} className={["filter-chip", category === slug ? "filter-chip-strong bg-brand-soft" : ""].join(" ")} aria-current={category === slug ? "true" : undefined}>{label}</Link>
                ))}
              </div>
            </details>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-lg font-extrabold text-foreground">{places.length} miejsc</p>
                <span className="text-sm font-bold text-muted-foreground" aria-hidden="true">|</span>
                <label className="flex min-w-0 items-center gap-1 text-sm font-bold text-muted-foreground"><span className="sr-only">Sortuj</span><SearchSortSelect value={sort} queryString={current.toString()} /></label>
                <p className="min-w-0 basis-full text-xs font-semibold text-muted-foreground sm:basis-auto sm:text-sm">{query ? `Wyniki dla: ${query}` : category ? `Kategoria: ${categories.find(([slug]) => slug === category)?.[1] ?? category}` : "Wszystkie miejsca"}</p>
              </div>

              <div aria-label="Widok wyników" className="grid w-full min-w-0 max-w-full grid-cols-2 rounded-lg border border-border bg-surface p-0.5 sm:w-auto">
                <span className="compact-toggle-item inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-extrabold text-foreground"><List aria-hidden="true" size={17} />Lista</span>
                <Link className="compact-toggle-item inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-extrabold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground" href={current.toString() ? `/mapa?${current.toString()}` : "/mapa"}><MapIcon aria-hidden="true" size={17} />Mapa</Link>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:gap-4">
            {places.map((place) => <PlaceCard key={place.id} place={place} />)}
            {places.length === 0 ? <NoResults /> : null}
          </div>
        </section>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted p-6 text-center">
              <MapIcon aria-hidden="true" size={34} className="mb-4 text-brand-strong" />
              <h2 className="text-xl font-extrabold text-foreground">Zobacz wyniki na mapie</h2>
              <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-muted-foreground">Porównaj lokalizacje i wybierz miejsce, do którego najłatwiej dotrzeć.</p>
              <Link className="touch-target mt-5 inline-flex items-center justify-center rounded-lg border border-brand bg-surface px-4 py-2 text-sm font-extrabold text-foreground transition hover:bg-brand-soft" href={current.toString() ? `/mapa?${current.toString()}` : "/mapa"}>Przejdź do mapy</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
