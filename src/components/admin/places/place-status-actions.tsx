"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Archive, CirclePause, CircleStop, Eye, FilePenLine } from "lucide-react";
import { changePlaceStatus } from "@/app/admin/(protected)/miejsca/actions";
import type {
  PlaceFormActionState,
  PlacePublicationStatusValue,
} from "@/types/place-admin";

const initialState: PlaceFormActionState = {};

const actions: Array<{
  status: PlacePublicationStatusValue;
  label: string;
  icon: typeof Eye;
  className: string;
  confirmation?: string;
}> = [
  {
    status: "PUBLISHED",
    label: "Opublikuj",
    icon: Eye,
    className: "bg-brand text-[#10231e] hover:bg-brand-strong hover:text-white",
    confirmation: "Opublikować to miejsce w Mapie Dobra?",
  },
  {
    status: "DRAFT",
    label: "Zapisz jako szkic",
    icon: FilePenLine,
    className: "border border-border bg-white hover:bg-surface-muted",
  },
  {
    status: "TEMPORARILY_CLOSED",
    label: "Czasowo zamknięte",
    icon: CirclePause,
    className: "border border-urgent/40 bg-urgent-soft text-[#8c2d0c]",
    confirmation: "Oznaczyć miejsce jako czasowo zamknięte?",
  },
  {
    status: "PERMANENTLY_CLOSED",
    label: "Zamknięte na stałe",
    icon: CircleStop,
    className: "border border-[#1d1d1b]/30 bg-white",
    confirmation: "Oznaczyć miejsce jako zamknięte na stałe? Ta informacja będzie widoczna publicznie.",
  },
  {
    status: "ARCHIVED",
    label: "Archiwizuj",
    icon: Archive,
    className: "border border-border bg-white text-muted-foreground hover:text-foreground",
    confirmation: "Zarchiwizować miejsce? Zniknie z publicznych wyników.",
  },
];

function SubmitButton({ action }: { action: (typeof actions)[number] }) {
  const { pending } = useFormStatus();
  const Icon = action.icon;
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-wait disabled:opacity-55 ${action.className}`}
    >
      <Icon aria-hidden="true" size={17} />
      {pending ? "Zapisywanie..." : action.label}
    </button>
  );
}

export function PlaceStatusActions({
  placeId,
  currentStatus,
}: {
  placeId: string;
  currentStatus: PlacePublicationStatusValue;
}) {
  const [state, formAction] = useActionState(changePlaceStatus, initialState);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {actions
          .filter((action) => action.status !== currentStatus)
          .map((action) => (
            <form
              key={action.status}
              action={formAction}
              onSubmit={(event) => {
                if (action.confirmation && !window.confirm(action.confirmation)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="placeId" value={placeId} />
              <input type="hidden" name="status" value={action.status} />
              <SubmitButton action={action} />
            </form>
          ))}
      </div>
      {state.error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-[#8c2d0c]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-3 text-sm font-semibold text-brand-strong">{state.success}</p>
      ) : null}
    </div>
  );
}
