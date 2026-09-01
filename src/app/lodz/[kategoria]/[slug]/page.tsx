import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceDetailView } from "@/components/place-details/place-detail-view";
import { getPublicPlaceDetail } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

type PlaceDetailPageProps = {
  params: Promise<{
    kategoria: string;
    slug: string;
  }>;
  searchParams?: Promise<{
    from?: string | string[];
    returnTo?: string | string[];
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
    alternates: canonicalAlternates(`/lodz/${kategoria}/${slug}`),
  };
}

export default async function PlaceDetailPage({ params, searchParams }: PlaceDetailPageProps) {
  const { kategoria, slug } = await params;
  const place = await getPublicPlaceDetail(kategoria, slug);

  if (!place) {
    notFound();
  }

  const query = searchParams ? await searchParams : undefined;
  const fromMap = query?.from === "mapa";
  const returnTo = Array.isArray(query?.returnTo) ? query?.returnTo[0] : query?.returnTo;
  const mapReturnTo = returnTo?.startsWith("/mapa") ? returnTo : undefined;
  const backHref = mapReturnTo ?? (fromMap ? "/mapa" : returnTo?.startsWith("/szukaj") ? returnTo : undefined);

  return <PlaceDetailView place={place} backHref={backHref} backLabel={fromMap ? "Wróć do mapy" : backHref ? "Wróć do wyników" : undefined} />;
}
