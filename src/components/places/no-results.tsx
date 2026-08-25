import Link from "next/link";

export function NoResults({ clearHref = "/szukaj", mapHref = "/mapa" }: { clearHref?: string; mapHref?: string }) {
  return (
    <section className="search-no-results">
      <div>
        <h2>Nie znaleźliśmy miejsc pasujących do tych filtrów.</h2>
        <p>Spróbuj innej frazy, wyczyść filtry albo sprawdź miejsca na mapie.</p>
      </div>
      <div className="search-no-results-actions">
        <Link className="search-no-results-action" href={clearHref}>Wyczyść filtry</Link>
        <Link className="search-no-results-action search-no-results-action-secondary" href={mapHref}>Otwórz mapę</Link>
      </div>
    </section>
  );
}
