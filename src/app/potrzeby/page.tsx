import type { Metadata } from "next";
import { NeedsExplorer } from "@/components/needs/needs-explorer";
import { getPublicNeeds } from "@/lib/needs/queries";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Aktualne potrzeby | Dobra Mapa", description: "Zobacz, gdzie organizacje w Łodzi potrzebują pomocy.", alternates: canonicalAlternates("/potrzeby") };
export const dynamic = "force-dynamic";

export default async function NeedsPage() {
  const needs = await getPublicNeeds();
  return <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10 lg:px-8">
    <header className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-wide text-brand-strong sm:text-sm">Aktualne potrzeby</p><h1 className="mt-2 text-[2.125rem] font-extrabold leading-tight sm:text-5xl">Dzisiaj możesz być komuś potrzebny.</h1><p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-4 sm:text-lg sm:leading-7">Zobacz, gdzie organizacje w Łodzi potrzebują pomocy. Bez CV, bez rekrutacji — wybierz coś, w czym możesz realnie pomóc.</p></header>
    <section className="mt-10 max-w-3xl" aria-live="polite">{needs.length ? <NeedsExplorer needs={needs.map((need) => ({ ...need, startsAt: need.startsAt.toISOString(), endsAt: need.endsAt.toISOString() }))} /> : <p className="border-t border-border pt-6 text-muted-foreground">W tej chwili nie ma opublikowanych potrzeb.</p>}</section>
  </div>;
}
