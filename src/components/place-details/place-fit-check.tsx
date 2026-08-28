"use client";

import { AlertTriangle, CheckCircle2, Phone, ShieldQuestion } from "lucide-react";
import { useMemo, useState } from "react";
import type { DetailListItem } from "@/data/demo-place-details";
import {
  evaluatePlaceFit,
  placeFitNeedOptions,
  placeFitSummary,
  type PlaceFitNeed,
} from "@/lib/places/fit-check";

export function PlaceFitCheck({
  requirements,
  phone,
}: {
  requirements: DetailListItem[];
  phone?: string;
}) {
  const [selected, setSelected] = useState<PlaceFitNeed[]>([]);
  const results = useMemo(() => evaluatePlaceFit(requirements, selected), [requirements, selected]);
  const summary = placeFitSummary(results);

  function toggle(value: PlaceFitNeed) {
    setSelected((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  const conflicts = results.filter((result) => result.state === "conflict");
  const unknown = results.filter((result) => result.state === "unknown");

  return (
    <details className="mt-3 rounded-lg border border-border bg-surface-muted/45">
      <summary className="touch-target flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-extrabold text-brand-strong">
        <ShieldQuestion aria-hidden="true" size={18} />
        Sprawdź, czy możesz skorzystać
      </summary>

      <div className="border-t border-border px-3 pb-3 pt-3">
        <p className="text-sm font-semibold leading-5 text-muted-foreground">
          Zaznacz tylko to, co ma znaczenie. Sprawdzimy to względem podanych warunków.
        </p>

        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {placeFitNeedOptions.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition ${checked ? "border-brand bg-brand-soft text-foreground" : "border-border bg-surface text-foreground hover:border-brand"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="h-4 w-4 accent-[var(--brand-strong)]"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>

        {summary !== "idle" ? (
          <div
            className={`mt-3 rounded-md border p-3 ${summary === "ok" ? "border-[#9ccac2] bg-[#f3faf8]" : "border-[#e5bd6c] bg-[#fffaf0]"}`}
            role="status"
          >
            {summary === "ok" ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={18} />
                <div>
                  <p className="text-sm font-extrabold text-foreground">Na podstawie dostępnych informacji możesz skorzystać z tej pomocy.</p>
                  <p className="mt-0.5 text-xs font-semibold leading-5 text-muted-foreground">To nie jest gwarancja przyjęcia, ale nie widzimy sprzeczności w podanych informacjach.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-[#b7791f]" size={18} />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-foreground">
                    {conflicts.length > 0 ? "Możesz skorzystać, jeśli spełniasz dodatkowy warunek." : "Nie mamy wystarczających danych, żeby odpowiedzieć jednoznacznie."}
                  </p>
                  {conflicts.length > 0 ? (
                    <ul className="mt-1 grid gap-1 text-xs font-semibold leading-5 text-muted-foreground">
                      {conflicts.map((item) => <li key={item.need}>• {item.source ?? item.label}</li>)}
                    </ul>
                  ) : null}
                  {unknown.length > 0 ? (
                    <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                      Wymaga potwierdzenia: {unknown.map((item) => item.label).join(", ")}.
                    </p>
                  ) : null}
                  {phone ? (
                    <a
                      href={`tel:${phone.replace(/\s+/gu, "")}`}
                      className="touch-target mt-2 inline-flex items-center gap-2 rounded-md border border-[#d9b364] bg-surface px-3 py-2 text-sm font-extrabold text-foreground"
                    >
                      <Phone aria-hidden="true" size={16} />
                      Zadzwoń i potwierdź
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </details>
  );
}
