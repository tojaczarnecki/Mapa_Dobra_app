import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceDetailView } from "@/components/place-details/place-detail-view";
import { detailReturnLink } from "@/lib/places/detail-return";
import { getPublicPlaceDetail } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

type PlaceDetailPageProps = {
  params: Promise<{
    kategoria: string;
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
    alternates: canonicalAlternates(`/lodz/${kategoria}/${slug}`),
  };
}

export default async function PlaceDetailPage({ params, searchParams }: PlaceDetailPageProps) {
  const { kategoria, slug } = await params;
  const rawSearchParams = await searchParams;
  const place = await getPublicPlaceDetail(kategoria, slug);

  if (!place) {
    notFound();
  }

  return (
    <PlaceDetailView
      place={place}
      returnLink={detailReturnLink(rawSearchParams.from)}
    />
  );
}
