import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/app/public-info-page";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Dostępność | Dobra Mapa", alternates: canonicalAlternates("/dostepnosc") };

export default function AccessibilityPage() {
  return (
    <PublicInfoPage title="Dostępność">
      <div className="mt-6 space-y-7 leading-7 text-muted-foreground">
        <p>Dobra Mapa jest projektowana tak, aby dało się z niej korzystać na telefonie, za pomocą klawiatury oraz z technologiami asystującymi. Ta strona opisuje rozwiązania dostępne w bieżącej wersji aplikacji oraz obszary, które nadal testujemy przed publicznym pilotażem.</p>

        <section aria-labelledby="accessibility-current">
          <h2 id="accessibility-current" className="text-xl font-bold text-foreground">Co jest już wspierane</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>semantyczne nagłówki, formularze i opisy pól,</li>
            <li>widoczny focus dla nawigacji klawiaturą,</li>
            <li>skip link prowadzący do głównej treści,</li>
            <li>tekstowe etykiety statusów, dzięki czemu informacja nie opiera się wyłącznie na kolorze,</li>
            <li>obsługa powiększenia i układów mobilnych,</li>
            <li>komunikaty statusowe dla zmian takich jak utrata lub odzyskanie połączenia z internetem,</li>
            <li>ograniczenie animacji, gdy urządzenie ma włączone ustawienie „reduce motion”.</li>
          </ul>
        </section>

        <section aria-labelledby="accessibility-testing">
          <h2 id="accessibility-testing" className="text-xl font-bold text-foreground">Co nadal sprawdzamy</h2>
          <p className="mt-3">Przed publicznym pilotażem wykonujemy dodatkowe testy dla szerokości 320–430 px, kontrastu drobnych elementów, dialogów, mapy, sticky controls i pełnych ścieżek klawiaturowych. Jeżeli interfejs lub treść utrudniają wykonanie zadania, traktujemy to jako błąd produktu do poprawy.</p>
        </section>

        <section aria-labelledby="accessibility-maps">
          <h2 id="accessibility-maps" className="text-xl font-bold text-foreground">Mapa nie jest jedyną drogą</h2>
          <p className="mt-3">Najważniejsze informacje o miejscu powinny być dostępne również w liście i szczególe miejsca. Krytyczne działania nie powinny wymagać gestu na mapie ani precyzyjnego sterowania wskaźnikiem.</p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
