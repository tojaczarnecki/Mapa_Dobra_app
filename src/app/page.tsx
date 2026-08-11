import Link from "next/link";
import {
  BedDouble,
  Brain,
  ChevronRight,
  Droplets,
  HeartPulse,
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

const categories = [
  { label: "Jedzenie", icon: Utensils },
  { label: "Nocleg", icon: BedDouble },
  { label: "Prysznic", icon: ShowerHead },
  { label: "Odzież", icon: Shirt },
  { label: "Pomoc medyczna", icon: HeartPulse },
  { label: "Pomoc psychologiczna", icon: Brain },
  { label: "Pomoc prawna", icon: Scale },
  { label: "Higiena", icon: Droplets },
];

export default function Home() {
  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-4 pb-24 pt-3 sm:gap-7 sm:px-6 sm:pb-28 sm:pt-5 md:grid-cols-2 md:items-start md:gap-8 md:pb-16 md:pt-8 lg:grid-cols-[minmax(0,540px)_minmax(0,540px)] lg:justify-center lg:gap-10 lg:px-8">
      <section className="space-y-4 md:space-y-6">
        <div className="space-y-2.5 md:space-y-4">
          <p className="text-sm font-bold uppercase text-brand">
            Jakiej pomocy potrzebujesz?
          </p>
          <h1 className="max-w-[13ch] text-[2.05rem] font-bold leading-[1.1] text-foreground sm:max-w-[13ch] sm:text-5xl lg:text-[3.25rem]">
            Znajdź pomoc, której potrzebujesz.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 md:text-xl">
            Szybko przejdź do najważniejszych opcji albo wpisz, czego szukasz.
          </p>
        </div>

        <Card className="search-panel p-2.5 sm:p-4">
          <form className="space-y-2.5 sm:space-y-3" aria-label="Wyszukiwarka pomocy">
            <TextField
              icon={<Search aria-hidden="true" size={22} strokeWidth={2.25} />}
              label="Czego potrzebujesz?"
              name="query"
              placeholder="Np. jedzenie, nocleg, prysznic…"
              className="min-h-14 text-base sm:min-h-16 sm:text-lg"
            />
            <Button type="button" className="min-h-12 w-full text-base sm:min-h-14 sm:text-lg">
              Znajdź pomoc blisko mnie
            </Button>
          </form>
        </Card>

        <div className="grid gap-2.5 sm:gap-3">
          <Link className="quick-action quick-action-now" href="/szukaj">
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
              href="/szukaj"
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
