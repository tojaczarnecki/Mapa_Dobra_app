import type { Metadata } from "next";
import { FavoritesList, type FavoriteLivePlace } from "@/components/favorites/favorites-list";
import { getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Ulubione | Dobra Mapa",
  description: "Zapisane miejsca pomocy w Dobrej Mapie.",
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
    <div className="favorites-page utility-flow-page mx-auto w-full max-w-[920px] px-4 pb-28 pt-5 sm:px-6 sm:pt-8 md:pb-16 lg:px-8">
      <header className="favorites-page-header mb-5 sm:mb-7">
        <p className="favorites-page-eyebrow">ZAPISANE MIEJSCA</p>
        <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">Ulubione</h1>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
          Miejsca zapisane na tym urządzeniu. Bez logowania i bez zakładania konta.
        </p>
      </header>
      <FavoritesList livePlaces={livePlaces} liveDataAvailable />
    </div>
  );
}
