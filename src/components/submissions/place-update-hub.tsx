"use client";

import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type PlaceUpdateHubPlace = { id: string; name: string; address: string; helpTypes: string[] };

export function PlaceUpdateHub({ places, initialQuery = "" }: { places: PlaceUpdateHubPlace[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const normalizedQuery = query.trim().toLocaleLowerCase("pl-PL");
  const matches = useMemo(() => places.filter((place) => !normalizedQuery || `${place.name} ${place.address} ${place.helpTypes.join(" ")}`.toLocaleLowerCase("pl-PL").includes(normalizedQuery)).slice(0, 8), [normalizedQuery, places]);

  return <div className="space-y-8">
    <header className="space-y-2"><p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">Zgłoś zmianę</p><h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Wybierz miejsce i wskaż, co wymaga poprawy.</h1><p className="max-w-2xl text-base leading-7 text-muted-foreground">Najpierw znajdź miejsce w Mapie Dobra. Potem wybierzesz jedną konkretną informację do poprawy.</p></header>
    <section className="space-y-3" aria-labelledby="place-update-search-title"><h2 id="place-update-search-title" className="text-xl font-semibold">Znajdź miejsce w Mapie Dobra</h2><label className="relative block"><span className="sr-only">Wyszukaj miejsce po nazwie, adresie lub kategorii</span><Search aria-hidden="true" size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-strong" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-white pl-11 pr-3.5 text-[15px] outline-none transition placeholder:text-muted-foreground focus:border-brand-strong focus:ring-4 focus:ring-brand-strong/20" placeholder="Nazwa miejsca, adres lub kategoria" autoComplete="off" /></label><p className="text-sm text-muted-foreground" aria-live="polite">{normalizedQuery ? `Znaleziono ${matches.length} ${matches.length === 1 ? "miejsce" : "miejsc"}.` : "Wpisz kilka znaków, aby zawęzić listę."}</p><div className="divide-y divide-border border-y border-border" role="list" aria-label="Pasujące miejsca">{matches.map((place) => <Link key={place.id} href={`/zglos-zmiane?place=${encodeURIComponent(place.id)}`} className="flex min-h-16 items-center gap-3 py-3 hover:bg-brand-soft/30 focus-visible:bg-brand-soft/30"><MapPin aria-hidden="true" size={19} className="shrink-0 text-brand-strong" /><span className="min-w-0 flex-1"><strong className="block break-words text-sm font-semibold text-foreground">{place.name}</strong><span className="mt-0.5 block break-words text-sm text-muted-foreground">{place.address} · {place.helpTypes.join(", ")}</span></span><span className="sr-only">Wybierz miejsce do zgłoszenia zmiany</span></Link>)}{!matches.length ? <p className="py-5 text-sm text-muted-foreground">Nie znaleźliśmy miejsca. Spróbuj innej nazwy lub przejdź do wyszukiwarki.</p> : null}</div><Link href="/szukaj" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-brand-strong hover:bg-brand-soft">Przejdź do pełnej wyszukiwarki</Link></section>
  </div>;
}
