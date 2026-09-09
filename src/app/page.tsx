import type { Metadata } from "next";
import Image from "next/image";
import { PrimaryActionCard } from "@/components/home/primary-action-card";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Dobra Mapa",
  description: "Znajdź pomoc albo uruchom wsparcie dla kogoś, o kogo się martwisz.",
  alternates: canonicalAlternates("/"),
};

export default function Home() {
  return (
    <div className="home-page home-journey-foyer mobile-nav-safe-content">
      <header className="home-intro">
        <p className="home-wordmark">DOBRA MAPA</p>
        <div className="home-wordmark-line" aria-hidden="true" />
        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <h1 className="home-motto">
              <span className="home-motto-mobile">JAK MOŻEMY<br />CI DZIŚ POMÓC?</span>
              <span className="home-motto-desktop">JAK MOŻEMY<br />CI DZIŚ POMÓC?</span>
            </h1>
            <p className="home-subheadline">Znajdź właściwe wsparcie blisko siebie.</p>
          </div>
          <div className="home-art-stage">
            <Image src="/brand/journeys/journey-guide.png" alt="" width={640} height={640} className="home-hero-illustration" priority aria-hidden="true" />
          </div>
        </div>
      </header>

      <section className="home-paths" aria-labelledby="home-paths-title">
        <div className="home-paths-heading">
          <h2 id="home-paths-title">WYBIERZ DROGĘ</h2>
          <div className="home-rule" aria-hidden="true" />
        </div>
        <div className="home-primary-actions">
        <PrimaryActionCard
          href="/szukam?tryb=guided"
          title="Szukam pomocy"
          description="Jedzenie, nocleg, zdrowie…"
          variant="help"
        />
        <PrimaryActionCard
          href="/pomagam"
          title="Chcę komuś pomóc"
          description="Znajdź pomoc dla drugiej osoby."
          variant="activate"
        />
        <PrimaryActionCard
          href="/mapa?otwarte=1&lokalizacja=moja"
          title="Pomoc dostępna teraz"
          description="Zobacz miejsca otwarte w tej chwili."
          variant="now"
        />
        <PrimaryActionCard
          href="/szukam"
          title="Nie wiem, czego potrzebuję"
          description=""
          variant="unknown"
        />
        </div>
      </section>
    </div>
  );
}
