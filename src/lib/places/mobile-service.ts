export const MOBILE_WEEKDAY_LABELS = {
  MONDAY: "Poniedziałek",
  TUESDAY: "Wtorek",
  WEDNESDAY: "Środa",
  THURSDAY: "Czwartek",
  FRIDAY: "Piątek",
  SATURDAY: "Sobota",
  SUNDAY: "Niedziela",
} as const;

export type MobileWeekday = keyof typeof MOBILE_WEEKDAY_LABELS;

export type MobileSeasonRange = {
  active: boolean;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export type MobileScheduleInput = {
  weekday: MobileWeekday | string;
  allDay?: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
};

export function isAnnualDateInRange(
  date: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
) {
  const value = (date.getMonth() + 1) * 100 + date.getDate();
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;

  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

export function isMobileSeasonActive(season: MobileSeasonRange | null | undefined, date = new Date()) {
  if (!season) return true;
  if (!season.active) return false;

  return isAnnualDateInRange(
    date,
    season.startMonth,
    season.startDay,
    season.endMonth,
    season.endDay,
  );
}

export function mobileWeekdayLabel(weekday: string) {
  return MOBILE_WEEKDAY_LABELS[weekday as MobileWeekday] ?? weekday;
}

export function formatMobileSchedule(schedule: MobileScheduleInput) {
  const day = mobileWeekdayLabel(schedule.weekday);
  if (schedule.allDay) return `${day} · Całodobowo`;

  const time = schedule.opensAt && schedule.closesAt
    ? `${schedule.opensAt}–${schedule.closesAt}`
    : schedule.opensAt
      ? `od ${schedule.opensAt}`
      : schedule.closesAt
        ? `do ${schedule.closesAt}`
        : "Godzina wymaga potwierdzenia";

  return `${day} · ${time}`;
}
