"use client";

import { MapPinOff, RotateCcw } from "lucide-react";

type MapEmptyStateProps = {
  areaIsEmpty: boolean;
  onShowAllLodz: () => void;
  onClearFilters: () => void;
};

export function MapEmptyState({
  areaIsEmpty,
  onShowAllLodz,
  onClearFilters,
}: MapEmptyStateProps) {
  return (
    <section
      className="absolute left-1/2 top-1/2 z-[var(--layer-overlay)] w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-4 text-center shadow-[0_16px_38px_rgb(17_24_39_/_18%)]"
      aria-live="polite"
    >
      <MapPinOff aria-hidden="true" className="mx-auto mb-2 text-brand-strong" size={26} />
      <h2 className="text-base font-extrabold leading-6 text-foreground">
        Brak miejsc w tym obszarze.
      </h2>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        Zmień filtry lub przesuń mapę, aby zobaczyć inne możliwości.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {areaIsEmpty ? (
          <button
            type="button"
            className="touch-target rounded-lg bg-brand px-3 py-2 text-sm font-extrabold text-foreground hover:bg-brand-strong hover:text-white"
            onClick={onShowAllLodz}
          >
            Pokaż wszystkie w Łodzi
          </button>
        ) : null}
        <button
          type="button"
          className="touch-target inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-extrabold text-foreground hover:border-brand hover:bg-brand-soft"
          onClick={onClearFilters}
        >
          <RotateCcw aria-hidden="true" size={17} />
          Wyczyść filtry
        </button>
      </div>
    </section>
  );
}
