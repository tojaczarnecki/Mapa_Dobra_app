import { Fragment } from "react";
import type {
  AccommodationAvailabilityDetails,
  CapacityGroupDetails,
} from "@/data/demo-place-details";

type AccommodationAvailabilityProps = {
  availability: AccommodationAvailabilityDetails;
  admissionsToday: string;
  capacityGroups: CapacityGroupDetails[];
  importantNote: string;
};

const availabilityConfig = {
  available: {
    className: "border-brand bg-brand-soft text-foreground",
  },
  few: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
  },
  full: {
    className: "border-border bg-surface-muted text-foreground",
  },
  unknown: {
    className: "border-border bg-surface-muted text-foreground",
  },
  stale: {
    className: "border-border bg-surface-muted text-foreground",
  },
  suspended: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
  },
} satisfies Record<AccommodationAvailabilityDetails["state"], { className: string }>;

function capacityLabel(group: CapacityGroupDetails) {
  const hasNumbers = typeof group.free === "number" && typeof group.total === "number";

  if (hasNumbers) {
    return `${group.free} wolne / ${group.total}`;
  }

  return group.note ?? "Brak aktualnych danych";
}

function capacityGroupLabel(group: CapacityGroupDetails) {
  return /^\d+$/.test(group.label.trim()) ? "Pojemność placówki" : group.label;
}

function capacityGroupValue(group: CapacityGroupDetails) {
  if (/^\d+$/.test(group.label.trim()) && typeof group.total === "number") {
    return String(group.total);
  }

  return capacityLabel(group);
}

function decisionLabel(state: AccommodationAvailabilityDetails["state"]) {
  if (state === "available" || state === "few") return "Potwierdzone w ostatnim raporcie";
  if (state === "full") return "Brak miejsc w ostatnim raporcie";
  if (state === "suspended") return "Przyjęcia są czasowo wstrzymane";
  return "Wymaga potwierdzenia telefonicznego";
}

export function AccommodationAvailability({
  availability,
  admissionsToday,
  capacityGroups,
  importantNote,
}: AccommodationAvailabilityProps) {
  const config = availabilityConfig[availability.state];

  return (
    <section
      className={[
        "place-detail-availability w-full min-w-0 p-4 sm:p-5",
        config.className,
      ].join(" ")}
    >
      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Dostępność noclegu</p>
          <h2 className="mt-1 text-xl font-extrabold leading-tight text-foreground">{decisionLabel(availability.state)}</h2>
        </div>
        {capacityGroups.length > 0 ? (
          <dl className="place-detail-availability-facts min-w-0">
            {capacityGroups.map((group) => (
              <Fragment key={group.label}>
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border py-2 text-sm first:border-t-0">
                  <dt className="min-w-0 font-semibold text-muted-foreground">
                    {capacityGroupLabel(group)}
                  </dt>
                  <dd className="min-w-0 font-extrabold text-foreground">
                    {capacityGroupValue(group)}
                  </dd>
                </div>
                {group.note && typeof group.total === "number" ? (
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border py-2 text-sm">
                    <dt className="min-w-0 font-semibold text-muted-foreground">Ostatnio zgłoszono</dt>
                    <dd className="min-w-0 font-extrabold text-foreground">{group.note.replace(/^Ostatnio zgłoszono\s*/iu, "")}</dd>
                  </div>
                ) : null}
              </Fragment>
            ))}
          </dl>
        ) : null}
        <p className="text-sm font-semibold leading-6 text-foreground">
          Liczba wolnych miejsc mogła się zmienić. Zadzwoń przed przyjazdem.
        </p>
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted-foreground">
          <span>{availability.confirmed}</span>
          {/brak potwierdzonych|brak przyjęć/iu.test(admissionsToday) ? <span>Godziny przyjęć niepotwierdzone</span> : <span>{admissionsToday}</span>}
        </div>
        {importantNote ? <p className="text-sm leading-6 text-muted-foreground">{importantNote}</p> : null}
      </div>
    </section>
  );
}
