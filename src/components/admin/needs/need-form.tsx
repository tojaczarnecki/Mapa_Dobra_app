"use client";

import { useActionState, useRef, useState } from "react";
import { createNeed, createNeedForOrganization, updateNeed, type NeedActionState } from "@/app/admin/(protected)/moje-miejsca/needs-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type GlobalOrganization = { id: string; name: string; places: Array<{ id: string; name: string; addressLine: string }> };
type NeedFormProps = { placeId: string | null; need?: { id: string; title: string; description: string; peopleNeeded: number; startsAt: Date; endsAt: Date; experienceRequired: boolean; requirements: string | null; locationNote: string | null; status: string }; globalOrganizations?: GlobalOrganization[] };
const initialState: NeedActionState = {};
const localDate = (value?: Date) => value ? new Date(value).toISOString().slice(0, 16) : "";

export function NeedForm({ placeId, need, globalOrganizations }: NeedFormProps) {
  const isGlobalCreate = !need && Boolean(globalOrganizations);
  const existingNeed = need as NeedFormProps["need"];
  const action = need ? updateNeed.bind(null, need.id, placeId) : isGlobalCreate ? createNeedForOrganization : createNeed.bind(null, placeId as string);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [organizationId, setOrganizationId] = useState("");
  const [organizationQuery, setOrganizationQuery] = useState("");
  const [activeOrganizationIndex, setActiveOrganizationIndex] = useState(-1);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSummary, setPublishSummary] = useState<{ organization: string; place: string; title: string; startsAt: string; peopleNeeded: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const selectedOrganization = globalOrganizations?.find((organization) => organization.id === organizationId);
  const filteredOrganizations = (globalOrganizations ?? []).filter((organization) => organization.name.toLocaleLowerCase().includes(organizationQuery.trim().toLocaleLowerCase())).slice(0, 8);
  const selectOrganization = (organization: GlobalOrganization) => { setOrganizationId(organization.id); setOrganizationQuery(""); setActiveOrganizationIndex(-1); };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isGlobalCreate) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (!(submitter instanceof HTMLButtonElement) || submitter.value !== "PUBLISHED") return;
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("status", "PUBLISHED");
    setPublishSummary({
      organization: selectedOrganization?.name ?? "Nie wybrano",
      place: (formData.get("placeId") as string) ? selectedOrganization?.places.find((place) => place.id === formData.get("placeId"))?.name ?? "Wybrana placówka" : "Cała organizacja",
      title: String(formData.get("title") || "Nie podano"),
      startsAt: String(formData.get("startsAt") || "Nie podano"),
      peopleNeeded: String(formData.get("peopleNeeded") || "Nie podano"),
    });
    formRef.current = event.currentTarget;
    setPublishOpen(true);
  };
  if (!need && !placeId && !isGlobalCreate) return null;
  return <>
  <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="grid min-w-0 max-w-full gap-3 border-t border-border pt-4">
    {isGlobalCreate ? <h2 className="border-b border-border pb-1 text-base font-bold">Gdzie</h2> : null}
    {isGlobalCreate ? <>
      <label className="grid min-w-0 gap-1 text-sm font-bold">Organizacja<input type="text" role="combobox" aria-autocomplete="list" aria-controls="admin-need-organizations" aria-expanded={Boolean(organizationQuery && !selectedOrganization)} value={selectedOrganization?.name ?? organizationQuery} onChange={(event) => { setOrganizationId(""); setOrganizationQuery(event.target.value); setActiveOrganizationIndex(0); }} onKeyDown={(event) => { if (!filteredOrganizations.length) return; if (event.key === "ArrowDown") { event.preventDefault(); setActiveOrganizationIndex((index) => Math.min(index + 1, filteredOrganizations.length - 1)); } else if (event.key === "ArrowUp") { event.preventDefault(); setActiveOrganizationIndex((index) => Math.max(index - 1, 0)); } else if (event.key === "Enter" && activeOrganizationIndex >= 0) { event.preventDefault(); selectOrganization(filteredOrganizations[activeOrganizationIndex]); } else if (event.key === "Escape") { setOrganizationQuery(""); setActiveOrganizationIndex(-1); } }} placeholder="Szukaj organizacji..." className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" />{organizationQuery && !selectedOrganization ? <div id="admin-need-organizations" role="listbox" className="max-h-56 min-w-0 max-w-full overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-white p-1">{filteredOrganizations.length ? filteredOrganizations.map((organization, index) => <button type="button" role="option" aria-selected={index === activeOrganizationIndex} key={organization.id} onClick={() => selectOrganization(organization)} className={`flex min-h-11 min-w-0 w-full max-w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${index === activeOrganizationIndex ? "bg-brand-soft" : "hover:bg-brand-soft"}`}><span className="min-w-0 truncate font-bold">{organization.name}</span><span className="shrink-0 text-xs text-muted-foreground">{organization.places.length} {organization.places.length === 1 ? "placówka" : organization.places.length < 5 ? "placówki" : "placówek"}</span></button>) : <p className="p-3 text-sm text-muted-foreground">Nie znaleziono organizacji.</p>}</div> : null}</label>
      <label className="grid min-w-0 gap-1 text-sm font-bold">Placówka<select key={selectedOrganization?.id ?? "none"} name="placeId" disabled={!selectedOrganization} defaultValue="" className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">{selectedOrganization ? "Brak konkretnej placówki — potrzeba organizacji" : "Najpierw wybierz organizację"}</option>{selectedOrganization?.places.map((place) => <option key={place.id} value={place.id}>{place.name} · {place.addressLine}</option>)}</select></label>
      <input type="hidden" name="organizationId" value={organizationId} />
    </> : null}
    {isGlobalCreate ? <h2 className="border-t border-border pt-4 text-base font-bold">Czego potrzebujecie</h2> : null}
    <label className="grid min-w-0 gap-1 text-sm font-bold">Do czego potrzebujecie pomocy?<input name="title" required maxLength={180} defaultValue={need?.title} placeholder="Pomoc przy wydawaniu kolacji" className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label>
    <label className="grid min-w-0 gap-1 text-sm font-bold">Krótki opis<textarea name="description" required maxLength={1000} defaultValue={need?.description} rows={2} className="min-h-0 min-w-0 w-full max-w-full rounded-lg border border-border px-3 py-2 font-normal" /></label>
    {isGlobalCreate ? <>
      <label className="grid min-w-0 gap-1 text-sm font-bold">Ilu osób potrzebujecie?<input name="peopleNeeded" required min={1} max={1000} type="number" defaultValue={existingNeed?.peopleNeeded ?? 1} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label>
      <label className="grid min-w-0 gap-1 text-sm font-bold">Wymagane doświadczenie?<select name="experienceRequired" defaultValue={existingNeed?.experienceRequired ? "true" : "false"} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="false">Nie</option><option value="true">Tak</option></select></label>
    </> : <div className="grid min-w-0 gap-3 sm:grid-cols-3"><label className="grid min-w-0 gap-1 text-sm font-bold">Ilu osób potrzebujecie?<input name="peopleNeeded" required min={1} max={1000} type="number" defaultValue={need?.peopleNeeded ?? 1} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label><label className="grid min-w-0 gap-1 text-sm font-bold sm:col-span-2">Początek<input name="startsAt" required type="datetime-local" defaultValue={localDate(need?.startsAt)} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label></div>}
    {isGlobalCreate ? <h2 className="border-t border-border pt-4 text-base font-bold">Kiedy i jak</h2> : null}
    {isGlobalCreate ? <div className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="grid min-w-0 gap-1 text-sm font-bold">Początek<input name="startsAt" required type="datetime-local" defaultValue={localDate(existingNeed?.startsAt)} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label><label className="grid min-w-0 gap-1 text-sm font-bold">Koniec<input name="endsAt" required type="datetime-local" defaultValue={localDate(existingNeed?.endsAt)} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label></div> : <div className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="grid min-w-0 gap-1 text-sm font-bold">Koniec<input name="endsAt" required type="datetime-local" defaultValue={localDate(existingNeed?.endsAt)} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label><label className="grid min-w-0 gap-1 text-sm font-bold">Wymagane doświadczenie?<select name="experienceRequired" defaultValue={existingNeed?.experienceRequired ? "true" : "false"} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="false">Nie</option><option value="true">Tak</option></select></label></div>}
    <label className="grid min-w-0 gap-1 text-sm font-bold">Wymagania <span className="font-normal text-muted-foreground">(opcjonalnie)</span><input name="requirements" maxLength={500} defaultValue={need?.requirements ?? ""} placeholder="Np. krótkie przeszkolenie na miejscu" className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label>
    <label className="grid min-w-0 gap-1 text-sm font-bold">Wskazówka dotycząca miejsca <span className="font-normal text-muted-foreground">(opcjonalnie)</span><input name="locationNote" maxLength={300} defaultValue={need?.locationNote ?? ""} placeholder="Wejście od strony..." className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-border px-3 font-normal" /></label>
    {isGlobalCreate ? <div className="flex flex-wrap gap-2"><button type="submit" name="status" value="DRAFT" disabled={pending} className="min-h-11 w-fit rounded-lg border border-brand px-4 py-2 text-sm font-extrabold text-brand-strong disabled:opacity-60">{pending ? "Zapisywanie…" : "Zapisz szkic"}</button><button type="submit" name="status" value="PUBLISHED" disabled={pending} className="min-h-11 w-fit rounded-lg bg-brand px-4 py-2 text-sm font-extrabold disabled:opacity-60">{pending ? "Zapisywanie…" : "Opublikuj"}</button></div> : <>
      <input type="hidden" name="status" value={need?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"} />
      <button type="submit" disabled={pending} className="min-h-11 w-fit rounded-lg bg-brand px-4 py-2 text-sm font-extrabold disabled:opacity-60">{pending ? "Zapisywanie…" : need ? "Zapisz zmiany" : "Zapisz szkic"}</button>
    </>}
    {state.error ? <p className="text-sm font-semibold text-red-800" role="alert">{state.error}</p> : null}
    {state.success ? <p className="text-sm font-semibold text-brand-strong" role="status">{state.success}</p> : null}
  </form>
  {isGlobalCreate && publishOpen && !state.success && publishSummary ? <ConfirmDialog open title="Publikować tę potrzebę?" description="Przed publikacją sprawdź najważniejsze dane. Po publikacji potrzeba będzie widoczna publicznie." confirmLabel="Tak, opublikuj" formAction={() => { const data = new FormData(formRef.current ?? undefined); data.set("status", "PUBLISHED"); return formAction(data); }} onCancel={() => setPublishOpen(false)}><dl className="mt-4 grid gap-2 rounded-lg bg-surface-muted p-3 text-sm"><div><dt className="font-bold">Organizacja</dt><dd>{publishSummary.organization}</dd></div><div><dt className="font-bold">Placówka</dt><dd>{publishSummary.place}</dd></div><div><dt className="font-bold">Potrzeba</dt><dd>{publishSummary.title}</dd></div><div><dt className="font-bold">Termin</dt><dd>{publishSummary.startsAt}</dd></div><div><dt className="font-bold">Liczba osób</dt><dd>{publishSummary.peopleNeeded}</dd></div></dl></ConfirmDialog> : null}
  </>;
}
