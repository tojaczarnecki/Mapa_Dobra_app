import type { Metadata } from "next";
import Link from "next/link";
import {
  BedDouble,
  Brain,
  ChevronRight,
  Droplets,
  HeartPulse,
  HeartHandshake,
  Navigation,
  Scale,
  Search,
  Shirt,
  ShowerHead,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Mapa Dobra",
  description: "Znajdź pomoc albo uruchom wsparcie dla kogoś, o kogo się martwisz.",
  alternates: canonicalAlternates("/"),
};

const categories = [
  { label: "Jedzenie", slug: "jedzenie", icon: Utensils },
  { label: "Nocleg", slug: "nocleg", icon: BedDouble },
  { label: "Prysznic", slug: "prysznic", icon: ShowerHead },
  { label: "Odzież", slug: "odziez", icon: Shirt },
  { label: "Pomoc medyczna", slug: "pomoc-medyczna", icon: HeartPulse },
  { label: "Pomoc psychologiczna", slug: "pomoc-psychologiczna", icon: Brain },
  { label: "Pomoc prawna", slug: "pomoc-prawna", icon: Scale },
  { label: "Higiena", slug: "higiena", icon: Droplets },
];

export default function Home() {
  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-4 pb-24 pt-3 sm:gap-7 sm:px-6 sm:pb-28 sm:pt-5 md:grid-cols-2 md:items-start md:gap-8 md:pb-16 md:pt-8 lg:grid-cols-[minmax(0,540px)_minmax(0,540px)] lg:justify-center lg:gap-10 lg:px-8">
      <section className="space-y-4 md:space-y-6">
        <div className="space-y-2 md:space-y-3">
          <p className="text-sm font-bold uppercase text-brand">Co chcesz zrobić?</p>
          <h1 className="max-w-[14ch] text-[2.05rem] font-bold leading-[1.1] text-foreground sm:text-5xl lg:text-[3.25rem]">
            Znajdź pomoc. Albo uruchom ją dla kogoś.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Dwie proste ścieżki, żeby szybciej zrobić coś dobrego.
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4">
          <Card className="search-panel p-4 sm:p-5">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                <Search aria-hidden="true" size={24} strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-foreground">Znajdź pomoc</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Potrzebujesz wsparcia albo chcesz wskazać komuś konkretne miejsce?
                </p>
              </div>
            </div>
            <form action="/mapa" method="get" className="space-y-2.5" aria-label="Wyszukiwarka pomocy">
              <input type="hidden" name="lokalizacja" value="moja" />
              <TextField
                icon={<Search aria-hidden="true" size={22} strokeWidth={2.25} />}
                label="Czego potrzebujesz?"
                name="q"
                placeholder="Np. jedzenie, nocleg, prysznic…"
                className="min-h-14 text-base"
              />
              <Button type="submit" className="min-h-12 w-full text-base">
                Znajdź pomoc
              </Button>
            </form>
          </Card>

          <Link href="/uruchom-pomoc" className="help-launch-card help-launch-card-prominent">
            <span className="help-launch-icon"><HeartHandshake aria-hidden="true" size={28} strokeWidth={2.1} /></span>
            <span className="help-launch-copy">
              <span className="help-launch-kicker">Chcesz pomóc komuś innemu?</span>
              <span className="help-launch-title">Martwisz się o kogoś?</span>
              <span className="help-launch-note">Widzisz sytuację, która budzi Twój niepokój? Pomóż uruchomić odpowiednie wsparcie.</span>
              <span className="mt-2 inline-flex min-h-12 w-fit items-center rounded-lg bg-[#d79a2b] px-4 text-sm font-bold text-[#352307]">Uruchom pomoc</span>
            </span>
            <ChevronRight aria-hidden="true" className="help-launch-arrow" size={22} />
          </Link>
        </div>

        <div className="grid gap-2.5 sm:gap-3">
          <Link className="quick-action quick-action-now" href="/szukaj?otwarte=1&sort=open">
            <span className="quick-action-icon">
              <Navigation aria-hidden="true" size={26} strokeWidth={2.25} />
            </span>
            <span className="quick-action-copy">
              <span className="quick-action-title">Gdzie mogę iść teraz?</span>
              <span className="quick-action-note">
                Szybka ścieżka do miejsc dostępnych od razu.
              </span>
            </span>
          </Link>
          <Link className="quick-action quick-action-crisis" href="/znajdz-nocleg">
            <span className="quick-action-icon">
              <BedDouble aria-hidden="true" size={26} strokeWidth={2.25} />
            </span>
            <span className="quick-action-copy">
              <span className="quick-action-title">
                Potrzebuję noclegu na dzisiaj
              </span>
              <span className="quick-action-note">
                Kryzysowa ścieżka dla pilnej potrzeby schronienia.
              </span>
            </span>
          </Link>
        </div>
      </section>

      <section id="kategorie" className="space-y-3.5 scroll-mt-20 sm:space-y-5 md:scroll-mt-24 md:pt-4">
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            Jakiej pomocy potrzebujesz?
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Wybierz kategorię, żeby zawęzić kierunek szukania.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
          {categories.map((category) => (
            <Link
              key={category.label}
              href={`/szukaj?kategoria=${category.slug}`}
              className="category-tile"
              aria-label={`Szukaj pomocy: ${category.label}`}
            >
              <span className="category-icon" aria-hidden="true">
                <category.icon size={26} strokeWidth={2} />
              </span>
              <span className="category-label">{category.label}</span>
              <ChevronRight
                className="category-arrow"
                aria-hidden="true"
                size={20}
                strokeWidth={2}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
