import { AlertTriangle, BadgeCheck, Ban, CircleHelp, CircleX, Clock3, Phone } from "lucide-react";
import type {
  AccommodationAvailabilityDetails,
  CapacityGroupDetails,
} from "@/data/demo-place-details";
import { telephoneHref } from "@/lib/places/actions";

type AccommodationAvailabilityProps = {
  availability: AccommodationAvailabilityDetails;
  admissionsToday: string;
  capacityGroups: CapacityGroupDetails[];
  importantNote: string;
  phone?: string;
};

const availabilityConfig = {
  available: {
    className: "",
    icon: BadgeCheck,
    statusLabel: "Są wolne miejsca",
    title: "Są wolne miejsca",
  },
  few: {
    className: "",
    icon: AlertTriangle,
    statusLabel: "Zostało niewiele miejsc",
    title: "Ostatnio zgłoszono niewiele miejsc",
  },
  full: {
    className: "",
    icon: CircleX,
    statusLabel: "Brak miejsc",
    title: "Brak zgłoszonych wolnych miejsc",
  },
  unknown: {
    className: "",
    icon: CircleHelp,
    statusLabel: "Brak aktualnych danych",
    title: "Brak aktualnych danych o wolnych miejscach",
  },
  stale: {
    className: "",
    icon: AlertTriangle,
    statusLabel: "Dane mogą być nieaktualne",
    title: "Brak aktualnych danych o wolnych miejscach",
  },
  suspended: {
    className: "",
    icon: Ban,
    statusLabel: "Przyjęcia czasowo wstrzymane",
    title: "Przyjęcia czasowo wstrzymane",
  },
} satisfies Record<
  AccommodationAvailabilityDetails["state"],
  {
    className: string;
    icon: typeof BadgeCheck;
    statusLabel: string;
    title: string;
  }
>;

function capacityLabel(group: CapacityGroupDetails) {
  const hasNumbers = typeof group.free === "number" && typeof group.total === "number";

  if (hasNumbers) {
    return `${group.free} miejsc`;
  }

  const reported = group.note?.match(/Ostatnio zgłoszono\s+(\d+)\s+wolnych miejsc/u);
  return reported ? `${reported[1]} miejsc` : "Brak aktualnych danych";
}

export function AccommodationAvailability({
  availability,
  admissionsToday,
  capacityGroups,
  importantNote,
  phone,
}: AccommodationAvailabilityProps) {
  const config = availabilityConfig[availability.state];
  const Icon = config.icon;
  const callHref = telephoneHref(phone);
  const updateLabel = availability.confirmed
    .replace(/^(?:Potwierdzone|Dane sprzed)\s*/u, "");
  const instruction = availability.state === "full"
    ? "Zadzwoń przed przyjazdem, żeby potwierdzić dostępność. Placówka może zaproponować inne rozwiązanie."
    : "Zadzwoń przed przyjazdem, żeby potwierdzić dostępność.";

  return (
    <section
      className="place-detail-availability"
    >
      <div className="min-w-0">
        <h2 className="place-detail-availability-heading">
          Czy są wolne miejsca?
        </h2>
        <div className="place-detail-availability-status">
          <Icon
            aria-hidden="true"
            size={24}
            className=""
            strokeWidth={2.4}
          />
          <div className="min-w-0">
            <p className="place-detail-availability-title">{config.title}</p>
            <p className="place-detail-availability-copy">Ostatnia aktualizacja: {updateLabel}</p>
          </div>
        </div>
        <p className="place-detail-availability-label">Ostatnio zgłoszono</p>
        {capacityGroups.length > 0 ? (
          <dl className="place-detail-availability-list">
            {capacityGroups.map((group) => (
              <div
                key={group.label}
                className="place-detail-info-row"
              >
                <dt className="place-detail-info-label">
                  {group.label}
                </dt>
                <dd className="place-detail-info-value">
                  {capacityLabel(group)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="place-detail-availability-hours">
          <Clock3 aria-hidden="true" size={18} />
          <span className="min-w-0">{admissionsToday}</span>
        </p>
        <p className="place-detail-availability-note">{instruction}</p>
        {availability.note && availability.state !== "full" ? <p className="place-detail-availability-note">{availability.note}</p> : null}
        {importantNote && availability.state !== "full" ? <p className="place-detail-availability-note">{importantNote}</p> : null}
        {callHref ? <a className="place-detail-availability-call" href={callHref}><Phone aria-hidden="true" size={18} />Zadzwoń</a> : null}
      </div>
    </section>
  );
}
