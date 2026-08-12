"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Save } from "lucide-react";
import {
  publishSubmissionDraft,
  saveSubmissionDraft,
  type DraftActionState,
} from "@/app/admin/(protected)/zgloszenia/draft-actions";
import type { SubmissionDraftView } from "@/lib/admin/submission-drafts";

const initialState: DraftActionState = {};

function SubmitButton({ kind }: { kind: "save" | "publish" }) {
  const { pending } = useFormStatus();
  const Icon = kind === "save" ? Save : CheckCircle2;
  return (
    <button
      type="submit"
      disabled={pending}
      className={kind === "save"
        ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand bg-white px-4 py-2 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:opacity-55"
        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-55"}
    >
      <Icon aria-hidden="true" size={18} />
      {pending ? "Zapisywanie..." : kind === "save" ? "Zapisz wersję roboczą" : "Zatwierdź i opublikuj"}
    </button>
  );
}

export function SubmissionDraftEditor({
  draft,
  status,
}: {
  draft: SubmissionDraftView;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
}) {
  const router = useRouter();
  const [items, setItems] = useState(draft.items);
  const [saveState, saveAction] = useActionState(saveSubmissionDraft, initialState);
  const [publishState, publishAction] = useActionState(publishSubmissionDraft, initialState);
  const editable = status === "PENDING" || status === "UNDER_REVIEW";
  const payload = JSON.stringify(items.map(({ fieldKey, workingValue, decision }) => ({ fieldKey, workingValue, decision })));
  const included = useMemo(() => items.filter((item) => item.decision === "INCLUDE"), [items]);

  useEffect(() => {
    if (publishState.success) router.refresh();
  }, [publishState.success, router]);

  return (
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Wersja do publikacji</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Oryginalne zgłoszenie pozostaje niezmienione. Popraw wartości i wybierz, które pola mają zostać opublikowane.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold">{included.length} pól do publikacji</span>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <article key={item.fieldKey} className="overflow-hidden rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#f5f3ed] px-3 py-2">
              <h3 className="text-sm font-bold">{item.label}</h3>
              <select
                aria-label={`Decyzja: ${item.label}`}
                disabled={!editable}
                value={item.decision}
                onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, decision: event.target.value as typeof row.decision } : row))}
                className="min-h-11 rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
              >
                <option value="INCLUDE">Uwzględnij</option>
                <option value="REJECT">Pomiń</option>
                <option value="PENDING">Do decyzji</option>
              </select>
            </div>
            <div className="grid min-w-0 gap-0 lg:grid-cols-3">
              <ValueColumn label="Aktualne dane" value={item.currentValue || "Brak danych"} />
              <ValueColumn label="Zgłoszenie użytkownika" value={item.userValue || "Brak wartości"} emphasis />
              <label className="min-w-0 border-t border-border p-3 text-sm lg:border-l lg:border-t-0">
                <span className="mb-2 block text-xs font-bold uppercase text-brand-strong">Administrator ustala</span>
                <textarea
                  rows={Math.min(5, Math.max(2, item.workingValue.split("\n").length))}
                  maxLength={4000}
                  disabled={!editable || item.decision === "REJECT"}
                  value={item.workingValue}
                  onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, workingValue: event.target.value } : row))}
                  className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:bg-surface-muted disabled:text-muted-foreground"
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      {editable ? (
        <div className="mt-5 grid gap-4 border-t border-border pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold"><Eye aria-hidden="true" size={18} /> Podgląd zmian</div>
            {included.length ? (
              <ul className="space-y-2 text-sm">
                {included.map((item) => <li key={item.fieldKey}><strong>{item.label}:</strong> <span className="text-muted-foreground">{item.currentValue || "brak"}</span> → {item.workingValue || "usunięcie wartości"}</li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nie wybrano żadnego pola do publikacji.</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <form action={saveAction}>
              <input type="hidden" name="draftId" value={draft.id} />
              <input type="hidden" name="items" value={payload} />
              <SubmitButton kind="save" />
            </form>
            <form
              action={publishAction}
              onSubmit={(event) => {
                if (!window.confirm("Opublikować wybrane i skorygowane dane? Te zmiany będą widoczne w publicznej Mapie Dobra.")) event.preventDefault();
              }}
            >
              <input type="hidden" name="draftId" value={draft.id} />
              <input type="hidden" name="items" value={payload} />
              <label className="mb-2 block text-sm font-bold">
                <span className="mb-1 block">Notatka moderatora <span className="font-normal text-muted-foreground">(opcjonalnie)</span></span>
                <textarea name="note" maxLength={1000} rows={2} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
              </label>
              <SubmitButton kind="publish" />
            </form>
          </div>
        </div>
      ) : null}
      {saveState.error || publishState.error ? <p role="alert" className="mt-4 text-sm font-semibold text-[#8c2d0c]">{saveState.error ?? publishState.error}</p> : null}
      {saveState.success || publishState.success ? <p role="status" className="mt-4 text-sm font-semibold text-brand-strong">{saveState.success ?? publishState.success}</p> : null}
    </section>
  );
}

function ValueColumn({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 border-t border-border p-3 first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <p className={`text-xs font-bold uppercase ${emphasis ? "text-brand-strong" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{value}</p>
    </div>
  );
}
