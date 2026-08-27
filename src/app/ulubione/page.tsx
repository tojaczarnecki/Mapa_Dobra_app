import type { Metadata } from "next";
import { FavoritesList, type FavoriteLivePlace } from "@/components/favorites/favorites-list";
import { getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Ulubione | Mapa Dobra",
  description: "Zapisane miejsca pomocy w Mapie Dobra.",
  alternates: canonicalAlternates("/ulubione"),
};

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const livePlaces: FavoriteLivePlace[] = (await getPublicSearchPlaces()).map((place) => ({
    id: place.id,
    href: `/lodz/${place.categorySlug}/${place.slug}`,
    name: place.name,
    categoryLabel: place.helpTypes[0] ?? "Pomoc",
    status: place.status,
    todayHours: place.todayHours,
    distanceLabel: place.distance,
    address: place.address,
    phone: place.phone,
  }));

  return (
    <div className="md-empty-page md-favorites-page">
      <div className="md-page-heading">
        <h1>Ulubione</h1>
        <p>Miejsca zapisane na tym urządzeniu. Bez logowania i bez zakładania konta.</p>
      </div>
      <FavoritesList livePlaces={livePlaces} />
    </div>
  );
}
