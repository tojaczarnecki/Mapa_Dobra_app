"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="public-state-page">
      <section className="public-state-content" role="alert">
        <AlertTriangle aria-hidden="true" className="public-state-icon public-state-icon-warning" size={36} />
        <h1>Coś poszło nie tak.</h1>
        <p>Spróbuj ponownie za chwilę. Jeśli problem się powtarza, wróć do strony głównej.</p>
        <div className="public-state-actions">
          <button type="button" className="public-state-primary" onClick={() => reset()}>Spróbuj ponownie</button>
          <Link className="public-state-secondary" href="/">Strona główna</Link>
        </div>
      </section>
    </div>
  );
}
