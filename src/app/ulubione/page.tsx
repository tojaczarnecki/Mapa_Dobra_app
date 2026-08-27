import type { Metadata } from "next";
import { FavoritesList } from "@/components/favorites/favorites-list";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Ulubione | Mapa Dobra",
  description: "Zapisane miejsca pomocy w Mapie Dobra.",
  alternates: canonicalAlternates("/ulubione"),
};

export default function FavoritesPage() {
  return (
    <div className="md-empty-page md-favorites-page">
      <div className="md-page-heading">
        <h1>Ulubione</h1>
        <p>Miejsca zapisane na tym urządzeniu. Bez logowania i bez zakładania konta.</p>
      </div>
      <FavoritesList />
    </div>
  );
}
