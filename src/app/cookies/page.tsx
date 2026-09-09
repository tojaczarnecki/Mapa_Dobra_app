import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/app/cookie-settings-button";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Cookies i dane urządzenia | Dobra Mapa", alternates: canonicalAlternates("/cookies") };

const technologies = [
  ["Cookie prywatności", "Zapamiętuje wybór dotyczący niezbędnych technologii, aby serwer mógł odtworzyć ustawienie przy kolejnej wizycie."],
  ["localStorage", "Przechowuje ustawienie prywatności, zapisane miejsca (Ulubione) oraz informację o odroczeniu komunikatu instalacji PWA. Dane pozostają na tym urządzeniu do czasu ich usunięcia przez użytkownika lub aplikację."],
  ["sessionStorage", "Może tymczasowo przechowywać niedokończone formularze, np. zgłoszenie sytuacji. Draft zgłoszenia sytuacji nie zapisuje imienia, telefonu ani e-maila i wygasa po określonym czasie lub zamknięciu sesji przeglądarki."],
  ["Cache Storage", "Przechowuje zasoby PWA i stronę offline. Dobra Mapa nie traktuje kopii danych o aktualnej dostępności pomocy jako wiarygodnego zamiennika danych online."],
  ["Cookie sesyjne administratora", "Utrzymuje sesję zalogowanej osoby w panelu administratora i działa wyłącznie w chronionej części serwisu."],
] as const;

export default function CookiesPage() {
  return (
    <div className="utility-flow-page cookies-page mx-auto w-full max-w-[920px] px-5 py-10 sm:px-8 md:py-16">
      <article>
        <header className="border-t border-foreground pt-6 md:pt-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong">INFORMACJE</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight text-foreground md:text-5xl">Cookies i dane urządzenia</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Wyjaśniamy, jakie technologie wykorzystuje Dobra Mapa i do czego są potrzebne.</p>
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
            <div className="border-b border-border pb-6 md:border-b-0 md:border-r md:pr-6"><p className="text-sm font-extrabold text-brand-strong">Brak reklamy</p><p className="mt-2 leading-7 text-muted-foreground">W analizowanej wersji aplikacji nie używamy narzędzi reklamowych ani marketingowych.</p></div>
            <div className="border-b border-border py-6 md:border-b-0 md:border-r md:px-6 md:py-0"><p className="text-sm font-extrabold text-brand-strong">Dane funkcjonalne</p><p className="mt-2 leading-7 text-muted-foreground">Pamięć przeglądarki służy m.in. ustawieniom, zapisanym miejscom, draftom formularzy i działaniu PWA.</p></div>
            <div className="pt-6 md:pl-6 md:pt-0"><p className="text-sm font-extrabold text-brand-strong">Masz kontrolę</p><p className="mt-2 leading-7 text-muted-foreground">Dane lokalne możesz usunąć w ustawieniach przeglądarki lub urządzenia.</p></div>
          </div>
        </section>

        <section className="border-b border-border py-8 md:py-10" aria-labelledby="cookies-definition">
          <h2 id="cookies-definition" className="text-2xl font-extrabold text-foreground md:text-3xl">Czym są cookies i dane urządzenia?</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Cookies to małe dane zapisywane przez przeglądarkę. Podobne mechanizmy, takie jak localStorage, sessionStorage i Cache Storage, pozwalają zapamiętać ustawienia, zachować wybrane dane na urządzeniu albo przygotować aplikację PWA do pracy przy słabym połączeniu.</p>
        </section>

        <section className="border-b border-border py-8 md:py-10" aria-labelledby="cookies-used">
          <h2 id="cookies-used" className="text-2xl font-extrabold text-foreground md:text-3xl">Czego używa Dobra Mapa</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Aplikacja korzysta z niezbędnych cookies oraz natywnych mechanizmów pamięci przeglądarki opisanych poniżej.</p>
          <dl className="mt-7 divide-y divide-border border-y border-border">
            {technologies.map(([name, description]) => <div key={name} className="grid gap-2 py-5 md:grid-cols-[minmax(10rem,0.35fr)_1fr] md:gap-8"><dt className="font-extrabold text-foreground">{name}</dt><dd className="leading-7 text-muted-foreground">{description}</dd></div>)}
          </dl>
        </section>

        <section className="border-b border-border py-8 md:py-10" aria-labelledby="cookies-not-used">
          <h2 id="cookies-not-used" className="text-2xl font-extrabold text-foreground md:text-3xl">Czego nie używamy</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">W analizowanej wersji aplikacji nie ma Google Analytics, Google Tag Managera, Meta Pixela ani innych opcjonalnych narzędzi reklamowych lub marketingowych. Jeżeli ten zakres się zmieni, opis i mechanizm ustawień prywatności muszą zostać zaktualizowane przed uruchomieniem nowych technologii.</p>
        </section>

        <section className="py-8 md:py-10" aria-labelledby="cookies-settings">
          <h2 id="cookies-settings" className="text-2xl font-extrabold text-foreground md:text-3xl">Ustawienia i usuwanie danych</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Możesz ponownie otworzyć informację o ustawieniach prywatności. Przeglądarka pozwala również usunąć cookies, localStorage, sessionStorage i dane PWA dla tej witryny.</p>
          <div className="mt-6"><CookieSettingsButton /></div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">Usunięcie danych witryny może usunąć zapisane miejsca i niedokończone formularze, wylogować z panelu administratora oraz zresetować ustawienia PWA na tym urządzeniu.</p>
        </section>
      </article>
    </div>
  );
}
