import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-xl border border-border bg-surface p-6 text-center shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
        <SearchX aria-hidden="true" className="mx-auto text-brand-strong" size={36} />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Nie znaleźliśmy tego miejsca.</h1>
        <p className="mt-2 text-base leading-7 text-muted-foreground">Link mógł się zmienić albo miejsce nie jest obecnie dostępne publicznie.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link className="touch-target inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 font-extrabold text-foreground hover:bg-brand-strong hover:text-white" href="/szukaj">Wróć do wyszukiwarki</Link>
          <Link className="touch-target inline-flex items-center justify-center rounded-lg border border-border bg-surface px-5 py-3 font-extrabold text-foreground hover:bg-surface-muted" href="/">Przejdź na stronę główną</Link>
        </div>
      </section>
    </div>
  );
}
