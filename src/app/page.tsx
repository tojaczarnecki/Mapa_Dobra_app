import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Roboto } from "next/font/google";
import { canonicalAlternates } from "@/lib/site-url";

const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["100", "300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dobra Mapa",
  description: "Znajdź pomoc albo uruchom wsparcie dla kogoś, o kogo się martwisz.",
  alternates: canonicalAlternates("/"),
};

export const viewport: Viewport = {
  themeColor: "#F4F6F4",
};

export default function Home() {
  return (
    <div className={`${roboto.className} home-xd-page`} data-home-design="xd-screen-1">
      <section className="home-xd-hero" aria-labelledby="home-xd-title">
        <div className="home-xd-hero-inner">
          <h1 id="home-xd-title" className="home-xd-title">
            Jak możemy<br />Ci dziś pomóc?
          </h1>
          <p className="home-xd-subtitle">Znajdź właściwe wsparcie blisko siebie.</p>
        </div>
      </section>

      <section className="home-xd-actions" aria-labelledby="home-xd-paths-title">
        <div className="home-xd-actions-main">
          <h2 id="home-xd-paths-title" className="home-xd-kicker">WYBIERZ DROGĘ</h2>

          <Link className="home-xd-primary" href="/szukaj">
            Szukam pomocy
          </Link>

          <Link className="home-xd-secondary" href="/pomagam">
            Chcę komuś pomóc
          </Link>

          <Link className="home-xd-unknown" href="/szukam?tryb=guided&krok=1">
            Nie wiem, czego potrzebuję
          </Link>
        </div>

        <Link className="home-xd-about" href="/o-projekcie">
          Przeczytaj o Dobrej Mapie
        </Link>
      </section>
    </div>
  );
}
