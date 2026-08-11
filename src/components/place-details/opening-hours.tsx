import { Clock3 } from "lucide-react";
import type { OpeningDay } from "@/data/demo-place-details";

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
  return (
    <dl className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
      {days.map((day) => (
        <div
          key={day.day}
          className={[
            "grid min-w-0 grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-3 border-t border-border px-3 py-2 text-sm first:border-t-0 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]",
            day.isToday ? "bg-brand-soft" : "bg-surface",
          ].join(" ")}
        >
          <dt className="flex min-w-0 flex-wrap items-center gap-2 font-extrabold text-foreground">
            {day.isToday ? (
              <Clock3 aria-hidden="true" size={16} className="shrink-0 text-brand-strong" />
            ) : null}
            <span className="min-w-0">{day.day}</span>
            {day.isToday ? (
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-extrabold text-brand-strong">
                Dziś
              </span>
            ) : null}
          </dt>
          <dd
            className={[
              "min-w-0 text-right font-semibold leading-6",
              day.status === "unknown" ? "text-muted-foreground" : "text-foreground",
            ].join(" ")}
          >
            <HoursValue day={day} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
