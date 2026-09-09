import type { Metadata } from "next";
import { PublicActionLink } from "@/components/places/public-action-link";
import { NeedsExplorer } from "@/components/needs/needs-explorer";
import { getPublicNeeds } from "@/lib/needs/queries";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Aktualne potrzeby | Dobra Mapa", description: "Zobacz, gdzie organizacje w Łodzi potrzebują pomocy.", alternates: canonicalAlternates("/potrzeby") };
export const dynamic = "force-dynamic";

export default async function NeedsPage() {
  const needs = await getPublicNeeds();
  return <div className="needs-page mx-auto w-full max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10 lg:px-8">
    <header className="needs-page-hero"><p className="needs-eyebrow">Pomóż blisko siebie</p><h1>Aktualne potrzeby</h1><p>Wybierz konkretną rzecz, czas i miejsce, w którym możesz pomóc.</p></header>
    <section className="needs-page-list" aria-live="polite">{needs.length ? <NeedsExplorer needs={needs.map((need) => ({ ...need, startsAt: need.startsAt.toISOString(), endsAt: need.endsAt.toISOString() }))} /> : <div className="needs-empty"><h2>Na ten moment nie ma aktywnych potrzeb.</h2><p>Sprawdź ponownie później albo zobacz inne sposoby pomagania.</p><PublicActionLink href="/jak-pomagac" variant="secondary" journey="guide" system chevron>Jak pomagać</PublicActionLink></div>}</section>
  </div>;
}
