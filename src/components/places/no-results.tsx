export function NoResults() {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold leading-tight text-foreground">
            Nie znaleźliśmy miejsca spełniającego wszystkie warunki.
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Możemy pokazać najbliższe dostępne możliwości.
          </p>
        </div>
        <button
          className="touch-target inline-flex w-full items-center justify-center rounded-lg bg-brand px-4 py-3 text-base font-bold text-foreground transition hover:bg-brand-strong hover:text-white sm:w-auto"
          type="button"
        >
          Pokaż podobne miejsca
        </button>
      </div>
    </section>
  );
}
