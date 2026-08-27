import Link from "next/link";
import {
  AlertTriangle,
  BedDouble,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import type { Accommodation, InformationState } from "@/data/demo-accommodations";
import { directionsHref, telephoneHref } from "@/lib/places/actions";

type AccommodationCardProps = {
  accommodation: Accommodation;
  isBestMatch?: boolean;
  unmetConditions?: string[];
  confirmationConditions?: string[];
};

function requirementLabel(state: InformationState, positive: string, negative: string, unknown: string) {
  if (state === "NO") return { label: positive, tone: "positive" as const };
  if (state === "YES") return { label: negative, tone: "warning" as const };
  return { label: unknown, tone: "unknown" as const };
}

function availabilityTone(state: Accommodation["availability"]["state"]) {
  if (state === "fresh") return "positive";
  if (state === "few") return "warning";
  if (state === "none" || state === "suspended") return "negative";
  return "unknown";
}

export function AccommodationCard({
  accommodation,
  isBestMatch = false,
  unmetConditions = [],
  confirmationConditions = [],
}: AccommodationCardProps) {
  const callHref = telephoneHref(accommodation.phone);
  const routeHref = directionsHref(accommodation);
  const referral = requirementLabel(accommodation.referralRequired, "Bez skierowania", "Wymaga skierowania", "Skierowanie: brak danych");
  const document = requirementLabel(accommodation.documentRequired, "Bez dokumentów", "Wymaga dokumentu", "Dokument: brak danych");
  const registration = requirementLabel(accommodation.lodzRegistrationRequired, "Meldunek niewymagany", "Wymaga meldunku w Łodzi", "Meldunek: brak danych");
  const availability = availabilityTone(accommodation.availability.state);

  return (
    <article className="md-night-card">
      <div className="md-night-card-head">
        <span className="md-night-card-icon"><BedDouble aria-hidden="true" size={20} /></span>
        <div className="md-night-card-title">
          {isBestMatch ? <span className="md-night-best">Najlepsze dopasowanie</span> : null}
          <h2>{accommodation.name}</h2>
          <p>{accommodation.typeLabel} · {accommodation.audienceLabel}</p>
        </div>
        <ChevronRight aria-hidden="true" className="md-night-card-chevron" size={18} />
      </div>

      <div className="md-night-card-status" data-tone={availability}>
        <span className="md-night-status-dot" aria-hidden="true" />
        <strong>{accommodation.availability.label}</strong>
        <span>{accommodation.availability.confirmed}</span>
      </div>

      <div className="md-night-card-meta">
        <span><Clock3 aria-hidden="true" size={15} />{accommodation.admissionsToday}</span>
        <span><MapPin aria-hidden="true" size={15} />{accommodation.distanceLabel}</span>
      </div>

      <div className="md-night-card-chips" aria-label="Najważniejsze warunki">
        {[registration, referral, document].map((item) => (
          <span key={item.label} className="md-night-rule-chip" data-tone={item.tone}>
            {item.tone === "positive" ? <Check aria-hidden="true" size={12} /> : item.tone === "warning" ? <AlertTriangle aria-hidden="true" size={12} /> : <CircleHelp aria-hidden="true" size={12} />}
            {item.label}
          </span>
        ))}
      </div>

      {accommodation.availability.note ? (
        <p className="md-night-card-note">{accommodation.availability.note}</p>
      ) : null}

      {unmetConditions.length > 0 ? (
        <div className="md-night-card-alert" data-tone="warning">
          <AlertTriangle aria-hidden="true" size={16} />
          <div>
            <strong>To miejsce może nie pasować</strong>
            <ul>{unmetConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
          </div>
        </div>
      ) : null}

      {confirmationConditions.length > 0 ? (
        <div className="md-night-card-alert" data-tone="unknown">
          <CircleHelp aria-hidden="true" size={16} />
          <div>
            <strong>Przed wyjściem potwierdź</strong>
            <ul>{confirmationConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
          </div>
        </div>
      ) : null}

      <div className="md-night-card-actions">
        {callHref ? (
          <a href={callHref}><Phone aria-hidden="true" size={16} />Zadzwoń</a>
        ) : (
          <span aria-disabled="true"><Phone aria-hidden="true" size={16} />Brak telefonu</span>
        )}
        {routeHref ? (
          <a href={routeHref} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" size={16} />Trasa</a>
        ) : (
          <span aria-disabled="true"><Navigation aria-hidden="true" size={16} />Brak trasy</span>
        )}
        <Link className="md-night-card-primary" href={`/lodz/${accommodation.categorySlug}/${accommodation.slug}`}>
          Szczegóły
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </article>
  );
}
