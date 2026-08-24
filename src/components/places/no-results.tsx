import Link from "next/link";

export function NoResults({ clearHref = "/szukaj" }: { clearHref?: string }) {
  return (
    <section className="search-no-results">
      <div>
        <h2>Nie znaleźliśmy miejsc spełniających te kryteria.</h2>
        <p>Zmień frazę lub wyczyść filtry, aby zobaczyć inne możliwości.</p>
      </div>
      <Link className="search-no-results-action" href={clearHref}>Wyczyść filtry</Link>
    </section>
  );
}
