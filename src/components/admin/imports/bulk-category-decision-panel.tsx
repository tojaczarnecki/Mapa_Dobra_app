"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Layers, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveBulkCategoryDecision, type BulkCategoryDecisionActionState } from "@/app/admin/(protected)/importy/actions";
import type { BulkCategoryGroup } from "@/lib/imports/bulk-category-decision";

const initialState: BulkCategoryDecisionActionState = { ok: false, message: "" };

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60"><Save aria-hidden="true" size={17} />{pending ? "Zapisywanie…" : `Zastosuj do ${count} miejsc`}</button>;
}

export function BulkCategoryDecisionPanel({ batchId, groups }: { batchId: string; groups: BulkCategoryGroup[] }) {
  const router = useRouter();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [primaryByGroup, setPrimaryByGroup] = useState<Record<string, string>>({});
  const [state, action] = useActionState<BulkCategoryDecisionActionState, FormData>(async (_previous, formData) => saveBulkCategoryDecision(formData), initialState);
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state]);

  if (!groups.length) return null;
  return <section className="rounded-lg border border-border bg-white p-4 sm:p-5" aria-labelledby="bulk-category-decisions-heading">
    <div className="flex items-start gap-3"><Layers aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} /><div><h2 id="bulk-category-decisions-heading" className="text-lg font-bold">Grupowe decyzje kategorii</h2><p className="mt-1 text-sm text-muted-foreground">Zastosuj jedną decyzję głównej kategorii do miejsc z identycznym rozpoznanym zestawem.</p></div></div>
    <div className="mt-4 space-y-3">{groups.map((group) => {
      const key = group.categoryIds.join("|");
      const primary = primaryByGroup[key] ?? "";
      const confirming = activeGroup === key && Boolean(primary);
      return <article key={key} className="rounded-md border border-border bg-[#faf9f5] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{group.candidates.length} {group.candidates.length === 1 ? "miejsce" : "miejsca"}</h3><p className="mt-1 text-sm">Rozpoznane kategorie: {group.categories.map((category) => category.name).join(", ")}</p></div><span className="rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">Bez wybranej głównej</span></div>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-brand-strong">Pokaż miejsca</summary><ul className="space-y-1 pt-1 text-sm">{group.candidates.map((candidate) => <li key={candidate.id} className="border-t border-border py-2"><span className="font-semibold">{candidate.name}</span>{candidate.address ? <span className="block text-muted-foreground">{candidate.address}</span> : null}</li>)}</ul></details>
        <form action={action} className="mt-3 space-y-3 border-t border-border pt-3">
          <input type="hidden" name="batchId" value={batchId} /><input type="hidden" name="candidateIds" value={JSON.stringify(group.candidates.map((candidate) => candidate.id))} /><input type="hidden" name="selectedCategoryIds" value={JSON.stringify(group.categoryIds)} /><input type="hidden" name="primaryCategoryId" value={primary} />
          <fieldset><legend className="text-sm font-bold">Wybierz kategorię główną</legend><div className="mt-1 grid gap-1.5 sm:grid-cols-2">{group.categories.map((category) => <label key={category.id} className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-white px-2 text-sm font-semibold"><input type="radio" name={`primary-${key}`} value={category.id} checked={primary === category.id} onChange={() => setPrimaryByGroup((current) => ({ ...current, [key]: category.id }))} className="h-4 w-4" />{category.name}</label>)}</div></fieldset>
          {confirming ? <div className="rounded-md border border-brand/25 bg-brand-soft/30 p-3 text-sm"><p>Ustawisz „{group.categories.find((category) => category.id === primary)?.name}” jako kategorię główną dla {group.candidates.length} miejsc. Pozostałe rozpoznane kategorie zostaną zachowane jako dodatkowe.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setActiveGroup(null)} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-3 text-sm font-bold">Anuluj</button><SubmitButton count={group.candidates.length} /></div></div> : <button type="button" disabled={!primary} onClick={() => setActiveGroup(key)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong disabled:cursor-not-allowed disabled:opacity-50"><Check aria-hidden="true" size={17} />Zatwierdź wybór</button>}
          {state.message ? <p role={state.ok ? undefined : "alert"} className="text-sm font-semibold">{state.message}</p> : null}
        </form>
      </article>;
    })}</div>
  </section>;
}
