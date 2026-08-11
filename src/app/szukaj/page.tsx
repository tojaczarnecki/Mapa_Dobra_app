import Link from "next/link";
import {
  List,
  LocateFixed,
  Map,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { PlaceCard } from "@/components/places/place-card";
import { demoPlaces } from "@/data/demo-places";
import { TextField } from "@/components/ui/text-field";

const quickFilters = [
  "Otwarte teraz",
  "Najbliżej",
  "Bezpłatne",
  "Bez skierowania",
  "Bez dokumentów",
];

export default function SearchPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-16 lg:px-8">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,680px)_minmax(320px,1fr)] lg:items-start lg:gap-8">
        <section className="min-w-0 space-y-3 sm:space-y-4">
          <div className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-3 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
            <div className="min-w-0 space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">
                  Znajdź pomoc
                </h1>
                <p className="hidden text-base leading-7 text-muted-foreground sm:block">
                  Wpisz, czego potrzebujesz, prostym językiem.
                </p>
              </div>

              <form className="min-w-0" aria-label="Wyszukiwarka miejsc pomocy">
                <TextField
                  icon={<Search aria-hidden="true" size={22} strokeWidth={2.25} />}
                  label="Czego szukasz?"
                  name="query"
                  defaultValue="jedzenie"
                  placeholder="jedzenie"
                  className="min-h-12 py-2.5 text-base sm:min-h-16 sm:py-3 sm:text-lg"
                />
              </form>

              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-border pt-2 text-sm sm:gap-x-3 sm:pt-3">
                <div className="flex items-center gap-1.5 text-base font-extrabold text-foreground">
                  <MapPin aria-hidden="true" size={19} className="text-brand-strong" />
                  Łódź
                </div>
                <div className="flex min-w-0 flex-wrap gap-1">
                  <button className="inline-action" type="button">
                    Zmień lokalizację
                  </button>
                  <button className="inline-action" type="button">
                    <LocateFixed aria-hidden="true" size={16} />
                    Użyj mojej lokalizacji
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div
              aria-label="Szybkie filtry"
              className="filter-scroll -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {quickFilters.map((filter) => (
                <button key={filter} className="filter-chip" type="button">
                  {filter}
                </button>
              ))}
              <button className="filter-chip filter-chip-strong" type="button">
                <SlidersHorizontal aria-hidden="true" size={17} />
                Filtry
              </button>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-lg font-extrabold text-foreground">12 miejsc</p>
                <span className="text-sm font-bold text-muted-foreground" aria-hidden="true">
                  |
                </span>
                <label className="flex min-w-0 items-center gap-1 text-sm font-bold text-muted-foreground">
                  <span className="sr-only">Sortuj</span>
                  <select
                    className="compact-select rounded-md border border-border bg-surface px-2 py-1.5 text-sm font-bold text-foreground shadow-sm focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/35"
                    defaultValue="best"
                    name="sort"
                  >
                    <option value="best">Najlepiej dopasowane</option>
                    <option value="distance">Najbliżej</option>
                    <option value="open">Otwarte teraz</option>
                  </select>
                </label>
                <p className="min-w-0 basis-full text-xs font-semibold text-muted-foreground sm:basis-auto sm:text-sm">
                  Wyniki dla: jedzenie
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <div
                  aria-label="Widok wyników"
                  className="grid w-full min-w-0 max-w-full grid-cols-2 rounded-lg border border-border bg-surface p-0.5 sm:w-auto"
                >
                  <span className="compact-toggle-item inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-extrabold text-foreground">
                    <List aria-hidden="true" size={17} />
                    Lista
                  </span>
                  <Link
                    className="compact-toggle-item inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-extrabold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                    href="/mapa"
                  >
                    <Map aria-hidden="true" size={17} />
                    Mapa
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:gap-4">
            {demoPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted p-6 text-center">
              <Map aria-hidden="true" size={34} className="mb-4 text-brand-strong" />
              <h2 className="text-xl font-extrabold text-foreground">
                Podgląd mapy
              </h2>
              <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-muted-foreground">
                Miejsce przygotowane pod przyszły widok mapy. Pełna mapa nie jest
                jeszcze implementowana.
              </p>
              <Link
                className="touch-target mt-5 inline-flex items-center justify-center rounded-lg border border-brand bg-surface px-4 py-2 text-sm font-extrabold text-foreground transition hover:bg-brand-soft"
                href="/mapa"
              >
                Przejdź do /mapa
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
