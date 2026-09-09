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

function safeReturnTarget(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, "https://dobra-mapa.local");
    if (parsed.origin !== "https://dobra-mapa.local") return undefined;
    if (parsed.pathname !== "/szukaj" && parsed.pathname !== "/mapa") return undefined;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return undefined;
  }
}

function isMapReturnTarget(value?: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value, "https://dobra-mapa.local");
    return parsed.pathname === "/mapa" || (parsed.pathname === "/szukaj" && parsed.searchParams.get("view") === "map");
  } catch {
    return false;
  }
}

export async function generateMetadata({
  params,
}: PlaceDetailPageProps): Promise<Metadata> {
  const { kategoria, slug } = await params;
  const place = await getPublicPlaceDetail(kategoria, slug);

  if (!place) {
    return {
      title: "Miejsce pomocy | Dobra Mapa",
    };
  }

  return {
    title: `${place.name} | Dobra Mapa`,
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
  const rawReturnTo = Array.isArray(query?.returnTo) ? query?.returnTo[0] : query?.returnTo;
  const returnTo = safeReturnTarget(rawReturnTo);
  const returningToMap = fromMap || isMapReturnTarget(returnTo);
  const backHref = returnTo ?? (fromMap ? "/szukaj?view=map" : undefined);

  return <PlaceDetailView place={place} backHref={backHref} backLabel={returningToMap ? "Wróć do mapy" : backHref ? "Wróć do wyników" : undefined} />;
}
