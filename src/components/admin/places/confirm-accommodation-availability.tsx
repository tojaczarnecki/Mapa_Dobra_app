"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmAccommodationAvailability, type ConfirmAccommodationAvailabilityActionState } from "@/app/admin/(protected)/miejsca/actions";

const initialState: ConfirmAccommodationAvailabilityActionState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-lg border border-brand bg-white px-4 py-2 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Potwierdzam..." : "Potwierdź dane jako aktualne"}
    </button>
  );
}

function formatConfirmedAt(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Brak potwierdzenia";
}

export function ConfirmAccommodationAvailability({
  placeId,
  confirmedAt,
}: {
  placeId: string;
  confirmedAt: Date | null;
}) {
  const [state, action] = useActionState(confirmAccommodationAvailability.bind(null, placeId), initialState);
  const displayedConfirmedAt = state.confirmedAt ?? confirmedAt?.toISOString() ?? null;

  return (
    <form action={action} className="mt-4 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Ostatnio potwierdzono:</strong>{" "}
        {formatConfirmedAt(displayedConfirmedAt)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ConfirmButton />
        {state.error ? <p role="alert" className="text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
        {state.success ? <p role="status" className="text-sm font-semibold text-brand-strong">{state.success}</p> : null}
      </div>
    </form>
  );
}
