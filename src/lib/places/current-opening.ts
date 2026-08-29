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
  allDay?: boolean;
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
  closesInMinutes?: number;
  opensInMinutes?: number;
  nextOpeningLabel?: string;
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

const weekdays: PublicWeekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const weekdayFutureLabels: Record<PublicWeekday, string> = {
  MONDAY: "W poniedziałek",
  TUESDAY: "We wtorek",
  WEDNESDAY: "W środę",
  THURSDAY: "W czwartek",
  FRIDAY: "W piątek",
  SATURDAY: "W sobotę",
  SUNDAY: "W niedzielę",
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

function openingPeriods(rows: PublicOpeningRow[], kind: "OPERATION" | "ADMISSION", weekday: PublicWeekday) {
  return rows
    .filter(
      (row) =>
        row.kind === kind &&
        row.weekday === weekday &&
        row.status === "OPEN" &&
        row.opensAt &&
        row.closesAt,
    )
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .map((row) => ({
      label: `${row.opensAt}-${row.closesAt}`,
      opensAtLabel: row.opensAt!,
      closesAtLabel: row.closesAt!,
      opensAt: timeToMinutes(row.opensAt!),
      closesAt: timeToMinutes(row.closesAt!),
    }));
}

function findNextOpening(
  rows: PublicOpeningRow[],
  kind: "OPERATION" | "ADMISSION",
  currentWeekday: PublicWeekday,
) {
  const currentIndex = weekdays.indexOf(currentWeekday);

  for (let offset = 1; offset <= 7; offset += 1) {
    const weekday = weekdays[(currentIndex + offset) % weekdays.length];
    const period = openingPeriods(rows, kind, weekday)[0];
    if (!period) continue;

    return {
      offset,
      label: `${offset === 1 ? "Jutro" : weekdayFutureLabels[weekday]} · od ${period.opensAtLabel}`,
    };
  }

  return undefined;
}

function closingSoonLabel(kind: "OPERATION" | "ADMISSION", minutes: number, closesAt: string) {
  if (kind === "ADMISSION") return `Przyjęcia kończą się za ${minutes} min · do ${closesAt}`;
  return `Otwarte jeszcze ${minutes} min · do ${closesAt}`;
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

  const nextOpening = findNextOpening(rows, kind, current.weekday);

  if (first.status === "CLOSED") {
    return {
      status: "CLOSED",
      weekday: current.weekday,
      isOpenNow: false,
      label: nextOpening ? `Dzisiaj zamknięte · ${nextOpening.label.toLocaleLowerCase("pl-PL")}` : "Dzisiaj zamknięte",
      periods: [],
      nextOpeningLabel: nextOpening?.label,
    };
  }

  if (first.allDay) {
    return {
      status: "OPEN",
      weekday: current.weekday,
      isOpenNow: true,
      label: "Całodobowo",
      periods: ["Całodobowo"],
    };
  }

  const periods = openingPeriods(rows, kind, current.weekday);
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

  if (currentPeriod) {
    const closesInMinutes = Math.max(1, currentPeriod.closesAt - current.minutes);
    const label = closesInMinutes <= 60
      ? closingSoonLabel(kind, closesInMinutes, currentPeriod.closesAtLabel)
      : `Otwarte teraz · do ${currentPeriod.closesAtLabel}`;

    return {
      status: "OPEN",
      weekday: current.weekday,
      isOpenNow: true,
      label,
      periods: periods.map((period) => period.label),
      closesInMinutes,
    };
  }

  if (nextPeriod) {
    return {
      status: "CLOSED",
      weekday: current.weekday,
      isOpenNow: false,
      label: `Dzisiaj · od ${nextPeriod.opensAtLabel}`,
      periods: periods.map((period) => period.label),
      opensInMinutes: Math.max(1, nextPeriod.opensAt - current.minutes),
    };
  }

  return {
    status: "CLOSED",
    weekday: current.weekday,
    isOpenNow: false,
    label: nextOpening?.label ?? "Dzisiaj zamknięte",
    periods: periods.map((period) => period.label),
    nextOpeningLabel: nextOpening?.label,
  };
}
