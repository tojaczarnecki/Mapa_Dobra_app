import Link from "next/link";

export function NoResults({ clearHref = "/szukaj" }: { clearHref?: string }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold leading-tight text-foreground">
            Nie znaleźliśmy miejsc spełniających te kryteria.
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Zmień frazę lub wyczyść filtry, aby zobaczyć inne możliwości.
          </p>
        </div>
        <Link
          className="touch-target inline-flex w-full items-center justify-center rounded-lg bg-brand px-4 py-3 text-base font-bold text-foreground transition hover:bg-brand-strong hover:text-white sm:w-auto"
          href={clearHref}
        >
          Wyczyść filtry
        </Link>
      </div>
    </section>
  );
}
