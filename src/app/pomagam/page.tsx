import type { Metadata } from "next";
import { HelpDecisionEntry } from "@/components/help-requests/help-decision-entry";
import { getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Chcę komuś pomóc | Mapa Dobra",
  description: "Powiedz, co się dzieje. Podpowiemy, co możesz zrobić.",
  alternates: canonicalAlternates("/pomagam"),
};

export const dynamic = "force-dynamic";

export default async function HelpSomeonePage() {
  const places = await getPublicSearchPlaces();
  const categories = Array.from(new Map(places.flatMap((place) => place.categorySlugs.map((slug, index) => [slug, place.helpTypes[index] ?? slug] as const))).entries())
    .map(([slug, label]) => ({ slug, label }))
    .sort((left, right) => left.label.localeCompare(right.label, "pl"));
  return <HelpDecisionEntry categories={categories} />;
}
