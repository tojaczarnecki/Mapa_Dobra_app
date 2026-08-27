import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Brain,
  CircleHelp,
  Droplets,
  HeartHandshake,
  HeartPulse,
  LocateFixed,
  Scale,
  Shirt,
  ShowerHead,
  Utensils,
} from "lucide-react";
import { CategoryTile } from "@/components/home/category-tile";
import { HomeSearchAutocomplete } from "@/components/home/home-search-autocomplete";
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

const categoryOrder = [
  "jedzenie",
  "nocleg",
  "higiena",
  "prysznic",
  "pomoc-medyczna",
  "pomoc-prawna",
  "odziez",
  "pomoc-psychologiczna",
] as const;

function categoryRank(slug: string) {
  const index = categoryOrder.indexOf(slug as (typeof categoryOrder)[number]);
  return index === -1 ? 999 : index;
}

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
    .sort((left, right) => {
      const rank = categoryRank(left.slug) - categoryRank(right.slug);
      return rank !== 0 ? rank : left.label.localeCompare(right.label, "pl");
    })
    .slice(0, 9);

  const searchPlaces = publicPlaces.map(({ id, name, categorySlug, slug, categorySlugs, searchText, status, openNow, free, referralRequired, documentRequired, distanceKm }) => ({
    id,
    name,
    categorySlug,
    slug,
    categorySlugs,
    searchText,
    status,
    openNow,
    free,
    referralRequired,
    documentRequired,
    distanceKm,
  }));

  return (
    <div className="md-home">
      <h1 className="md-home-heading">Czego potrzebujesz?</h1>

      <section className="md-home-search" aria-label="Wyszukaj pomoc">
        <HomeSearchAutocomplete
          categories={categories.map(({ label, slug }) => ({ label, slug }))}
          places={searchPlaces}
        />
      </section>

      <section aria-label="Kategorie pomocy">
        <div className="md-category-grid">
          {categories.map((category) => (
            <CategoryTile
              key={category.slug}
              href={category.slug === "nocleg" ? "/znajdz-nocleg" : `/szukaj?kategoria=${category.slug}`}
              label={category.label}
              icon={category.icon}
            />
          ))}
        </div>
      </section>

      <Link className="md-location-row" href="/mapa?lokalizacja=moja">
        <span><LocateFixed aria-hidden="true" size={18} />Użyj mojej lokalizacji</span>
        <ArrowRight aria-hidden="true" size={17} />
      </Link>

      <Link className="md-primary-cta" href="/szukaj">
        Znajdź pomoc
      </Link>

      <Link className="md-help-cta" href="/uruchom-pomoc">
        <HeartHandshake aria-hidden="true" size={18} />
        Uruchom pomoc dla kogoś
      </Link>
    </div>
  );
}
