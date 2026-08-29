"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveDuplicateDecision } from "@/app/admin/(protected)/importy/actions";

type Decision = "KEEP_CURRENT" | "KEEP_OTHER" | "DIFFERENT_RECORDS";
type Duplicate = { id: string; rowNumber: number; name: string; address: string | null; phone: string | null; organization: string | null; category: string | null; decision: "KEEP_A" | "KEEP_B" | "DIFFERENT_RECORDS" | null; canonicalCurrent: boolean };

function SubmitButton({ decision, label }: { decision: Decision; label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="decision" value={decision} disabled={pending} className="min-h-11 rounded-lg border border-border px-3 text-sm font-bold hover:bg-brand-soft disabled:opacity-60">{pending ? "Zapisywanie..." : label}</button>;
}

function edgeLabel(duplicate: Duplicate) {
  if (duplicate.decision === "DIFFERENT_RECORDS") return "Potwierdzono, że to różne placówki";
  if (duplicate.decision && ((duplicate.decision === "KEEP_A") === duplicate.canonicalCurrent)) return "Ten wpis został wskazany do zachowania";
  if (duplicate.decision) return "Drugi wpis został wskazany do zachowania";
  return "Wymaga decyzji";
}

function DecisionForm({ candidateId, batchId, duplicate }: { candidateId: string; batchId: string; duplicate: Duplicate }) {
  const [state, action] = useActionState(async (_previous: { ok: boolean; message: string }, formData: FormData) => saveDuplicateDecision(formData), { ok: true, message: "" });
  return <>
    <form action={action} className="mt-3 flex flex-wrap gap-2">
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="duplicateCandidateId" value={duplicate.id} />
      <input type="hidden" name="batchId" value={batchId} />
      <SubmitButton decision="KEEP_CURRENT" label="To ten sam wpis — zachowaj ten" />
      <SubmitButton decision="KEEP_OTHER" label="To ten sam wpis — zachowaj drugi" />
      <SubmitButton decision="DIFFERENT_RECORDS" label="To różne placówki" />
    </form>
    {state.message ? <p className={`mt-2 text-sm font-semibold ${state.ok ? "text-brand-strong" : "text-urgent"}`} aria-live="polite">{state.message}</p> : null}
  </>;
}

export function DuplicateDecisionPanel({ candidateId, batchId, duplicates }: { candidateId: string; batchId: string; duplicates: Duplicate[] }) {
  if (!duplicates.length) return null;
  return <section className="mt-3 rounded-md border border-urgent/25 bg-urgent-soft/20 p-3" aria-labelledby={`duplicates-${candidateId}`}>
    <h3 id={`duplicates-${candidateId}`} className="font-bold">Możliwe duplikaty w tym pliku</h3>
    <div className="mt-2 space-y-3">
      {duplicates.map((duplicate) => <article key={duplicate.id} className="rounded-md border border-border bg-white p-3">
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div><dt className="font-bold">Wiersz</dt><dd>{duplicate.rowNumber}</dd></div>
          <div><dt className="font-bold">Nazwa</dt><dd>{duplicate.name}</dd></div>
          {duplicate.address ? <div><dt className="font-bold">Adres</dt><dd>{duplicate.address}</dd></div> : null}
          {duplicate.phone ? <div><dt className="font-bold">Telefon</dt><dd>{duplicate.phone}</dd></div> : null}
          {duplicate.organization ? <div><dt className="font-bold">Organizacja</dt><dd>{duplicate.organization}</dd></div> : null}
          {duplicate.category ? <div><dt className="font-bold">Kategoria</dt><dd>{duplicate.category}</dd></div> : null}
        </dl>
        <p className="mt-2 text-sm text-muted-foreground">{edgeLabel(duplicate)}</p>
        <DecisionForm candidateId={candidateId} batchId={batchId} duplicate={duplicate} />
      </article>)}
    </div>
  </section>;
}
