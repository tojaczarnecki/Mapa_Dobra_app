"use client";

import { useState } from "react";
import { saveImportMapping, stageImport } from "@/app/admin/(protected)/importy/actions";

const fields = [
  ["name", "Nazwa"], ["address", "Adres"], ["postalCode", "Kod pocztowy"], ["city", "Miasto"], ["phone", "Telefon"], ["email", "E-mail"], ["website", "WWW"], ["categories", "Kategorie"], ["organization", "Organizacja"], ["openingHours", "Godziny"], ["requirements", "Warunki"], ["description", "Opis"], ["accommodationType", "Typ noclegu"], ["capacity", "Liczba miejsc"],
] as const;
type Sheet = { name: string; headers: string[]; rows: string[][] };
type Props = { id: string; headers: string[]; rows: string[][]; sheets?: Sheet[]; initialSheet?: string | null; initialMapping: Record<string, string>; categories: Array<{ slug: string; name: string }>; organizations: Array<{ id: string; name: string }>; initialCategoryMapping: Record<string, string>; initialOrganizationMapping: Record<string, string> };

export function ImportMappingForm({ id, headers: initialHeaders, rows: initialRows, sheets = [], initialSheet, initialMapping, categories, organizations, initialCategoryMapping, initialOrganizationMapping }: Props) {
  const [sheetName, setSheetName] = useState(initialSheet ?? sheets[0]?.name ?? "");
  const activeSheet = sheets.find((sheet) => sheet.name === sheetName);
  const headers = activeSheet?.headers ?? initialHeaders;
  const rows = activeSheet?.rows ?? initialRows;
  const [mapping, setMapping] = useState(initialMapping);
  const [categoryMapping, setCategoryMapping] = useState(initialCategoryMapping);
  const [organizationMapping, setOrganizationMapping] = useState(initialOrganizationMapping);
  const categoryHeader = mapping.categories;
  const organizationHeader = mapping.organization;
  const column = (header: string) => headers.indexOf(header);
  const values = (header: string) => [...new Set(rows.map((row) => row[column(header)]?.trim()).filter(Boolean))] as string[];
  const categoryValues = categoryHeader ? values(categoryHeader) : [];
  const organizationValues = organizationHeader ? values(organizationHeader) : [];
  const valid = Boolean(mapping.name && mapping.address);
  const cell = (row: string[], field: string) => { const header = mapping[field]; return header ? row[headers.indexOf(header)] ?? "" : ""; };
  const summary = rows.reduce((result, row) => { const missing = !cell(row, "name").trim() || !cell(row, "address").trim(); return { ready: result.ready + (missing ? 0 : 1), review: result.review + (missing ? 1 : 0) }; }, { ready: 0, review: 0 });
  return <div className="space-y-5">
    <form action={saveImportMapping} className="space-y-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="sheetName" value={sheetName} />
      <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
      <input type="hidden" name="categoryMapping" value={JSON.stringify(categoryMapping)} />
      <input type="hidden" name="organizationMapping" value={JSON.stringify(organizationMapping)} />
      <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><h2 className="text-lg font-bold">Dopasuj kolumny</h2><p className="mt-1 text-sm text-muted-foreground">Automatyczne sugestie możesz poprawić. Do utworzenia kandydata wymagane są nazwa i adres.</p>{sheets.length > 1 ? <label className="mt-4 block max-w-sm text-sm font-semibold">Arkusz<select value={sheetName} onChange={(event) => { setSheetName(event.target.value); setMapping({}); setCategoryMapping({}); setOrganizationMapping({}); }} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal">{sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</select></label> : null}<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([field, label]) => <label key={field} className="text-sm font-semibold">{label}<select value={mapping[field] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Nie importuj</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div><div className="mt-5 grid gap-2 sm:grid-cols-3"><Summary label="Wiersze" value={rows.length} /><Summary label="Gotowe" value={summary.ready} /><Summary label="Do decyzji" value={summary.review} urgent={summary.review > 0} /></div><div className="mt-5 overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[620px] text-left text-sm"><caption className="sr-only">Podgląd pierwszych rekordów</caption><thead className="bg-[#faf9f5] text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2 font-bold">Wiersz</th>{headers.slice(0, 7).map((header) => <th key={header} className="px-3 py-2 font-bold">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 10).map((row, rowIndex) => <tr key={rowIndex} className="border-t border-border"><td className="px-3 py-2 text-xs text-muted-foreground">{rowIndex + 2}</td>{row.slice(0, 7).map((value, cellIndex) => <td key={cellIndex} className="max-w-52 truncate px-3 py-2">{value || "—"}</td>)}</tr>)}</tbody></table></div><button type="submit" disabled={!valid} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] disabled:cursor-not-allowed disabled:opacity-50">Zapisz mapowanie</button></section>
      {categoryValues.length ? <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><h2 className="text-lg font-bold">Mapowanie kategorii</h2><p className="mt-1 text-sm text-muted-foreground">Nieznane wartości pozostaną oznaczone do decyzji. Kategorie nie są tworzone automatycznie.</p><div className="mt-3 space-y-2">{categoryValues.map((value) => <label key={value} className="grid gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] sm:items-center"><span className="break-words">{value}</span><select value={categoryMapping[value] ?? ""} onChange={(event) => setCategoryMapping((current) => ({ ...current, [value]: event.target.value }))} className="min-h-11 rounded-lg border border-border bg-white px-3"><option value="">Do decyzji / pomiń</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>)}</div></section> : null}
      {organizationValues.length ? <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><h2 className="text-lg font-bold">Mapowanie organizacji</h2><p className="mt-1 text-sm text-muted-foreground">Dopasowanie jest jawne; niepewne wartości pozostaną do ręcznej decyzji.</p><div className="mt-3 space-y-2">{organizationValues.map((value) => <label key={value} className="grid gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] sm:items-center"><span className="break-words">{value}</span><select value={organizationMapping[value] ?? ""} onChange={(event) => setOrganizationMapping((current) => ({ ...current, [value]: event.target.value }))} className="min-h-11 rounded-lg border border-border bg-white px-3"><option value="">Do decyzji / bez przypisania</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>)}</div></section> : null}
    </form>
    <form action={stageImport} className="rounded-lg border border-brand/30 bg-brand-soft/35 p-4 sm:p-5"><input type="hidden" name="id" value={id} /><h2 className="text-lg font-bold">Walidacja i staging</h2><p className="mt-1 text-sm">Po uruchomieniu powstają kandydaci w kolejce weryfikacji. Żadne miejsce nie zostanie opublikowane automatycznie.</p><button type="submit" disabled={!valid} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] disabled:cursor-not-allowed disabled:opacity-50">Utwórz kandydatów do weryfikacji</button></form>
  </div>;
}

function Summary({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) { return <div className={`rounded-md border px-3 py-2 ${urgent ? "border-urgent/30 bg-urgent-soft/40" : "border-border bg-[#faf9f5]"}`}><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }
