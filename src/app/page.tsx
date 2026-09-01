import type { Metadata } from "next";
import Link from "next/link";
import {
  BedDouble,
  Brain,
  CircleHelp,
  Clock3,
  Droplets,
  HeartPulse,
  HandHeart,
  LocateFixed,
  Scale,
  Shirt,
  ShowerHead,
  Utensils,
} from "lucide-react";
import { CategoryTile } from "@/components/home/category-tile";
import { HomeSearchAutocomplete } from "@/components/home/home-search-autocomplete";
import { PrimaryActionCard } from "@/components/home/primary-action-card";
import { getCategoryAccentMap } from "@/lib/home/category-accent";
import { getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Mapa Dobra",
  description: "Znajdź pomoc albo uruchom wsparcie dla kogoś, o kogo się martwisz.",
  alternates: canonicalAlternates("/"),
};

export const dynamic = "force-dynamic";

const categoryIconMap = {
  jedzenie: Utensils,
  nocleg: BedDouble,
  prysznic: ShowerHead,
  odziez: Shirt,
  "pomoc-medyczna": HeartPulse,
  "pomoc-psychologiczna": Brain,
  "pomoc-prawna": Scale,
  "pomoc-socjalna": HandHeart,
  higiena: Droplets,
} as const;

export default async function Home() {
  const publicPlaces = await getPublicSearchPlaces();
  const categories = Array.from(
    new Map(
      publicPlaces.flatMap((place) =>
        place.categorySlugs.map((slug, index) => [slug, place.helpTypes[index] ?? slug] as const),
      ),
    ).entries(),
  )
    .map(([slug, label]) => ({
      label,
      slug,
      icon: categoryIconMap[slug as keyof typeof categoryIconMap] ?? CircleHelp,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "pl"));
  const categoryAccents = getCategoryAccentMap(categories.map(({ slug }) => slug));
  const searchPlaces = publicPlaces.map(({ id, name, categorySlug, slug, categorySlugs, searchText, status, openNow, todayHours, free, referralRequired, documentRequired, distanceKm }) => ({
    id,
    name,
    categorySlug,
    slug,
    categorySlugs,
    searchText,
    status,
    openNow,
    todayHours,
    free,
    referralRequired,
    documentRequired,
    distanceKm,
  }));

  return (
    <div className="home-page mx-auto w-full max-w-[1240px] px-5 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-14">
      <header className="home-intro">
        <h1 className="home-motto">Wszędzie tam, gdzie dzieje się dobro!</h1>
      </header>

      <section className="home-primary-actions" aria-label="Główne ścieżki">
        <PrimaryActionCard
          href="/szukam"
          title="Szukam wsparcia"
          description="Znajdź miejsce, usługę lub wsparcie."
          variant="help"
        />
        <PrimaryActionCard
          href="/pomagam"
          title="Chcę komuś pomóc"
          description="Martwisz się o kogoś? Pomóż uruchomić wsparcie."
          variant="activate"
        />
        <PrimaryActionCard
          href="/jak-pomagac"
          title="Chcę wiedzieć, jak pomagać"
          description="Sprawdź proste wskazówki na różne sytuacje."
          variant="guide"
        />
      </section>

      <section className="home-search-section" aria-labelledby="home-search-title">
        <h2 id="home-search-title" className="sr-only">Znajdź pomoc</h2>
        <HomeSearchAutocomplete
          categories={categories.map(({ label, slug }) => ({ label, slug }))}
          places={searchPlaces}
        />
        <div className="home-now-shortcuts" aria-label="Szybkie wyszukiwanie">
          <Link href="/mapa?otwarte=1&lokalizacja=moja">
            <LocateFixed aria-hidden="true" size={17} />
            Pomoc dostępna teraz
          </Link>
          <Link href="/znajdz-nocleg">
            <Clock3 aria-hidden="true" size={17} />
            Nocleg na dzisiaj
          </Link>
        </div>
      </section>

      <section id="kategorie" className="home-category-section" aria-labelledby="home-category-title">
        <div className="home-section-heading">
          <h2 id="home-category-title">Kategorie pomocy</h2>
        </div>
        <div className="home-category-grid">
          {categories.map((category) => (
            <CategoryTile
              key={category.slug}
              href={category.slug === "nocleg" ? "/znajdz-nocleg" : `/szukaj?kategoria=${category.slug}`}
              label={category.label}
              icon={category.icon}
              accent={categoryAccents.get(category.slug) ?? "#475569"}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
