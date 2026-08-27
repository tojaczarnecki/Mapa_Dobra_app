import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Ulubione | Mapa Dobra",
  description: "Zapisane miejsca pomocy w Mapie Dobra.",
  alternates: canonicalAlternates("/ulubione"),
};

export default function FavoritesPage() {
  return (
    <div className="md-empty-page">
      <h1>Ulubione</h1>
      <div className="md-empty-card">
        <Heart aria-hidden="true" size={28} />
        <strong>Nie masz jeszcze zapisanych miejsc</strong>
        <p>Z czasem zapiszesz tutaj miejsca, do których chcesz szybko wracać.</p>
        <Link className="md-help-cta" href="/szukaj" style={{ marginTop: 16 }}>
          <Search aria-hidden="true" size={17} />
          Znajdź pomoc
        </Link>
      </div>
    </div>
  );
}
