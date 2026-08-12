"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, RefreshCw, Save } from "lucide-react";
import {
  publishSubmissionDraft,
  rebaseSubmissionDraft,
  saveSubmissionDraft,
  type DraftActionState,
} from "@/app/admin/(protected)/zgloszenia/draft-actions";
import { OpeningEditor } from "@/components/admin/places/place-form";
import { useUnsavedChanges } from "@/components/admin/unsaved-changes";
import type { SubmissionDraftValue, SubmissionDraftView } from "@/lib/admin/submission-drafts";
import { formatOpeningSchedule, validateOpeningSchedule } from "@/lib/places/opening-hours";
import type { AdminOpeningDay } from "@/types/place-admin";

const initialState: DraftActionState = {};

function SubmitButton({ kind, approved }: { kind: "save" | "publish"; approved?: boolean }) {
  const { pending } = useFormStatus();
  const Icon = kind === "save" ? Save : CheckCircle2;
  return (
    <button type="submit" disabled={pending} className={kind === "save"
      ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand bg-white px-4 py-2 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:opacity-55"
      : "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-55"}
    >
      <Icon aria-hidden="true" size={18} />
      {pending ? "Zapisywanie..." : kind === "save" ? "Zapisz wersję roboczą" : approved ? "Opublikuj" : "Zatwierdź i opublikuj"}
    </button>
  );
}

function valueText(value: SubmissionDraftValue) {
  return typeof value === "string" ? value : formatOpeningSchedule(value);
}

