import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Siren } from "lucide-react";
import { HelpGuideCard } from "@/components/help-guides/help-guide-card";
import { PublicActionLink } from "@/components/places/public-action-link";
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
    <div className="journey-guide mobile-nav-safe-content guide-hub-page mx-auto w-full max-w-[1120px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <header className="guide-hub-hero">
        <div className="guide-hub-hero-copy"><p className="guide-article-eyebrow">JAK POMAGAĆ</p><h1>Pomagaj spokojnie, konkretnie i z szacunkiem.</h1><p>Krótko i konkretnie: wybierz sytuację, która jest Ci najbliższa.</p></div>
        <div className="guide-hub-hero-art"><Image src="/brand/journeys/journey-guide.png" alt="Dwie osoby szukają wspólnego rozwiązania" width={640} height={480} priority sizes="(max-width: 767px) 80vw, 420px" /></div>
      </header>

      <section className="guide-scenarios-section" aria-labelledby="how-to-help-guides-title"><p className="guide-hub-section-eyebrow">NAJWAŻNIEJSZE SYTUACJE</p><h2 id="how-to-help-guides-title">Od czego zacząć?</h2><div className="guide-scenario-module">{guides.slice(1, 4).map((guide) => <Link key={guide.slug} href={`/jak-pomagac/${guide.slug}`} className="guide-scenario-item"><span className="guide-scenario-copy"><span className="guide-article-eyebrow">{guide.shortTitle ?? "SYTUACJA"}</span><strong>{guide.title}</strong><span>{guide.intro}</span></span><span className="guide-scenario-action">Czytaj <ArrowRight aria-hidden="true" size={17} /></span></Link>)}</div></section>
      {guides[0] ? <section className="guide-feature-section" aria-labelledby="guide-feature-title"><div className="guide-feature-heading"><div><p className="guide-hub-section-eyebrow">ZACZNIJ TUTAJ</p><h2 id="guide-feature-title">Najważniejsza rozmowa</h2></div></div><div className="guide-feature-card mobile-feature-card"><HelpGuideCard guide={guides[0]} layout="feature" variant="guide" /></div></section> : null}
      {guides.length > 4 ? <section className="guide-library-section" aria-labelledby="guide-library-title"><p className="guide-hub-section-eyebrow">WIĘCEJ WSKAZÓWEK</p><h2 id="guide-library-title">Pomoc krok po kroku</h2><div className="editorial-guide-grid">{guides.slice(4).map((guide, index) => <HelpGuideCard key={guide.slug} guide={guide} layout={index === guides.length - 5 ? "wide" : "standard"} variant={( ["help", "search", "now"] as const)[index % 3]} />)}</div></section> : null}
      <section className="guide-emergency-hub" aria-labelledby="guide-emergency-hub-title"><Siren aria-hidden="true" size={21} /><div><p className="guide-hub-section-eyebrow">SYTUACJA PILNA</p><h2 id="guide-emergency-hub-title">Sytuacja zagraża życiu lub zdrowiu?</h2><p>Jeśli istnieje bezpośrednie zagrożenie, zadzwoń pod 112.</p></div><PublicActionLink href="tel:112" variant="primary" journey="emergency" system chevron>Zadzwoń 112</PublicActionLink></section>
      <section className="guide-hub-next" aria-labelledby="how-to-help-next-title"><h2 id="how-to-help-next-title">Co możesz zrobić teraz?</h2><p>Jeśli sytuacja dzieje się teraz, Dobra Mapa może pomóc Ci wybrać następny krok.</p><div><PublicActionLink href="/pomagam" variant="primary" journey="help" system chevron>Chcę komuś pomóc</PublicActionLink><PublicActionLink href="/szukam" variant="secondary" journey="search" system chevron>Szukam wsparcia</PublicActionLink></div></section>
    </div>
  );
}
