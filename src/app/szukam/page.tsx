import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BedDouble, BookOpen, CircleHelp, Clock3, Droplets, HandHeart, HeartPulse, LocateFixed, Scale, Shirt, SlidersHorizontal, Utensils } from "lucide-react";
import { CategoryTile } from "@/components/home/category-tile";
import { getCategoryAccentMap } from "@/lib/home/category-accent";
import { getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";
import { UncertainSupportFlow } from "@/components/search/uncertain-support-flow-v2";
import { SearchControl } from "@/components/search/search-control";

export const metadata: Metadata = {
  title: "Szukam wsparcia | Dobra Mapa",
  description: "Znajdź pomoc dla siebie.",
  alternates: canonicalAlternates("/szukam"),
};

export const dynamic = "force-dynamic";

const featuredCategories = [
  ["Jedzenie", "jedzenie", Utensils],
  ["Nocleg", "nocleg", BedDouble],
  ["Higiena", "higiena", Droplets],
  ["Zdrowie", "pomoc-medyczna", HeartPulse],
  ["Odzież", "odziez", Shirt],
  ["Porada", "pomoc-prawna", Scale],
  ["Wsparcie", "pomoc-socjalna", HandHeart],
] as const;

type SupportSearchEntryProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SupportSearchEntry({ searchParams }: SupportSearchEntryProps) {
  const params = await searchParams;
  const mode = Array.isArray(params.tryb) ? params.tryb[0] : params.tryb;
  if (mode === "guided") return <UncertainSupportFlow />;

  const places = await getPublicSearchPlaces();
  const categories = Array.from(
    new Map(
      places.flatMap((place) => place.categorySlugs.map((slug, index) => [slug, place.helpTypes[index] ?? slug] as const)),
    ).entries(),
  ).sort((left, right) => left[1].localeCompare(right[1], "pl"));
  const accents = getCategoryAccentMap(categories.map(([slug]) => slug));

  return (
    <div className="support-search-page journey-search mobile-nav-safe-content mx-auto w-full max-w-[1120px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-20">
      <header className="support-search-hero max-w-3xl">
        <div className="support-search-route-label" aria-hidden="true">
          <span>SZUKAM POMOCY</span>
          <i />
        </div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">Czego potrzebujesz?</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Napisz po swojemu, czego potrzebujesz, albo wybierz jedną z prostych kategorii poniżej.</p>
      </header>

      <section className="support-search-section mt-7 max-w-3xl sm:mt-9" aria-labelledby="support-search-title">
        <div className="support-search-section-heading">
          <p>WPISZ POTRZEBĘ</p>
          <h2 id="support-search-title">Znajdź konkretne miejsce</h2>
        </div>
        <SearchControl
          action="/szukaj"
          id="support-search"
          label="Wyszukiwarka pomocy"
          placeholder="np. ciepły posiłek, prysznic, pomoc prawna…"
          variant="landing"
          categories={categories.map(([slug, label]) => ({ slug, label }))}
          places={places.map(({ id, name, categorySlug, slug, searchText }) => ({ id, name, categorySlug, slug, searchText }))}
          trailing={<Link href="/szukaj#filtry-kategorie" className="search-control-filter" aria-label="Otwórz filtry"><SlidersHorizontal aria-hidden="true" size={21} /></Link>}
        />
      </section>

      <section className="support-search-categories" aria-labelledby="support-needs-title">
        <div className="support-search-section-heading">
          <p>WYBIERZ DROGĘ</p>
          <h2 id="support-needs-title">Wybierz kategorię</h2>
        </div>
        <div className="support-category-grid">
          {featuredCategories.map(([label, slug, Icon]) => (
            <CategoryTile key={slug} href={slug === "nocleg" ? "/znajdz-nocleg" : `/szukaj?kategoria=${encodeURIComponent(slug)}`} label={label} slug={slug} icon={Icon} accent={accents.get(slug) ?? "#0B4F48"} />
          ))}
          <CategoryTile href="/szukaj" label="Więcej" slug="wiecej" icon={CircleHelp} accent="#0B4F48" />
        </div>
        <Link href="/szukam?tryb=guided&krok=1" className="support-uncertain-entry">
          <span className="support-uncertain-copy">
            <strong>Nie wiem, czego potrzebuję</strong>
            <small>Odpowiedz na dwa proste pytania — podpowiemy, od czego zacząć.</small>
          </span>
          <ArrowRight className="support-uncertain-arrow" aria-hidden="true" size={22} />
        </Link>
      </section>

      <section className="support-search-shortcuts" aria-labelledby="support-shortcuts-title">
        <div className="support-search-section-heading support-search-section-heading-compact">
          <p>NA SKRÓTY</p>
          <h2 id="support-shortcuts-title">Szybkie ścieżki</h2>
        </div>
        <div className="support-quick-paths">
          <Link className="inline-action support-quick-now" href="/mapa?otwarte=1"><LocateFixed aria-hidden="true" size={18} />Pomoc dostępna teraz<ArrowRight aria-hidden="true" size={18} /></Link>
          <Link className="inline-action" href="/znajdz-nocleg"><Clock3 aria-hidden="true" size={18} />Nocleg na dzisiaj<ArrowRight aria-hidden="true" size={18} /></Link>
          <Link className="inline-action" href="/szukaj"><BookOpen aria-hidden="true" size={18} />Wszystkie miejsca<ArrowRight aria-hidden="true" size={18} /></Link>
        </div>
      </section>
    </div>
  );
}
