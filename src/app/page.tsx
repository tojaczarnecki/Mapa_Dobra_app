import type { Metadata } from "next";
import { PrimaryActionCard } from "@/components/home/primary-action-card";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Dobra Mapa",
  description: "Znajdź pomoc albo uruchom wsparcie dla kogoś, o kogo się martwisz.",
  alternates: canonicalAlternates("/"),
};

export default function Home() {
  return (
    <div className="home-page home-journey-foyer mobile-nav-safe-content mx-auto w-full max-w-[1000px] px-5 pb-28 pt-10 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
      <header className="home-intro">
        <p className="home-eyebrow">DOBRA MAPA</p>
        <h1 className="home-motto">Jak możemy Ci dziś pomóc?</h1>
        <p className="home-subheadline">Znajdź właściwe wsparcie blisko siebie.</p>
      </header>

      <section className="home-primary-actions" aria-label="Główne ścieżki">
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
          description="Pomóż mi znaleźć właściwe rozwiązanie."
          variant="unknown"
        />
      </section>
    </div>
  );
}
