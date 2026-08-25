import type { OpeningDay } from "@/data/demo-place-details";
import { groupOpeningDays } from "./opening-hours-groups";

export { groupOpeningDays } from "./opening-hours-groups";
export type { OpeningHoursGroup } from "./opening-hours-groups";

type OpeningHoursProps = {
  days: OpeningDay[];
};

function hoursFallbackLabel(day: OpeningDay) {
  if (day.status === "closed") {
    return "Zamknięte";
  }

  if (day.status === "unknown") {
    return day.note ?? "Brak potwierdzonych godzin";
  }

  return "Brak potwierdzonych godzin";
}

function HoursValue({ day }: { day: OpeningDay }) {
  if (day.status === "open" && day.periods?.length) {
    return (
    <div className="grid min-w-0 gap-0.5">
        {day.periods.map((period) => (
          <span key={period} className="min-w-0">
            {period}
          </span>
        ))}
      </div>
    );
  }

  return <span className="min-w-0">{hoursFallbackLabel(day)}</span>;
}

export function OpeningHours({ days }: OpeningHoursProps) {
  if (days.length === 0) {
    return (
      <p className="place-detail-hours-empty" role="status">
        Brak potwierdzonych godzin.
      </p>
    );
  }

  const groups = groupOpeningDays(days);

  return (
    <dl className="place-detail-hours">
      {groups.map((group) => {
        const day = group.days[0];
        return (
        <div
          key={group.label}
          className={[
            "place-detail-hour-row",
            group.isToday ? "place-detail-hour-row-today" : "",
          ].join(" ")}
        >
          <dt className="place-detail-hour-day">
            <span>{group.label}</span>
            {group.isToday ? (
              <span className="place-detail-today">
                Dziś
              </span>
            ) : null}
          </dt>
          <dd className="place-detail-hour-value">
            <HoursValue day={day} />
          </dd>
        </div>
        );
      })}
    </dl>
  );
}
