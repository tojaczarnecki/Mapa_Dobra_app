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
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">Szukam wsparcia</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">Czego potrzebujesz?</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Opisz krótko, czego potrzebujesz, albo wybierz najbliższą kategorię.</p>
      </header>

      <section className="support-search-section mt-7 max-w-3xl sm:mt-9" aria-labelledby="support-search-title">
        <h2 id="support-search-title" className="sr-only">Wyszukaj pomoc</h2>
        <SearchControl
          action="/szukaj"
          id="support-search"
          label="Wyszukiwarka pomocy"
          placeholder="Znajdź pomoc…"
          variant="landing"
          trailing={<Link href="/szukaj#filtry-kategorie" className="search-control-filter" aria-label="Otwórz filtry"><SlidersHorizontal aria-hidden="true" size={21} /></Link>}
        />
      </section>

      <section className="mt-9" aria-labelledby="support-needs-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="support-needs-title" className="text-2xl font-extrabold text-foreground">Wybierz kategorię</h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">Wybierz prostą drogę do wyników.</p>
          </div>
        </div>
        <div className="support-category-grid mt-4">
          {featuredCategories.map(([label, slug, Icon]) => (
            <CategoryTile key={slug} href={slug === "nocleg" ? "/znajdz-nocleg" : `/szukaj?kategoria=${encodeURIComponent(slug)}`} label={label} icon={Icon} accent={accents.get(slug) ?? "#0B4F48"} />
          ))}
          <CategoryTile href="/szukaj" label="Więcej" icon={CircleHelp} accent="#0B4F48" />
        </div>
        <Link href="/szukam?tryb=guided" className="support-uncertain-entry">
          <span className="support-uncertain-icon" aria-hidden="true"><CircleHelp size={20} /></span>
          <span className="support-uncertain-copy">
            <strong>Nie wiem, czego potrzebuję</strong>
            <small>Pomóż mi wybrać właściwą pomoc.</small>
          </span>
          <ArrowRight className="support-uncertain-arrow" aria-hidden="true" size={20} />
        </Link>
      </section>

      <section className="mt-9 border-t border-border pt-7" aria-labelledby="support-shortcuts-title">
        <h2 id="support-shortcuts-title" className="text-xl font-extrabold text-foreground">Szybkie ścieżki</h2>
        <div className="support-quick-paths mt-3 flex min-w-0 flex-wrap gap-2">
          <Link className="inline-action" href="/mapa?otwarte=1"><LocateFixed aria-hidden="true" size={17} />Pomoc dostępna teraz</Link>
          <Link className="inline-action" href="/znajdz-nocleg"><Clock3 aria-hidden="true" size={17} />Nocleg na dzisiaj</Link>
          <Link className="inline-action" href="/szukaj"><BookOpen aria-hidden="true" size={17} />Wszystkie miejsca</Link>
        </div>
      </section>
    </div>
  );
}
