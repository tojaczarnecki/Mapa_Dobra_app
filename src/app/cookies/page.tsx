import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/app/cookie-settings-button";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Cookies i dane urządzenia | Dobra Mapa", alternates: canonicalAlternates("/cookies") };

const technologies = [
  ["localStorage", "Zapamiętuje ustawienia prywatności i zamknięcie komunikatu instalacji PWA."],
  ["Cache Storage", "Przechowuje zasoby PWA i stronę offline do czasu aktualizacji lub usunięcia danych witryny."],
  ["Cookie sesyjne", "Utrzymuje sesję panelu administratora. Działa wyłącznie w chronionej części serwisu."],
] as const;

export default function CookiesPage() {
  return (
    <div className="utility-flow-page cookies-page mx-auto w-full max-w-[920px] px-5 py-10 sm:px-8 md:py-16">
      <article>
        <header className="border-t border-foreground pt-6 md:pt-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong">INFORMACJE</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight text-foreground md:text-5xl">Cookies i dane urządzenia</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Wyjaśniamy, jakie technologie wykorzystuje publiczna część Dobrej Mapy i do czego są potrzebne.</p>
          <nav className="mt-8 border-y border-border py-4" aria-label="Sekcje strony">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-extrabold text-brand-strong">
              <li><a className="underline-offset-4 hover:underline" href="#cookies-used">Używane technologie</a></li>
              <li><a className="underline-offset-4 hover:underline" href="#cookies-not-used">Czego nie używamy</a></li>
              <li><a className="underline-offset-4 hover:underline" href="#cookies-settings">Ustawienia</a></li>
            </ul>
          </nav>
        </header>

        <section className="mt-12 border-y border-border py-7 md:mt-16 md:py-9" aria-labelledby="cookies-basics">
          <h2 id="cookies-basics" className="text-2xl font-extrabold text-foreground md:text-3xl">Najważniejsze w skrócie</h2>
          <div className="mt-7 grid gap-0 md:grid-cols-3">
            <div className="border-b border-border pb-6 md:border-b-0 md:border-r md:pr-6"><p className="text-sm font-extrabold text-brand-strong">Brak reklamy</p><p className="mt-2 leading-7 text-muted-foreground">Nie używamy narzędzi analitycznych ani marketingowych.</p></div>
            <div className="border-b border-border py-6 md:border-b-0 md:border-r md:px-6 md:py-0"><p className="text-sm font-extrabold text-brand-strong">Tylko niezbędne dane</p><p className="mt-2 leading-7 text-muted-foreground">Technologie służą działaniu serwisu, PWA i panelu administratora.</p></div>
            <div className="pt-6 md:pl-6 md:pt-0"><p className="text-sm font-extrabold text-brand-strong">Masz kontrolę</p><p className="mt-2 leading-7 text-muted-foreground">Ustawienia prywatności możesz otworzyć ponownie w dowolnym momencie.</p></div>
          </div>
        </section>

        <section className="border-b border-border py-8 md:py-10" aria-labelledby="cookies-definition">
          <h2 id="cookies-definition" className="text-2xl font-extrabold text-foreground md:text-3xl">Czym są cookies?</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Cookies to małe pliki zapisywane przez przeglądarkę. Podobne technologie, takie jak localStorage i Cache Storage, pozwalają zapamiętać ustawienia urządzenia albo przygotować aplikację PWA do działania offline.</p>
        </section>

        <section className="border-b border-border py-8 md:py-10" aria-labelledby="cookies-used">
          <h2 id="cookies-used" className="text-2xl font-extrabold text-foreground md:text-3xl">Czego używa Dobra Mapa</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Publiczna część serwisu nie ustawia własnych cookies. Korzysta z natywnych mechanizmów przeglądarki opisanych poniżej.</p>
          <dl className="mt-7 divide-y divide-border border-y border-border">
            {technologies.map(([name, description]) => <div key={name} className="grid gap-2 py-5 md:grid-cols-[minmax(10rem,0.35fr)_1fr] md:gap-8"><dt className="font-extrabold text-foreground">{name}</dt><dd className="leading-7 text-muted-foreground">{description}</dd></div>)}
          </dl>
        </section>

        <section className="border-b border-border py-8 md:py-10" aria-labelledby="cookies-not-used">
          <h2 id="cookies-not-used" className="text-2xl font-extrabold text-foreground md:text-3xl">Czego nie używamy</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Nie wykryto Google Analytics, Google Tag Managera, Meta Pixela, skryptów marketingowych ani innych opcjonalnych narzędzi analitycznych. Nie ma więc dodatkowych kategorii zgody do włączenia.</p>
        </section>

        <section className="py-8 md:py-10" aria-labelledby="cookies-settings">
          <h2 id="cookies-settings" className="text-2xl font-extrabold text-foreground md:text-3xl">Zmień ustawienia</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Możesz otworzyć ustawienia ponownie z linku „Ustawienia cookies” w stopce. Przeglądarka pozwala także usunąć cookies, localStorage i dane PWA dla tej witryny.</p>
          <div className="mt-6"><CookieSettingsButton /></div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">Usunięcie danych witryny może wylogować z panelu administratora i wyłączyć lokalne ustawienia PWA. Opis aktualizujemy, jeśli zmieni się zakres używanych technologii.</p>
        </section>
      </article>
    </div>
  );
}
