import type { OpeningDay } from "@/data/demo-place-details";

export type OpeningHoursGroup = {
  days: OpeningDay[];
  label: string;
  isToday: boolean;
};

function scheduleKey(day: OpeningDay) {
  return JSON.stringify({
    status: day.status,
    periods: day.periods ?? [],
    note: day.note ?? "",
  });
}

export function groupOpeningDays(days: OpeningDay[]): OpeningHoursGroup[] {
  const groups: OpeningHoursGroup[] = [];

  for (const day of days) {
    const previous = groups.at(-1);
    if (previous && scheduleKey(previous.days[0]) === scheduleKey(day)) {
      previous.days.push(day);
      previous.label = `${previous.days[0].day}–${day.day.toLocaleLowerCase("pl-PL")}`;
      previous.isToday ||= Boolean(day.isToday);
      continue;
    }

    groups.push({
      days: [day],
      label: day.day,
      isToday: Boolean(day.isToday),
    });
  }

  return groups;
}
