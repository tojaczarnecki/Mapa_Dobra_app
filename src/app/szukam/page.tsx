import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, BookOpen, Brain, CircleHelp, Clock3, Droplets, HandHeart, HeartPulse, LocateFixed, Scale, Search, Shirt, Utensils } from "lucide-react";
import { CategoryTile } from "@/components/home/category-tile";
import { getCategoryAccentMap } from "@/lib/home/category-accent";
import { getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Szukam wsparcia | Mapa Dobra",
  description: "Znajdź pomoc dla siebie.",
  alternates: canonicalAlternates("/szukam"),
};

export const dynamic = "force-dynamic";

const categoryIconMap = {
  jedzenie: Utensils,
  nocleg: BedDouble,
  prysznic: Droplets,
  higiena: Droplets,
  odziez: Shirt,
  "pomoc-medyczna": HeartPulse,
  "pomoc-psychologiczna": Brain,
  "pomoc-prawna": Scale,
  "pomoc-socjalna": HandHeart,
} as const;

export default async function SupportSearchEntry() {
  const places = await getPublicSearchPlaces();
  const categories = Array.from(
    new Map(
      places.flatMap((place) => place.categorySlugs.map((slug, index) => [slug, place.helpTypes[index] ?? slug] as const)),
    ).entries(),
  ).sort((left, right) => left[1].localeCompare(right[1], "pl"));
  const accents = getCategoryAccentMap(categories.map(([slug]) => slug));

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-20">
      <header className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">Szukam wsparcia</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">Znajdź pomoc dla siebie.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Opisz krótko, czego potrzebujesz, albo wybierz najbliższą kategorię.</p>
      </header>

      <section className="mt-7 max-w-3xl rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:mt-9 sm:p-6" aria-labelledby="support-search-title">
        <h2 id="support-search-title" className="sr-only">Wyszukaj pomoc</h2>
        <form action="/szukaj" method="get" aria-label="Wyszukiwarka pomocy">
          <label htmlFor="support-search" className="block text-sm font-bold text-foreground">Czego potrzebujesz?</label>
          <div className="relative mt-2">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={22} />
            <input id="support-search" name="q" type="search" autoComplete="off" placeholder="np. ciepły posiłek dzisiaj" className="min-h-14 w-full rounded-lg border border-border bg-white py-3 pl-12 pr-4 text-base text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-brand-strong focus:ring-4 focus:ring-brand-strong/20" />
          </div>
          <button type="submit" className="touch-target mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-extrabold text-foreground transition hover:bg-brand-strong hover:text-white">Szukaj pomocy</button>
        </form>
      </section>

      <section className="mt-9" aria-labelledby="support-needs-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="support-needs-title" className="text-2xl font-extrabold text-foreground">Czego potrzebujesz?</h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">Wybierz prostą drogę do wyników.</p>
          </div>
          <details className="relative">
            <summary className="inline-action cursor-pointer list-none"><CircleHelp aria-hidden="true" size={17} /> Nie wiem, czego potrzebuję</summary>
            <div className="absolute right-0 z-10 mt-2 grid min-w-64 gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg" aria-label="Wybierz główny kierunek pomocy">
              <Link className="touch-target rounded-md px-3 py-2 text-sm font-bold hover:bg-surface-muted" href="/szukaj?kategoria=jedzenie">Potrzebuję czegoś do jedzenia</Link>
              <Link className="touch-target rounded-md px-3 py-2 text-sm font-bold hover:bg-surface-muted" href="/znajdz-nocleg">Nie mam gdzie spać</Link>
              <Link className="touch-target rounded-md px-3 py-2 text-sm font-bold hover:bg-surface-muted" href="/szukaj?kategoria=higiena">Potrzebuję się umyć / zadbać o higienę</Link>
              <Link className="touch-target rounded-md px-3 py-2 text-sm font-bold hover:bg-surface-muted" href="/szukaj?kategoria=pomoc-medyczna">Potrzebuję pomocy zdrowotnej</Link>
              <Link className="touch-target rounded-md px-3 py-2 text-sm font-bold hover:bg-surface-muted" href="/szukaj?kategoria=pomoc-prawna">Potrzebuję porady / wsparcia</Link>
              <Link className="touch-target rounded-md px-3 py-2 text-sm font-bold hover:bg-surface-muted" href="/szukam">Nadal nie wiem</Link>
            </div>
          </details>
        </div>
        <div className="home-category-grid mt-4">
          {categories.map(([slug, label]) => {
            const Icon = categoryIconMap[slug as keyof typeof categoryIconMap] ?? CircleHelp;
            return <CategoryTile key={slug} href={slug === "nocleg" ? "/znajdz-nocleg" : `/szukaj?kategoria=${encodeURIComponent(slug)}`} label={label} icon={Icon} accent={accents.get(slug) ?? "#475569"} />;
          })}
        </div>
      </section>

      <section className="mt-9 border-t border-border pt-7" aria-labelledby="support-shortcuts-title">
        <h2 id="support-shortcuts-title" className="text-xl font-extrabold text-foreground">Szybkie ścieżki</h2>
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <Link className="inline-action" href="/mapa?otwarte=1"><LocateFixed aria-hidden="true" size={17} />Pomoc dostępna teraz</Link>
          <Link className="inline-action" href="/znajdz-nocleg"><Clock3 aria-hidden="true" size={17} />Nocleg na dzisiaj</Link>
          <Link className="inline-action" href="/szukaj"><BookOpen aria-hidden="true" size={17} />Wszystkie miejsca</Link>
        </div>
      </section>
    </div>
  );
}
