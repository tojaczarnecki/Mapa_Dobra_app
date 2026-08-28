"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Check, FileInput, Search, Upload } from "lucide-react";
import { analyzeSpreadsheet, saveSpreadsheetAnalysis, uploadSpreadsheet, type ImportActionState, type PreviewRow } from "@/app/admin/(protected)/importy/actions";
import { getCanonicalFieldDefinitions, type SuggestedColumnMapping } from "@/lib/imports/column-mapping";

const definitions = getCanonicalFieldDefinitions();

const initialState: ImportActionState = { ok: false, message: "Wybierz plik CSV lub XLSX." };

function statusLabel(status: PreviewRow["status"]) {
  return status === "READY" ? "Gotowe" : status === "REVIEW" ? "Do sprawdzenia" : "Błąd";
}

function stateMessage(state: ImportActionState) {
  return state.ok ? null : state.message;
}

export default function ImportWizard() {
  const [state, setState] = useState<ImportActionState>(initialState);
  const [file, setFile] = useState<File | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [filter, setFilter] = useState<"ALL" | PreviewRow["status"]>("ALL");

  async function submit(action: (formData: FormData) => Promise<ImportActionState>, form: HTMLFormElement) {
    const formData = new FormData(form);
    if (file) formData.set("file", file);
    formData.set("sheetIndex", String(sheetIndex));
    if (Object.keys(mapping).length) formData.set("mapping", JSON.stringify(mapping));
    const nextState = await action(formData);
    if (!nextState.ok && nextState.code === "INVALID_MAPPING" && state.ok && state.phase === "MAPPING") {
      setState({ ...state, fieldErrors: nextState.fieldErrors });
      return;
    }
    setState(nextState);
    if (nextState.ok && nextState.phase === "MAPPING") {
      setSheetIndex(nextState.sheetIndex);
      applyMapping(nextState.suggestedMapping);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setState(initialState);
    setSheetIndex(0);
    setMapping({});
  }

  function applyMapping(next: SuggestedColumnMapping) {
    setMapping(Object.fromEntries(definitions.map((definition) => [definition.key, next.fields[definition.key]?.columnIndex ?? null])));
    setState((current) => current.ok && current.phase === "MAPPING" ? { ...current, fieldErrors: undefined } : current);
  }

  const mappingState = state.ok && state.phase === "MAPPING" ? state : null;
  const previewState = state.ok && state.phase === "PREVIEW" ? state : null;
  const visibleRows = previewState?.preview.filter((row) => filter === "ALL" || row.status === filter) ?? [];
  const message = stateMessage(state);

  return <section className="rounded-lg border border-border bg-white p-4 sm:p-6">
    <ol className="mb-6 grid gap-2 text-sm sm:grid-cols-4" aria-label="Etapy importu"><Step active={!mappingState && !previewState} label="Plik" /><Step active={Boolean(mappingState)} label="Arkusz i mapowanie" /><Step active={Boolean(previewState)} label="Analiza" /><Step active={false} label="Zapis" /></ol>
    {message ? <p role="alert" className="mb-4 rounded-md border border-urgent/30 bg-urgent-soft/40 p-3 text-sm font-semibold">{message}</p> : null}
    {!state.ok && state.batchId ? <Link href={`/admin/importy/${state.batchId}`} className="mb-4 inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Otwórz istniejącą paczkę</Link> : null}
    <form name="import-upload" onSubmit={(event) => { event.preventDefault(); void submit(uploadSpreadsheet, event.currentTarget); }} className="space-y-4">
      <label className="block text-sm font-semibold" htmlFor="import-file">Plik CSV lub XLSX<input id="import-file" name="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handleFile} required={!file} className="mt-2 block min-h-12 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></label>
      <p className="text-sm text-muted-foreground">Maksymalnie 5 MB, 2000 wierszy i 80 kolumn. Formuły i makra nie są wykonywane.</p>
      {mappingState ? <>
        {mappingState.sheets.length > 1 ? <div className="flex flex-wrap items-end gap-3"><label className="block min-w-0 flex-1 text-sm font-semibold" htmlFor="sheet-index">Arkusz<select id="sheet-index" value={sheetIndex} onChange={(event) => { setSheetIndex(Number(event.target.value)); setMapping({}); }} className="mt-2 block min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal">{mappingState.sheets.map((sheet) => <option key={sheet.index} value={sheet.index}>{sheet.name}</option>)}</select></label><button type="button" onClick={() => { const form = document.forms.namedItem("import-upload"); if (file && form) void submit(uploadSpreadsheet, form); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft"><FileInput aria-hidden="true" size={17} /> Wczytaj arkusz</button></div> : <p className="text-sm text-muted-foreground">Arkusz: <strong>{mappingState.sheetName}</strong></p>}
        <div className="grid gap-3">{definitions.map((definition) => <label key={definition.key} className="block text-sm font-semibold" htmlFor={`mapping-${definition.key}`}>{definition.label} {definition.required ? <span className="text-urgent">(wymagane)</span> : <span className="font-normal text-muted-foreground">(opcjonalne)</span>}<select id={`mapping-${definition.key}`} aria-required={definition.required} aria-invalid={Boolean(mappingState.fieldErrors?.[definition.key])} aria-describedby={mappingState.fieldErrors?.[definition.key] ? `mapping-error-${definition.key}` : "mapping-help"} value={mapping[definition.key] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [definition.key]: event.target.value === "" ? null : Number(event.target.value) })); setState((current) => current.ok && current.phase === "MAPPING" ? { ...current, fieldErrors: { ...current.fieldErrors, [definition.key]: undefined } } : current); }} className={`mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 py-2 font-normal ${mappingState.fieldErrors?.[definition.key] ? "border-urgent" : "border-border"}`}><option value="">Nie importuj</option>{mappingState.headers.map((header, index) => <option key={`${index}-${header}`} value={index}>{header}</option>)}</select>{mappingState.fieldErrors?.[definition.key] ? <span id={`mapping-error-${definition.key}`} className="mt-1 block text-xs font-semibold text-urgent">{mappingState.fieldErrors[definition.key]}</span> : null}</label>)}</div>
        <p id="mapping-help" className="text-xs text-muted-foreground">Sugestie mapowania są ustawiane automatycznie po wczytaniu arkusza. Wymagane: nazwa, adres i kategoria główna.</p>
        <button type="button" onClick={() => applyMapping(mappingState.suggestedMapping)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft"><Search aria-hidden="true" size={17} /> Zastosuj sugestie</button>
      </> : null}
      {!mappingState && !previewState ? <button type="submit" disabled={!file} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] disabled:opacity-50"><Upload aria-hidden="true" size={17} /> Wczytaj plik</button> : null}
    </form>
    {mappingState ? <form onSubmit={(event) => { event.preventDefault(); void submit(analyzeSpreadsheet, event.currentTarget); }} className="mt-4"><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e]"><Search aria-hidden="true" size={17} /> Analizuj dane</button></form> : null}
    {previewState ? <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-4"><Summary label="Wszystkie" value={previewState.counts.total} /><Summary label="Gotowe" value={previewState.counts.ready} /><Summary label="Do sprawdzenia" value={previewState.counts.review} /><Summary label="Błędy" value={previewState.counts.error} /></div><div className="flex gap-2 overflow-x-auto pb-1">{([["ALL", "Wszystkie"], ["READY", "Gotowe"], ["REVIEW", "Do sprawdzenia"], ["ERROR", "Błędy"]] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm font-bold ${filter === value ? "border-brand bg-brand-soft text-brand-strong" : "border-border bg-white"}`}>{label}</button>)}</div><div className="overflow-x-auto rounded-lg border border-border"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-[#faf9f5] text-xs uppercase text-muted-foreground"><tr><th className="p-3">Wiersz</th><th className="p-3">Nazwa</th><th className="p-3">Adres</th><th className="p-3">Kategoria</th><th className="p-3">Organizacja</th><th className="p-3">Status</th><th className="p-3">Problemy</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.rowNumber} className="border-t border-border align-top"><td className="p-3">{row.rowNumber}</td><td className="p-3 font-semibold">{row.name || "—"}</td><td className="p-3">{row.address || "—"}</td><td className="p-3">{row.category || "—"}</td><td className="p-3">{row.organization || "—"}</td><td className="p-3 font-bold">{statusLabel(row.status)}</td><td className="p-3">{row.problems.join(" · ") || "—"}</td></tr>)}</tbody></table></div><p className="text-xs text-muted-foreground">Pokazano maksymalnie 100 wierszy podglądu; analiza obejmuje cały arkusz.</p><form onSubmit={(event) => { event.preventDefault(); void submit(saveSpreadsheetAnalysis, event.currentTarget); }}><input type="hidden" name="mapping" value={JSON.stringify(previewState.mapping)} /><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e]"><Check aria-hidden="true" size={17} /> Zapisz analizę importu</button></form></div> : null}
  </section>;
}

function Step({ active, label }: { active: boolean; label: string }) { return <li className={`rounded-md border px-3 py-2 ${active ? "border-brand bg-brand-soft font-bold text-brand-strong" : "border-border text-muted-foreground"}`}>{label}</li>; }
function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-border bg-[#faf9f5] p-3"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }
