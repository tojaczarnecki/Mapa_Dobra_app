export const WARSAW_TIME_ZONE = "Europe/Warsaw";

export type PublicWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type PublicOpeningRow = {
  kind: "OPERATION" | "ADMISSION";
  weekday: PublicWeekday;
  status: "OPEN" | "CLOSED" | "UNKNOWN";
  opensAt: string | null;
  closesAt: string | null;
  note?: string | null;
  sortOrder?: number;
};

export type CurrentOpeningState = {
  status: "OPEN" | "CLOSED" | "UNKNOWN";
  weekday: PublicWeekday;
  isOpenNow: boolean | null;
  label: string;
  periods: string[];
};

const weekdayByEnglishName: Record<string, PublicWeekday> = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
};

function warsawParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WARSAW_TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    weekday: weekdayByEnglishName[values.weekday] ?? "MONDAY",
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

export function getWarsawWeekday(date = new Date()) {
  return warsawParts(date).weekday;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function evaluateCurrentOpening(
  rows: PublicOpeningRow[],
  kind: "OPERATION" | "ADMISSION",
  date = new Date(),
): CurrentOpeningState {
  const current = warsawParts(date);
  const todayRows = rows
    .filter((row) => row.kind === kind && row.weekday === current.weekday)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const first = todayRows[0];

  if (!first || first.status === "UNKNOWN") {
    return {
      status: "UNKNOWN",
      weekday: current.weekday,
      isOpenNow: null,
      label: first?.note || "Brak potwierdzonych godzin",
      periods: [],
    };
  }
  if (first.status === "CLOSED") {
    return {
      status: "CLOSED",
      weekday: current.weekday,
      isOpenNow: false,
      label: "Dzisiaj zamknięte",
      periods: [],
    };
  }

  const periods = todayRows
    .filter((row) => row.status === "OPEN" && row.opensAt && row.closesAt)
    .map((row) => ({
      label: `${row.opensAt}-${row.closesAt}`,
      opensAtLabel: row.opensAt!,
      closesAtLabel: row.closesAt!,
      opensAt: timeToMinutes(row.opensAt!),
      closesAt: timeToMinutes(row.closesAt!),
    }));
  if (!periods.length) {
    return {
      status: "UNKNOWN",
      weekday: current.weekday,
      isOpenNow: null,
      label: first.note || "Brak potwierdzonych godzin",
      periods: [],
    };
  }

  const currentPeriod = periods.find(
    (period) => current.minutes >= period.opensAt && current.minutes < period.closesAt,
  );
  const nextPeriod = periods.find((period) => current.minutes < period.opensAt);
  const isOpenNow = Boolean(currentPeriod);
  const label = currentPeriod
    ? `Otwarte teraz · do ${currentPeriod.closesAtLabel}`
    : nextPeriod
      ? `Dzisiaj · od ${nextPeriod.opensAtLabel}`
      : "Dzisiaj zamknięte";

  return {
    status: isOpenNow ? "OPEN" : "CLOSED",
    weekday: current.weekday,
    isOpenNow,
    label,
    periods: periods.map((period) => period.label),
  };
}
