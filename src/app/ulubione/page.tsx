import type { Metadata } from "next";
import { FavoritesList, type FavoriteLivePlace } from "@/components/favorites/favorites-list";
import { getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Ulubione | Dobra Mapa",
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
    <div className="utility-flow-page mx-auto w-full max-w-[760px] px-4 pb-28 pt-4 sm:px-6 sm:pt-7 md:pb-16 lg:px-8">
      <header className="mb-4 sm:mb-5">
        <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">Ulubione</h1>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
          Miejsca zapisane na tym urządzeniu. Bez logowania i bez zakładania konta.
        </p>
      </header>
      <FavoritesList livePlaces={livePlaces} />
    </div>
  );
}
