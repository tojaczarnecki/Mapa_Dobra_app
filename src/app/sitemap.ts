import type { MetadataRoute } from "next";
import { getPublicHelpGuides } from "@/data/help-guides";
import { getPublicSitemapPlaces } from "@/lib/places/public-data";
import { getSiteBaseUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();
  if (!baseUrl) return [];
  const places = await getPublicSitemapPlaces();
  const staticRoutes = ["/", "/szukaj", "/szukam", "/mapa", "/znajdz-nocleg", "/zglos-miejsce", "/zglos-zmiane", "/uruchom-pomoc", "/pomagam", "/jak-pomagac"];
  return [
    ...staticRoutes.map((path) => ({ url: new URL(path, baseUrl).toString(), changeFrequency: "weekly" as const })),
    ...getPublicHelpGuides().map((guide) => ({ url: new URL(`/jak-pomagac/${guide.slug}`, baseUrl).toString(), changeFrequency: "monthly" as const })),
    ...places.map((place) => ({
      url: new URL(`/lodz/${place.primaryCategory.slug}/${place.slug}`, baseUrl).toString(),
      lastModified: place.updatedAt,
      changeFrequency: "weekly" as const,
    })),
  ];
}