export function SubmissionDraftEditor({
  draft,
  status,
  publicationStatus,
}: {
  draft: SubmissionDraftView;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  publicationStatus: "NOT_PUBLISHED" | "PUBLISHED";
}) {
  const router = useRouter();
  const [items, setItems] = useState(draft.items);
  const [dirty, setDirty] = useState(false);
  const [saveState, saveAction] = useActionState(saveSubmissionDraft, initialState);
  const [publishState, publishAction] = useActionState(publishSubmissionDraft, initialState);
  const editable = status !== "REJECTED" && publicationStatus === "NOT_PUBLISHED";
  const conflict = draft.hasConflict || Boolean(publishState.conflict);
  const payload = JSON.stringify(items.map(({ fieldKey, workingValue, decision }) => ({ fieldKey, workingValue, decision })));
  const included = useMemo(() => items.filter((item) => item.decision === "INCLUDE"), [items]);
  const hoursError = useMemo(() => {
    for (const item of included) {
      if (item.valueKind !== "opening-hours") continue;
      const validation = validateOpeningSchedule(item.workingValue);
      if (!validation.ok) return `${item.label}: ${validation.error}`;
    }
    return null;
  }, [included]);

  useUnsavedChanges(dirty);

  useEffect(() => {
    if (saveState.success || publishState.success || publishState.conflict) router.refresh();
  }, [publishState.conflict, publishState.success, router, saveState.success]);

  function changeItem(index: number, changes: Partial<(typeof items)[number]>) {
    setDirty(true);
    setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row));
  }

  return (
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Wersja do publikacji</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Oryginalne zgłoszenie pozostaje niezmienione. Popraw wartości i wybierz, które pola mają zostać opublikowane.</p>
        </div>
        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold">{included.length} pól do publikacji</span>
      </div>

      {conflict ? (
        <div role="alert" className="mt-4 rounded-lg border border-urgent/45 bg-urgent-soft p-4">
          <p className="font-bold text-[#8c2d0c]">Dane miejsca zmieniły się od czasu rozpoczęcia moderacji.</p>
          <p className="mt-1 text-sm leading-6">Twoje korekty i decyzje zostały zachowane. Porównaj aktualne dane ze snapshotem, a następnie zaktualizuj punkt bazowy.</p>
          <form action={rebaseSubmissionDraft} className="mt-3">
            <input type="hidden" name="draftId" value={draft.id} />
            <input type="hidden" name="items" value={payload} />
            <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#8c2d0c]/35 bg-white px-4 py-2 text-sm font-bold text-[#8c2d0c] hover:bg-[#fff9ea]">
              <RefreshCw aria-hidden="true" size={17} /> Zaktualizuj dane bazowe (rebase)
            </button>
          </form>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <article key={item.fieldKey} className="overflow-hidden rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#f5f3ed] px-3 py-2">
              <h3 className="text-sm font-bold">{item.label}</h3>
              <select aria-label={`Decyzja: ${item.label}`} disabled={!editable} value={item.decision}
                onChange={(event) => changeItem(index, { decision: event.target.value as typeof item.decision })}
                className="min-h-11 rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/25">
                <option value="INCLUDE">Uwzględnij</option>
                <option value="REJECT">Pomiń</option>
                <option value="PENDING">Do decyzji</option>
              </select>
            </div>
            <div className="grid min-w-0 gap-0 lg:grid-cols-3">
              <ValueColumn
                label="Aktualne dane miejsca"
                value={valueText(item.latestCurrentValue) || "Brak danych"}
                priorValue={conflict ? valueText(item.currentValue) || "Brak danych" : undefined}
              />
              <ValueColumn label="Oryginalne zgłoszenie" value={item.userValue || "Brak wartości"} emphasis />
              <div className="min-w-0 border-t border-border p-3 text-sm lg:border-l lg:border-t-0">
                <p className="mb-2 text-xs font-bold uppercase text-brand-strong">Wersja do publikacji</p>
                {item.valueKind === "opening-hours" ? (
                  <OpeningEditor label="Ułóż godziny" days={item.workingValue as AdminOpeningDay[]}
                    disabled={!editable || item.decision === "REJECT"}
                    onChange={(workingValue) => changeItem(index, { workingValue })} />
                ) : (
                  <textarea rows={Math.min(5, Math.max(2, (item.workingValue as string).split("\n").length))} maxLength={4000}
                    disabled={!editable || item.decision === "REJECT"} value={item.workingValue as string}
                    onChange={(event) => changeItem(index, { workingValue: event.target.value })}
                    className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:bg-surface-muted disabled:text-muted-foreground" />
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {editable ? (
        <div className="mt-5 grid gap-4 border-t border-border pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold"><Eye aria-hidden="true" size={18} /> Podgląd zmian</div>
            {included.length ? (
              <ul className="space-y-3 text-sm">
                {included.map((item) => (
                  <li key={item.fieldKey} className="rounded-lg bg-surface-muted px-3 py-2">
                    <strong>{item.label}</strong>
                    <span className="mt-1 grid gap-1 whitespace-pre-wrap text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                      <span>{valueText(item.latestCurrentValue) || "brak"}</span><span aria-hidden="true">→</span><span className="text-foreground">{valueText(item.workingValue) || "usunięcie wartości"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nie wybrano żadnego pola do publikacji.</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <form action={saveAction}><input type="hidden" name="draftId" value={draft.id} /><input type="hidden" name="items" value={payload} /><SubmitButton kind="save" /></form>
            <form action={publishAction} onSubmit={(event) => {
              if (hoursError) { event.preventDefault(); return; }
              if (!window.confirm("Opublikować wybrane i skorygowane dane? Te zmiany będą widoczne w publicznej Mapie Dobra.")) event.preventDefault();
            }}>
              <input type="hidden" name="draftId" value={draft.id} /><input type="hidden" name="items" value={payload} />
              <label className="mb-2 block text-sm font-bold"><span className="mb-1 block">Notatka moderatora <span className="font-normal text-muted-foreground">(opcjonalnie)</span></span><textarea name="note" maxLength={1000} rows={2} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" /></label>
              <SubmitButton kind="publish" approved={status === "APPROVED"} />
            </form>
          </div>
        </div>
      ) : null}
      {hoursError ? <p role="alert" className="mt-4 text-sm font-semibold text-[#8c2d0c]">{hoursError}</p> : null}
      {saveState.error || publishState.error ? <p role="alert" className="mt-4 text-sm font-semibold text-[#8c2d0c]">{saveState.error ?? publishState.error}</p> : null}
      {saveState.success || publishState.success ? <p role="status" className="mt-4 text-sm font-semibold text-brand-strong">{saveState.success ?? publishState.success}</p> : null}
    </section>
  );
}

function ValueColumn({ label, value, priorValue, emphasis = false }: { label: string; value: string; priorValue?: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 border-t border-border p-3 first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <p className={`text-xs font-bold uppercase ${emphasis ? "text-brand-strong" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{value}</p>
      {priorValue !== undefined && priorValue !== value ? (
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-xs font-bold text-muted-foreground">Snapshot przy rozpoczęciu</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{priorValue}</p>
        </div>
      ) : null}
    </div>
  );
}
