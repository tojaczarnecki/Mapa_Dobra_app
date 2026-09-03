import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { HelpGuideCard } from "@/components/help-guides/help-guide-card";
import { getPublicHelpGuides } from "@/data/help-guides";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Jak pomagać | Dobra Mapa",
  description: "Proste wskazówki, jak reagować i pomagać w różnych sytuacjach.",
  alternates: canonicalAlternates("/jak-pomagac"),
};

export default function HowToHelpPage() {
  const guides = getPublicHelpGuides();
  return (
    <div className="journey-guide mobile-nav-safe-content mx-auto w-full max-w-[1120px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <header className="guide-hub-hero">
        <div className="guide-hub-hero-copy">
          <BookOpen aria-hidden="true" className="text-brand-strong" size={28} />
          <p className="guide-article-eyebrow">JAK POMAGAĆ</p>
          <h1>Pomagaj spokojnie, konkretnie i z szacunkiem.</h1>
          <p>Krótko i konkretnie: wybierz sytuację, która jest Ci najbliższa.</p>
        </div>
        <div className="guide-hub-hero-art"><Image src="/brand/journeys/journey-guide.png" alt="Dwie osoby szukają wspólnego rozwiązania" width={640} height={480} priority sizes="(max-width: 767px) 80vw, 420px" /></div>
      </header>

      <section className="mt-9" aria-labelledby="how-to-help-guides-title">
        <h2 id="how-to-help-guides-title" className="text-2xl font-extrabold">Czego chcesz się dowiedzieć?</h2>
        <div className="editorial-guide-grid mt-5">{guides.map((guide, index) => <HelpGuideCard key={guide.slug} guide={guide} layout={index === 0 ? "feature" : index === 3 ? "wide" : "standard"} variant={(["guide", "help", "search", "now"] as const)[index % 4]} />)}</div>
      </section>

      <section className="mt-10 border-t border-border pt-7" aria-labelledby="how-to-help-next-title">
        <h2 id="how-to-help-next-title" className="text-xl font-extrabold">Potrzebujesz pomóc komuś teraz?</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">Jeśli sytuacja dzieje się teraz, Dobra Mapa może pomóc Ci wybrać następny krok.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="touch-target inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-bold text-foreground" href="/pomagam">Chcę komuś pomóc <ArrowRight aria-hidden="true" size={17} /></Link>
          <Link className="touch-target inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 font-bold" href="/szukam">Szukam wsparcia <ArrowRight aria-hidden="true" size={17} /></Link>
        </div>
      </section>
    </div>
  );
}
