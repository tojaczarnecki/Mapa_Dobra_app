import { Clock3 } from "lucide-react";
import type { OpeningDay, PlaceStatusDetails } from "@/data/demo-place-details";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { InlineDisclosure } from "./inline-disclosure";

type OpeningHoursProps = { days: OpeningDay[]; status?: PlaceStatusDetails };

function hoursFallbackLabel(day: OpeningDay) {
  if (day.status === "closed") return "Nieczynne";
  return day.note ?? "Brak potwierdzonych godzin";
}

function dayLabel(day: OpeningDay) {
  if (day.status === "open" && day.periods?.length) return day.allDay ? "Całodobowo" : day.periods.join(", ");
  return hoursFallbackLabel(day);
}

function nextKnownOpening(days: OpeningDay[]) {
  const todayIndex = days.findIndex((day) => day.isToday);
  if (todayIndex < 0) return undefined;
  return Array.from({ length: days.length - 1 }, (_, offset) => ({
    day: days[(todayIndex + offset + 1) % days.length],
    offset: offset + 1,
  })).find(({ day }) => day.status === "open" && (day.allDay || Boolean(day.periods?.length)));
}

function closingTime(day?: OpeningDay) {
  const lastPeriod = day?.periods?.at(-1);
  if (!lastPeriod) return undefined;
  return lastPeriod.match(/[–-](\d{2}:\d{2})/u)?.[1];
}

function todaySummary(days: OpeningDay[], status?: PlaceStatusDetails) {
  const today = days.find((day) => day.isToday);
  if (!today) return { label: "Godziny otwarcia", detail: "Brak potwierdzonych godzin", state: "unknown" as const };
  if (today.status === "unknown") return { label: `Dziś · ${today.day}`, detail: hoursFallbackLabel(today), state: "unknown" as const };
  if (today.status === "closed") {
    const next = nextKnownOpening(days);
    const nextLabel = next?.offset === 1 ? "jutro" : next?.day.day.toLocaleLowerCase("pl-PL");
    return { label: `Dziś · ${today.day}`, detail: next ? `Nieczynne · następne otwarcie: ${nextLabel} ${dayLabel(next.day)}` : "Nieczynne", state: "absent" as const };
  }
  const close = closingTime(today);
  const isOpenNow = status?.tone === "open" || /otwarte teraz/iu.test(status?.todayHours ?? "");
  return { label: `Dziś · ${today.day}`, detail: today.allDay ? "Całodobowo" : today.periods?.join(", ") ?? "Brak potwierdzonych godzin", state: "confirmed" as const, suffix: isOpenNow && close ? `Otwarte teraz · do ${close}` : undefined };
}

function HoursValue({ day }: { day: OpeningDay }) {
  return day.status === "open" && day.periods?.length ? <>{dayLabel(day)}</> : <StatusIndicator status={day.status === "closed" ? "absent" : "unknown"}>{hoursFallbackLabel(day)}</StatusIndicator>;
}

export function OpeningHours({ days, status }: OpeningHoursProps) {
  const today = todaySummary(days, status);
  return (
    <div className="opening-hours-disclosure">
      <div className="opening-hours-summary">
        <span className="opening-hours-summary-copy">
          <span className="opening-hours-summary-title"><Clock3 aria-hidden="true" size={17} />{today.label}</span>
          <span className="opening-hours-summary-detail"><StatusIndicator status={today.state}>{today.detail}</StatusIndicator>{today.suffix ? <span className="opening-hours-now">{today.suffix}</span> : null}</span>
        </span>
      </div>
      <InlineDisclosure label="Pokaż cały tydzień" expandedLabel="Ukryj tydzień">
        <dl className="opening-hours-table">
          {days.map((day) => <div key={day.day} className={day.isToday ? "opening-hours-day opening-hours-day-today" : "opening-hours-day"}>
            <dt>{day.isToday ? <span className="opening-hours-today-dot" aria-hidden="true" /> : null}<span>{day.day}</span>{day.isToday ? <small>Dziś</small> : null}</dt>
            <dd><HoursValue day={day} /></dd>
          </div>)}
        </dl>
      </InlineDisclosure>
    </div>
  );
}
