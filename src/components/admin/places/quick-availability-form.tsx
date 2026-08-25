"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { confirmAccommodationAvailability, updateAccommodationAvailability } from "@/app/admin/(protected)/miejsca/actions";
import type { QuickAvailabilityActionState } from "@/types/place-admin";

type CapacityGroup = {
  id: string;
  label: string;
  totalBeds: number | null;
  availableBeds: number | null;
};

const initialState: QuickAvailabilityActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60">
      <Save aria-hidden="true" size={17} />
      {pending ? "Zapisywanie..." : "Zapisz dostępność"}
    </button>
  );
}

export function QuickAvailabilityForm({ placeId, groups }: { placeId: string; groups: CapacityGroup[] }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(groups.map((group) => [group.id, group.availableBeds?.toString() ?? ""])));
  const [state, formAction] = useActionState(updateAccommodationAvailability, initialState);
  const [confirmationState, confirmationAction] = useActionState(confirmAccommodationAvailability, initialState);
  const updates = groups.map((group) => ({
    id: group.id,
    availableBeds: values[group.id] === "" ? null : Number(values[group.id]),
  }));

  return (
    <form action={formAction} className="mt-4 rounded-lg border border-brand/30 bg-brand-soft/45 p-3 sm:p-4">
      <input type="hidden" name="placeId" value={placeId} />
      <input type="hidden" name="updates" value={JSON.stringify(updates)} />
      <div className="mb-3">
        <h3 className="text-sm font-bold">Aktualizacja dostępności</h3>
        <p className="mt-1 text-xs text-muted-foreground">Puste pole oznacza brak aktualnych danych, nie zero.</p>
      </div>
      <div className="space-y-2">
        {groups.map((group) => (
          <label key={group.id} className="grid min-h-11 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 sm:grid-cols-[minmax(0,1fr)_120px]">
            <span className="min-w-0 text-sm font-semibold">{group.label}<span className="ml-1 font-normal text-muted-foreground">/ {group.totalBeds ?? "?"} wszystkich</span></span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={group.totalBeds ?? 100000}
                inputMode="numeric"
                aria-label={`${group.label}: liczba wolnych miejsc`}
                className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                value={values[group.id] ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, [group.id]: event.target.value }))}
              />
              <span className="text-xs text-muted-foreground">wolnych</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          {state.error ? <p role="alert" className="text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
          {state.success ? <p role="status" className="text-sm font-semibold text-brand-strong">{state.success}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" formAction={confirmationAction} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-brand-strong hover:border-brand hover:bg-brand-soft disabled:opacity-60">
            Potwierdź bez zmian
          </button>
          <SubmitButton />
        </div>
      </div>
      {confirmationState.error ? <p role="alert" className="mt-2 text-sm font-semibold text-[#8c2d0c]">{confirmationState.error}</p> : null}
      {confirmationState.success ? <p role="status" className="mt-2 text-sm font-semibold text-brand-strong">{confirmationState.success}</p> : null}
    </form>
  );
}
