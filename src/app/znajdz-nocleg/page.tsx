import type { Metadata } from "next";
import { AccommodationWizard } from "@/components/accommodations/accommodation-wizard";
import { getPublicAccommodations } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Znajdź nocleg | Mapa Dobra",
  description: "Znajdź miejsce noclegowe dopasowane do Twojej sytuacji.",
  alternates: canonicalAlternates("/znajdz-nocleg"),
};

export const dynamic = "force-dynamic";

export default async function FindAccommodationPage() {
  const accommodations = await getPublicAccommodations();
  return <AccommodationWizard accommodations={accommodations} />;
}
