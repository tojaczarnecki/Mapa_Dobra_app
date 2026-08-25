import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="public-state-page">
      <section className="public-state-content">
        <SearchX aria-hidden="true" className="public-state-icon" size={36} />
        <h1>Nie znaleźliśmy tego miejsca.</h1>
        <p>Link mógł się zmienić albo miejsce nie jest obecnie dostępne publicznie.</p>
        <div className="public-state-actions">
          <Link className="public-state-primary" href="/szukaj">Wróć do wyszukiwarki</Link>
          <Link className="public-state-secondary" href="/">Przejdź na stronę główną</Link>
        </div>
      </section>
    </div>
  );
}
