import { Clock3 } from "lucide-react";
import type {
  AccommodationAvailabilityDetails,
  CapacityGroupDetails,
} from "@/data/demo-place-details";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { DataFreshness } from "@/components/ui/data-freshness";
import { getAccommodationAvailabilityPresentation } from "@/lib/accommodations/presentation";

type AccommodationAvailabilityProps = {
  availability: AccommodationAvailabilityDetails;
  admissionsToday: string;
  capacityGroups: CapacityGroupDetails[];
  importantNote: string;
};

const availabilityConfig = {
  available: {
    className: "border-brand bg-brand-soft text-foreground",
    status: "confirmed" as const,
    statusLabel: "Są wolne miejsca",
  },
  few: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    status: "condition" as const,
    statusLabel: "Zostało niewiele miejsc",
  },
  full: {
    className: "border-border bg-surface-muted text-foreground",
    status: "absent" as const,
    statusLabel: "Brak miejsc",
  },
  unknown: {
    className: "border-border bg-surface-muted text-foreground",
    status: "unknown" as const,
    statusLabel: "Brak aktualnych danych",
  },
  stale: {
    className: "border-border bg-surface-muted text-foreground",
    status: "unknown" as const,
    statusLabel: "Ostatni raport może być nieaktualny",
  },
  suspended: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    status: "condition" as const,
    statusLabel: "Przyjęcia czasowo wstrzymane",
  },
} satisfies Record<
  AccommodationAvailabilityDetails["state"],
  {
    className: string;
    status: "confirmed" | "absent" | "unknown" | "condition";
    statusLabel: string;
  }
>;

const detailToAccommodationState = {
  available: "fresh",
  few: "few",
  full: "none",
  unknown: "unknown",
  stale: "stale",
  suspended: "suspended",
} as const;

function capacityLabel(group: CapacityGroupDetails) {
  const hasNumbers = typeof group.free === "number" && typeof group.total === "number";

  if (hasNumbers) {
    return `${group.free} wolne / ${group.total}`;
  }

  return group.note ?? "Brak aktualnych danych";
}

export function AccommodationAvailability({
  availability,
  admissionsToday,
  capacityGroups,
  importantNote,
}: AccommodationAvailabilityProps) {
  const config = {
    ...availabilityConfig[availability.state],
    status: getAccommodationAvailabilityPresentation(
      detailToAccommodationState[availability.state],
    ).status,
  };
  const freshnessKind = availability.freshness === "FRESH"
    ? "current"
    : availability.freshness === "UNKNOWN" || !availability.freshness
      ? "unknown"
      : "stale";

  return (
    <section
      className={[
        "w-full min-w-0 rounded-xl border p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5",
        config.className,
      ].join(" ")}
    >
      <div className="min-w-0 space-y-3">
        <p className="text-sm font-extrabold text-muted-foreground">
          Czy są wolne miejsca?
        </p>
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0">
            <StatusIndicator status={config.status} className="text-2xl font-extrabold leading-tight text-foreground">{availability.label}</StatusIndicator>
            <p className="mt-1 text-sm font-extrabold text-foreground">{config.statusLabel}</p>
          </div>
        </div>
        <p className="text-sm font-extrabold text-foreground">
          <DataFreshness kind={freshnessKind} className="text-sm font-extrabold text-foreground">{availability.confirmed}</DataFreshness>
        </p>
        {capacityGroups.length > 0 ? (
          <dl className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
            {capacityGroups.map((group) => (
              <div
                key={group.label}
                className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-sm first:border-t-0"
              >
                <dt className="min-w-0 font-extrabold text-foreground">
                  {group.label}
                </dt>
                <dd className="min-w-0 font-extrabold text-foreground">
                  {capacityLabel(group)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {availability.note ? (
          <p className="rounded-lg border border-urgent-border bg-surface px-3 py-2 text-sm font-semibold leading-6 text-foreground">
            {availability.note}
          </p>
        ) : null}
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <Clock3 aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
          <span className="min-w-0">{admissionsToday}</span>
        </p>
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold leading-6 text-muted-foreground">
          {importantNote}
        </p>
      </div>
    </section>
  );
}
