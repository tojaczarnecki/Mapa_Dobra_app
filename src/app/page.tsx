import type { Metadata } from "next";
import {
  BedDouble,
  Brain,
  CircleHelp,
  Droplets,
  HeartPulse,
  Search,
  Scale,
  Shirt,
  ShowerHead,
  Utensils,
} from "lucide-react";
import { CategoryTile } from "@/components/home/category-tile";
import { PrimaryActionCard } from "@/components/home/primary-action-card";
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

  return (
    <div className="home-page mx-auto w-full max-w-[1240px] px-5 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-14">
      <header className="home-intro">
        <p className="home-motto">Wszędzie tam, gdzie dzieje się dobro!</p>
        <h1 className="home-title">Co chcesz zrobić?</h1>
      </header>

      <section className="home-primary-actions" aria-label="Główne ścieżki">
        <PrimaryActionCard
          href="/szukaj"
          title="Potrzebuję pomocy"
          description="Znajdź miejsce, usługę lub wsparcie."
          variant="help"
        />
        <PrimaryActionCard
          href="/uruchom-pomoc"
          title="Uruchamiam pomoc"
          description="Martwisz się o kogoś? Pomóż uruchomić wsparcie."
          variant="activate"
        />
      </section>

      <section className="home-search-section" aria-labelledby="home-search-title">
        <h2 id="home-search-title" className="sr-only">Znajdź pomoc</h2>
        <form action="/mapa" method="get" className="home-search-form" aria-label="Wyszukiwarka pomocy">
          <input type="hidden" name="lokalizacja" value="moja" />
          <label htmlFor="home-search" className="sr-only">Czego potrzebujesz?</label>
          <div className="home-search-field">
            <Search aria-hidden="true" className="shrink-0" size={23} strokeWidth={2.1} />
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="Czego potrzebujesz?"
              autoComplete="off"
            />
          </div>
        </form>
      </section>

      <section id="kategorie" className="home-category-section" aria-labelledby="home-category-title">
        <div className="home-section-heading">
          <h2 id="home-category-title">Kategorie pomocy</h2>
          <p>Wybierz kierunek, żeby szybciej znaleźć właściwe miejsce.</p>
        </div>
        <div className="home-category-grid">
          {categories.map((category) => (
            <CategoryTile
              key={category.slug}
              href={`/szukaj?kategoria=${category.slug}`}
              label={category.label}
              icon={category.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
