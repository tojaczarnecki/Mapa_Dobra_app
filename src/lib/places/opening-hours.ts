import type { AdminOpeningDay, WeekdayValue } from "../../types/place-admin.ts";
import { getWarsawWeekday } from "./current-opening.ts";

export const orderedWeekdays: WeekdayValue[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const weekdayLabels: Record<WeekdayValue, string> = {
  MONDAY: "Poniedziałek",
  TUESDAY: "Wtorek",
  WEDNESDAY: "Środa",
  THURSDAY: "Czwartek",
  FRIDAY: "Piątek",
  SATURDAY: "Sobota",
  SUNDAY: "Niedziela",
};

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;

export type OpeningHoursValidation =
  | { ok: true; days: AdminOpeningDay[] }
  | { ok: false; error: string; weekday?: WeekdayValue };

export function emptyOpeningSchedule(): AdminOpeningDay[] {
  return orderedWeekdays.map((weekday) => ({
    weekday,
    status: "UNKNOWN",
    periods: [],
    note: "",
  }));
}

export function validateOpeningSchedule(value: unknown): OpeningHoursValidation {
  if (!Array.isArray(value) || value.length !== orderedWeekdays.length) {
    return { ok: false, error: "Godziny muszą zawierać dokładnie siedem dni tygodnia." };
  }

  const parsed: AdminOpeningDay[] = [];
  const seen = new Set<string>();
  for (const rawDay of value) {
    if (!rawDay || typeof rawDay !== "object" || Array.isArray(rawDay)) {
      return { ok: false, error: "Nie udało się odczytać jednego z dni tygodnia." };
    }
    const day = rawDay as Record<string, unknown>;
    const weekday = typeof day.weekday === "string" && orderedWeekdays.includes(day.weekday as WeekdayValue)
      ? day.weekday as WeekdayValue
      : null;
    if (!weekday || seen.has(weekday)) {
      return { ok: false, error: "Każdy dzień tygodnia może wystąpić tylko raz." };
    }
    seen.add(weekday);
    const label = weekdayLabels[weekday];
    const status = day.status;
    const note = typeof day.note === "string" && day.note.trim().length <= 240 ? day.note.trim() : null;
    if (!(["OPEN", "CLOSED", "UNKNOWN"] as const).includes(status as "OPEN") || note === null || !Array.isArray(day.periods)) {
      return { ok: false, error: `${label}: nieprawidłowy status lub notatka.`, weekday };
    }
    if (day.periods.length > 8) {
      return { ok: false, error: `${label}: można podać maksymalnie 8 przedziałów.`, weekday };
    }
    if (status !== "OPEN") {
      if (day.periods.length > 0) {
        return {
          ok: false,
          error: `${label}: status ${status === "CLOSED" ? "Zamknięte" : "Brak danych"} nie może zawierać aktywnych przedziałów.`,
          weekday,
        };
      }
      parsed.push({ weekday, status: status as "CLOSED" | "UNKNOWN", periods: [], note });
      continue;
    }
    if (day.periods.length === 0) {
      return { ok: false, error: `${label}: dla statusu Otwarte dodaj co najmniej jeden przedział.`, weekday };
    }

    const periods: AdminOpeningDay["periods"] = [];
    for (const rawPeriod of day.periods) {
      if (!rawPeriod || typeof rawPeriod !== "object" || Array.isArray(rawPeriod)) {
        return { ok: false, error: `${label}: nieprawidłowy przedział godzin.`, weekday };
      }
      const period = rawPeriod as Record<string, unknown>;
      const opensAt = typeof period.opensAt === "string" ? period.opensAt : "";
      const closesAt = typeof period.closesAt === "string" ? period.closesAt : "";
      if (!timePattern.test(opensAt) || !timePattern.test(closesAt)) {
        return { ok: false, error: `${label}: podaj pełną godzinę rozpoczęcia i zakończenia.`, weekday };
      }
      if (opensAt >= closesAt) {
        return { ok: false, error: `${label}: godzina rozpoczęcia musi być wcześniejsza niż zakończenia.`, weekday };
      }
      periods.push({ opensAt, closesAt });
    }
    periods.sort((left, right) => left.opensAt.localeCompare(right.opensAt) || left.closesAt.localeCompare(right.closesAt));
    for (let index = 1; index < periods.length; index += 1) {
      const previous = periods[index - 1];
      const current = periods[index];
      if (previous.opensAt === current.opensAt && previous.closesAt === current.closesAt) {
        return { ok: false, error: `${label}: przedział ${current.opensAt}-${current.closesAt} został dodany więcej niż raz.`, weekday };
      }
      if (current.opensAt < previous.closesAt) {
        return { ok: false, error: `${label}: przedziały ${previous.opensAt}-${previous.closesAt} i ${current.opensAt}-${current.closesAt} nakładają się.`, weekday };
      }
    }
    parsed.push({ weekday, status: "OPEN", periods, note });
  }

  parsed.sort((left, right) => orderedWeekdays.indexOf(left.weekday) - orderedWeekdays.indexOf(right.weekday));
  return { ok: true, days: parsed };
}

export function formatOpeningDay(day: AdminOpeningDay) {
  if (day.status === "CLOSED") return "Zamknięte";
  if (day.status === "UNKNOWN") return day.note || "Brak potwierdzonych godzin";
  return day.periods.map((period) => `${period.opensAt}-${period.closesAt}`).join(", ");
}

export function formatOpeningSchedule(days: AdminOpeningDay[]) {
  return days.map((day) => `${weekdayLabels[day.weekday]}: ${formatOpeningDay(day)}`).join("\n");
}

export function deriveTodayHoursLabel(days: AdminOpeningDay[], date = new Date()) {
  const weekday = getWarsawWeekday(date);
  const day = days.find((candidate) => candidate.weekday === weekday);
  return day ? formatOpeningDay(day) : "Brak potwierdzonych godzin";
}

export function openingRows(
  days: AdminOpeningDay[],
  kind: "OPERATION" | "ADMISSION",
) {
  type Row = {
    kind: "OPERATION" | "ADMISSION";
    weekday: WeekdayValue;
    status: "OPEN" | "CLOSED" | "UNKNOWN";
    opensAt: string | null;
    closesAt: string | null;
    note: string | null;
    sortOrder: number;
  };
  const rows: Row[] = [];
  for (const day of days) {
    if (day.status !== "OPEN") {
      rows.push({
        kind,
        weekday: day.weekday,
        status: day.status,
        opensAt: null,
        closesAt: null,
        note: day.note || null,
        sortOrder: 0,
      });
      continue;
    }
    day.periods.forEach((period, sortOrder) => rows.push({
        kind,
        weekday: day.weekday,
        status: "OPEN",
        opensAt: period.opensAt,
        closesAt: period.closesAt,
        note: day.note || null,
        sortOrder,
      }));
  }
  return rows;
}

export function scheduleFromRows(rows: Array<{
  kind: "OPERATION" | "ADMISSION";
  weekday: WeekdayValue;
  status: "OPEN" | "CLOSED" | "UNKNOWN";
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
  sortOrder: number;
}>, kind: "OPERATION" | "ADMISSION") {
  return orderedWeekdays.map((weekday): AdminOpeningDay => {
    const matches = rows
      .filter((row) => row.kind === kind && row.weekday === weekday)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const first = matches[0];
    if (!first) return { weekday, status: "UNKNOWN", periods: [], note: "" };
    if (first.status !== "OPEN") return { weekday, status: first.status, periods: [], note: first.note ?? "" };
    return {
      weekday,
      status: "OPEN",
      periods: matches.map((row) => ({ opensAt: row.opensAt ?? "", closesAt: row.closesAt ?? "" })),
      note: first.note ?? "",
    };
  });
}
