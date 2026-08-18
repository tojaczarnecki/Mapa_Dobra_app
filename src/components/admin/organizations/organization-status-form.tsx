"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Archive, RotateCcw } from "lucide-react";
import { setOrganizationActive } from "@/app/admin/(protected)/organizacje/actions";
import type { DirectoryActionState } from "@/types/admin-directory";

const initialState: DirectoryActionState = {};

function StatusButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  const Icon = active ? Archive : RotateCcw;
  return (
    <button disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold hover:bg-brand-soft disabled:opacity-60">
      <Icon aria-hidden="true" size={17} /> {pending ? "Zapisywanie…" : active ? "Archiwizuj" : "Przywróć"}
    </button>
  );
}

export function OrganizationStatusForm({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState(setOrganizationActive, initialState);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (active && !window.confirm("Zarchiwizować organizację? Nie będzie można wybrać jej dla nowych miejsc.")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <StatusButton active={active} />
      {state.error ? <p role="alert" className="mt-2 text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
      {state.success ? <p role="status" className="mt-2 text-sm font-semibold text-brand-strong">{state.success}</p> : null}
    </form>
  );
}
