import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { HelpGuideCard } from "@/components/help-guides/help-guide-card";
import { getPublicHelpGuides } from "@/data/help-guides";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Jak pomagać | Mapa Dobra",
  description: "Proste wskazówki, jak reagować i pomagać w różnych sytuacjach.",
  alternates: canonicalAlternates("/jak-pomagac"),
};

export default function HowToHelpPage() {
  const guides = getPublicHelpGuides();
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <header className="max-w-3xl">
        <BookOpen aria-hidden="true" className="text-brand-strong" size={32} />
        <p className="mt-4 text-sm font-bold uppercase tracking-wide text-brand-strong">JAK POMAGAĆ</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Pomagaj spokojnie, konkretnie i z szacunkiem.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Krótkie wskazówki na sytuacje, w których chcesz pomóc, ale nie zawsze wiesz, co będzie najlepszym krokiem.
        </p>
      </header>

      <section className="mt-9" aria-labelledby="how-to-help-guides-title">
        <h2 id="how-to-help-guides-title" className="text-2xl font-extrabold">Czego chcesz się dowiedzieć?</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">{guides.map((guide) => <HelpGuideCard key={guide.slug} guide={guide} />)}</div>
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
