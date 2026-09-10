import Link from "next/link";
import { JourneyMotif } from "@/components/home/journey-motif";

type NoResultsProps = {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function NoResults({
  title = "Nie znaleźliśmy miejsc spełniających te kryteria.",
  description = "Spróbuj innej potrzeby albo poszerz zakres wyszukiwania.",
  primaryHref = "/szukaj",
  primaryLabel = "Wyczyść filtry",
  secondaryHref = "/szukam",
  secondaryLabel = "Wybierz inną potrzebę",
}: NoResultsProps) {
  return (
    <section className="editorial-empty-state editorial-empty-state-search" aria-live="polite">
      <JourneyMotif journey="search" />
      <div className="editorial-empty-state-copy">
        <p className="editorial-empty-state-eyebrow">BRAK WYNIKÓW</p>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="editorial-empty-state-actions">
          <Link className="editorial-empty-state-primary" href={primaryHref}>
            {primaryLabel}
          </Link>
          <Link className="editorial-empty-state-secondary" href={secondaryHref}>
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
