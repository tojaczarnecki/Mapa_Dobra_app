import type { Metadata } from "next";
import Link from "next/link";
import { Map } from "lucide-react";
import { AccommodationWizard } from "@/components/accommodations/accommodation-wizard";
import { getPublicAccommodations } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Znajdź nocleg | Dobra Mapa",
  description: "Znajdź miejsce noclegowe dopasowane do Twojej sytuacji.",
  alternates: canonicalAlternates("/znajdz-nocleg"),
};

export const dynamic = "force-dynamic";

export default async function FindAccommodationPage() {
  const accommodations = await getPublicAccommodations();
  return (
    <>
      <div className="guided-flow-page">
      <div className="mx-auto flex w-full max-w-[1200px] justify-end px-4 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        <Link
          className="accommodation-map-link touch-target inline-flex min-h-11 w-full items-center justify-center gap-2 border border-brand px-4 py-2 text-sm font-extrabold text-brand-strong transition hover:bg-brand-soft hover:text-foreground sm:w-auto"
          href="/mapa?kategoria=nocleg&lokalizacja=moja"
        >
          <Map aria-hidden="true" size={17} />
          Pokaż wszystkie noclegi na mapie
        </Link>
      </div>
      <AccommodationWizard accommodations={accommodations} />
      </div>
    </>
  );
}
