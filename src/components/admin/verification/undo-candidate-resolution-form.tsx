"use client";

import { useActionState } from "react";
import { undoCandidateResolution, type VerificationActionState } from "@/app/admin/(protected)/weryfikacja/actions";

export function UndoCandidateResolutionForm({ candidateId, resolution }: { candidateId: string; resolution: "SAME_PLACE" | "SKIPPED" }) {
  const [state, action, pending] = useActionState<VerificationActionState, FormData>(undoCandidateResolution.bind(null, candidateId), {});
  return (
    <form action={action} onSubmit={(event) => {
      if (!window.confirm("Czy na pewno chcesz ponownie skierować ten rekord do weryfikacji?")) event.preventDefault();
    }} className="mt-4">
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:opacity-60">{pending ? "Cofam decyzję..." : "Cofnij decyzję"}</button>
      <p className="mt-2 text-sm text-muted-foreground">Decyzja: {resolution === "SAME_PLACE" ? "To samo miejsce" : "Pominięto"}.</p>
      {state.error ? <p className="mt-2 text-sm font-semibold text-urgent">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm font-semibold text-brand-strong">{state.success}</p> : null}
    </form>
  );
}
