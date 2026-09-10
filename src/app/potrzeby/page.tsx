import type { Metadata } from "next";
import Image from "next/image";
import { PublicActionLink } from "@/components/places/public-action-link";
import { NeedsExplorer } from "@/components/needs/needs-explorer";
import { getPublicNeeds } from "@/lib/needs/queries";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Aktualne potrzeby | Dobra Mapa",
  description: "Zobacz, gdzie organizacje w Łodzi potrzebują pomocy.",
  alternates: canonicalAlternates("/potrzeby"),
};
export const dynamic = "force-dynamic";

export default async function NeedsPage() {
  const needs = await getPublicNeeds();
  const publicNeeds = needs.map((need) => ({
    ...need,
    startsAt: need.startsAt.toISOString(),
    endsAt: need.endsAt.toISOString(),
    place: need.place
      ? {
          ...need.place,
          latitude: need.place.latitude === null ? null : Number(need.place.latitude),
          longitude: need.place.longitude === null ? null : Number(need.place.longitude),
        }
      : null,
  }));

  return (
    <div className="needs-page mx-auto w-full max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <header className="needs-page-hero">
        <p className="needs-eyebrow">POMÓŻ BLISKO SIEBIE</p>
        <h1>Aktualne potrzeby</h1>
        <p>Wybierz konkretną rzecz, czas i miejsce, w którym możesz pomóc.</p>
      </header>
      <section className="needs-page-list" aria-live="polite">
        {publicNeeds.length ? (
          <NeedsExplorer needs={publicNeeds} />
        ) : (
          <div className="needs-empty needs-empty-editorial">
            <div className="needs-empty-copy">
              <p className="needs-empty-eyebrow">DZISIAJ W ŁODZI</p>
              <h2>Nie ma teraz nowych ogłoszeń organizacji.</h2>
              <p>Gdy organizacja będzie potrzebowała konkretnych osób, rzeczy albo wsparcia w określonym terminie, ogłoszenie pojawi się właśnie tutaj.</p>
              <div className="needs-empty-actions">
                <PublicActionLink href="/pomagam" variant="primary" journey="help" system chevron>Pomóż w inny sposób</PublicActionLink>
                <PublicActionLink href="/jak-pomagac" variant="secondary" journey="guide" system chevron>Jak pomagać</PublicActionLink>
              </div>
            </div>
            <Image src="/brand/journeys/journey-help.png" alt="" width={520} height={420} className="needs-empty-art" aria-hidden="true" />
          </div>
        )}
      </section>
    </div>
  );
}
