"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { JourneyMotif } from "@/components/home/journey-motif";

function hrefWithout(params: URLSearchParams, ...keys: string[]) {
  const next = new URLSearchParams(params);
  keys.forEach((key) => next.delete(key));
  const query = next.toString();
  return query ? `/szukaj?${query}` : "/szukaj";
}

export function NoResults() {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const openNow = params.get("otwarte") === "1";
  const category = params.get("kategoria");
  const query = params.get("zapytanie") || params.get("q") || params.get("query");

  const state = openNow
    ? {
        title: "Nie znaleźliśmy teraz otwartych miejsc.",
        description: "Możesz poszerzyć wyniki i zobaczyć także miejsca, które są dziś zamknięte lub otwierają się później.",
        primaryHref: hrefWithout(params, "otwarte"),
        primaryLabel: "Pokaż także zamknięte",
      }
    : category
      ? {
          title: "Nie znaleźliśmy miejsc w tej kategorii.",
          description: "Spróbuj zobaczyć wszystkie rodzaje pomocy albo wybierz inną potrzebę.",
          primaryHref: hrefWithout(params, "kategoria"),
          primaryLabel: "Pokaż wszystkie kategorie",
        }
      : query
        ? {
            title: "Nie znaleźliśmy miejsc dla tego wyszukiwania.",
            description: "Spróbuj krótszego opisu potrzeby albo przejdź do wyboru kategorii.",
            primaryHref: hrefWithout(params, "zapytanie", "q", "query"),
            primaryLabel: "Wyczyść wyszukiwanie",
          }
        : {
            title: "Nie znaleźliśmy miejsc spełniających te kryteria.",
            description: "Poszerz zakres wyszukiwania albo wybierz inną potrzebę.",
            primaryHref: "/szukaj",
            primaryLabel: "Wyczyść filtry",
          };

  return (
    <section className="editorial-empty-state editorial-empty-state-search" aria-live="polite">
      <JourneyMotif journey="search" />
      <div className="editorial-empty-state-copy">
        <p className="editorial-empty-state-eyebrow">BRAK WYNIKÓW</p>
        <h2>{state.title}</h2>
        <p>{state.description}</p>
        <div className="editorial-empty-state-actions">
          <Link className="editorial-empty-state-primary" href={state.primaryHref}>
            {state.primaryLabel}
          </Link>
          <Link className="editorial-empty-state-secondary" href="/szukam">
            Wybierz inną potrzebę
          </Link>
        </div>
      </div>
    </section>
  );
}
