import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceDetailView } from "@/components/place-details/place-detail-view";
import { getPublicPlaceDetail } from "@/lib/places/public-data";

type PlaceDetailPageProps = {
  params: Promise<{
    kategoria: string;
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PlaceDetailPageProps): Promise<Metadata> {
  const { kategoria, slug } = await params;
  const place = await getPublicPlaceDetail(kategoria, slug);

  if (!place) {
    return {
      title: "Miejsce pomocy | Mapa Dobra",
    };
  }

  return {
    title: `${place.name} | Mapa Dobra`,
    description: `${place.helpTypes.join(", ")} - ${place.address}`,
  };
}

export default async function PlaceDetailPage({ params }: PlaceDetailPageProps) {
  const { kategoria, slug } = await params;
  const place = await getPublicPlaceDetail(kategoria, slug);

  if (!place) {
    notFound();
  }

  return <PlaceDetailView place={place} />;
}
