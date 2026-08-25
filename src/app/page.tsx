import type { Metadata } from "next";
import Link from "next/link";
import {
  BedDouble,
  Brain,
  CircleHelp,
  Droplets,
  HeartPulse,
  Scale,
  Shirt,
  ShowerHead,
  Utensils,
} from "lucide-react";
import { CategoryTile } from "@/components/home/category-tile";
import { HomeSearchAutocomplete } from "@/components/home/home-search-autocomplete";
import { PrimaryActionCard } from "@/components/home/primary-action-card";
import { KnowledgeCardView } from "@/components/knowledge/knowledge-card";
import { getCategoryAccentMap } from "@/lib/home/category-accent";
import { getPublicKnowledgeArticles } from "@/lib/knowledge";
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
  const knowledgeArticles = await getPublicKnowledgeArticles();
  const featuredKnowledge = knowledgeArticles.filter((article) => article.featured);
  const homeKnowledge = (featuredKnowledge.length ? featuredKnowledge : knowledgeArticles).slice(0, 3);
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
    <div className="home-page mx-auto w-full max-w-[1240px] px-5 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-14">
      <header className="home-intro">
        <h1 className="home-motto">Wszędzie tam, gdzie dzieje się dobro!</h1>
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
        <HomeSearchAutocomplete
          categories={categories.map(({ label, slug }) => ({ label, slug }))}
          places={searchPlaces}
        />
      </section>

      <section id="kategorie" className="home-category-section" aria-labelledby="home-category-title">
        <div className="home-section-heading">
          <h2 id="home-category-title">Kategorie pomocy</h2>
        </div>
        <div className="home-category-grid">
          {categories.map((category) => (
            <CategoryTile
              key={category.slug}
              href={`/szukaj?kategoria=${category.slug}`}
              label={category.label}
              icon={category.icon}
              accent={categoryAccents.get(category.slug) ?? "#475569"}
            />
          ))}
        </div>
      </section>

      {homeKnowledge.length ? (
        <section className="home-knowledge-section" aria-labelledby="home-knowledge-title">
          <div className="home-knowledge-heading">
            <div>
              <p className="home-knowledge-eyebrow">WARTO WIEDZIEĆ</p>
              <h2 id="home-knowledge-title">Encyklopedia Dobra</h2>
              <p>Praktyczne wskazówki, jak uzyskać pomoc i jak mądrze pomagać.</p>
            </div>
          </div>
          <div className="home-knowledge-preview">
            {homeKnowledge.slice(0, 3).map((article) => <KnowledgeCardView key={article.id} article={article} variant="compact" />)}
          </div>
          <Link className="home-knowledge-all" href="/encyklopedia">Zobacz całą Encyklopedię Dobra <span aria-hidden="true">→</span></Link>
        </section>
      ) : null}
    </div>
  );
}
