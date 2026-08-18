"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { weekdayLabels } from "@/lib/places/opening-hours";
import type { AdminOpeningDay } from "@/types/place-admin";

export function VerificationOpeningHoursEditor({ initialDays }: { initialDays: AdminOpeningDay[] }) {
  const [days, setDays] = useState(initialDays);
  function updateDay(index: number, update: Partial<AdminOpeningDay>) {
    setDays((current) => current.map((day, currentIndex) => currentIndex === index ? { ...day, ...update } : day));
  }
  function nextPeriod(day: AdminOpeningDay) {
    const previousClose = day.periods.at(-1)?.closesAt;
    if (!previousClose) return { opensAt: "09:00", closesAt: "15:00" };
    const [hour, minute] = previousClose.split(":").map(Number);
    const opensAtMinutes = (hour * 60) + minute;
    if (opensAtMinutes >= (23 * 60) + 59) return { opensAt: "", closesAt: "" };
    const closesAtMinutes = Math.min(opensAtMinutes + 120, (23 * 60) + 59);
    return {
      opensAt: previousClose,
      closesAt: `${String(Math.floor(closesAtMinutes / 60)).padStart(2, "0")}:${String(closesAtMinutes % 60).padStart(2, "0")}`,
    };
  }
  return (
    <div className="space-y-2">
      <input type="hidden" name="openingHoursJson" value={JSON.stringify(days)} />
      {days.map((day, dayIndex) => <div key={day.weekday} className="grid gap-2 rounded-md border border-border p-2.5 lg:grid-cols-[130px_150px_minmax(0,1fr)] lg:items-start">
        <strong className="pt-2 text-sm">{weekdayLabels[day.weekday]}</strong>
        <select aria-label={`${weekdayLabels[day.weekday]} — status`} value={day.status} onChange={(event) => updateDay(dayIndex, { status: event.target.value as AdminOpeningDay["status"], periods: event.target.value === "OPEN" ? day.periods.length ? day.periods : [{ opensAt: "09:00", closesAt: "15:00" }] : [] })} className="min-h-11 rounded-lg border border-border bg-white px-2 text-sm focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/25">
          <option value="UNKNOWN">Brak danych</option><option value="OPEN">Otwarte</option><option value="CLOSED">Zamknięte</option>
        </select>
        {day.status === "OPEN" ? <div className="space-y-2">
          {day.periods.map((period, periodIndex) => <div key={`${day.weekday}-${periodIndex}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
            <input aria-label={`${weekdayLabels[day.weekday]} — otwarcie ${periodIndex + 1}`} type="time" value={period.opensAt} onChange={(event) => updateDay(dayIndex, { periods: day.periods.map((item, index) => index === periodIndex ? { ...item, opensAt: event.target.value } : item) })} className="min-h-11 min-w-0 rounded-lg border border-border px-2" />
            <input aria-label={`${weekdayLabels[day.weekday]} — zamknięcie ${periodIndex + 1}`} type="time" value={period.closesAt} onChange={(event) => updateDay(dayIndex, { periods: day.periods.map((item, index) => index === periodIndex ? { ...item, closesAt: event.target.value } : item) })} className="min-h-11 min-w-0 rounded-lg border border-border px-2" />
            <button type="button" aria-label={`Usuń przedział ${periodIndex + 1} dla: ${weekdayLabels[day.weekday]}`} onClick={() => updateDay(dayIndex, { periods: day.periods.filter((_, index) => index !== periodIndex) })} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border hover:bg-urgent-soft"><Trash2 aria-hidden="true" size={17} /></button>
          </div>)}
          <button type="button" onClick={() => updateDay(dayIndex, { periods: [...day.periods, nextPeriod(day)] })} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><Plus aria-hidden="true" size={17} />Dodaj przedział</button>
        </div> : <input aria-label={`${weekdayLabels[day.weekday]} — notatka`} value={day.note ?? ""} onChange={(event) => updateDay(dayIndex, { note: event.target.value })} placeholder={day.status === "UNKNOWN" ? "Np. po telefonicznym umówieniu" : "Opcjonalna notatka"} className="min-h-11 min-w-0 rounded-lg border border-border px-3 text-sm" />}
      </div>)}
    </div>
  );
}
