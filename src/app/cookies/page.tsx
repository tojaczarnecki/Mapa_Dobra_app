import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/app/cookie-settings-button";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Cookies | Mapa Dobra", alternates: canonicalAlternates("/cookies") };

export default function CookiesPage() {
  return (
    <div className="mx-auto w-full max-w-[800px] px-4 py-10 sm:px-6 md:py-16 lg:px-8">
      <article className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-[#18364D]">Cookies</h1>
        <p className="mt-4 leading-7 text-muted-foreground">Poniżej opisujemy technologie faktycznie używane przez publiczną część Mapy Dobra. Nie korzystamy obecnie z narzędzi analitycznych ani marketingowych.</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-[#18364D]">Czym są cookies i podobne technologie</h2>
          <p className="leading-7 text-muted-foreground">Cookies to małe pliki zapisywane przez przeglądarkę. Podobne technologie, takie jak localStorage i Cache Storage, pozwalają zapamiętać ustawienia urządzenia albo przygotować aplikację PWA do działania offline.</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-[#18364D]">Jakich technologii używa Mapa Dobra</h2>
          <p className="leading-7 text-muted-foreground">Publiczna część serwisu nie ustawia własnych cookies. Używa natywnych mechanizmów przeglądarki opisanych poniżej. Panel administratora korzysta z technicznego cookie sesyjnego i jest oddzielony od publicznej części.</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-[#18364D]">Niezbędne</h2>
          <ul className="list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
            <li><strong>localStorage</strong> — Mapa Dobra: zapis wyboru prywatności oraz zamknięcia komunikatu instalacji PWA. Okres działania: do usunięcia przez użytkownika w danych witryny.</li>
            <li><strong>Cache Storage</strong> — Mapa Dobra: cache service workera PWA dla zasobów aplikacji i strony offline. Okres działania: do aktualizacji lub usunięcia danych witryny przez przeglądarkę.</li>
            <li><strong>Cookie sesyjne panelu administratora</strong> — Mapa Dobra: utrzymanie zalogowanej sesji panelu. Jest używane wyłącznie w chronionej części administracyjnej.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-[#18364D]">Technologie, których obecnie nie używamy</h2>
          <p className="leading-7 text-muted-foreground">Nie wykryto Google Analytics, Google Tag Managera, Meta Pixela, skryptów marketingowych ani innych opcjonalnych narzędzi analitycznych. Nie ma więc obecnie dodatkowych kategorii zgody do włączenia.</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-[#18364D]">Jak zmienić zgodę</h2>
          <p className="leading-7 text-muted-foreground">Ustawienia można otworzyć ponownie w dowolnym momencie z linku „Ustawienia cookies” w stopce.</p>
          <CookieSettingsButton />
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-[#18364D]">Ustawienia przeglądarki i aktualizacja polityki</h2>
          <p className="leading-7 text-muted-foreground">Przeglądarka pozwala usunąć cookies, localStorage i dane PWA dla tej witryny. Usunięcie danych może wylogować z panelu administratora i wyłączyć lokalne ustawienia PWA. Opis będziemy aktualizować, jeśli zakres używanych technologii się zmieni.</p>
        </section>
      </article>
    </div>
  );
}
