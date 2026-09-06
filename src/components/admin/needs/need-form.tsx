"use client";

import { useActionState } from "react";
import { createNeed, updateNeed, type NeedActionState } from "@/app/admin/(protected)/moje-miejsca/needs-actions";

type NeedFormProps = { placeId: string | null; need?: { id: string; title: string; description: string; peopleNeeded: number; startsAt: Date; endsAt: Date; experienceRequired: boolean; requirements: string | null; locationNote: string | null; status: string } };
const initialState: NeedActionState = {};
const localDate = (value?: Date) => value ? new Date(value).toISOString().slice(0, 16) : "";

export function NeedForm({ placeId, need }: NeedFormProps) {
  const action = need ? updateNeed.bind(null, need.id, placeId) : createNeed.bind(null, placeId as string);
  const [state, formAction, pending] = useActionState(action, initialState);
  if (!need && !placeId) return null;
  return <form action={formAction} className="grid gap-3 border-t border-border pt-4">
    <label className="grid gap-1 text-sm font-bold">Do czego potrzebujecie pomocy?<input name="title" required maxLength={180} defaultValue={need?.title} placeholder="Pomoc przy wydawaniu kolacji" className="min-h-11 rounded-lg border border-border px-3 font-normal" /></label>
    <label className="grid gap-1 text-sm font-bold">Krótki opis<textarea name="description" required maxLength={1000} defaultValue={need?.description} rows={2} className="rounded-lg border border-border px-3 py-2 font-normal" /></label>
    <div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm font-bold">Ilu osób potrzebujecie?<input name="peopleNeeded" required min={1} max={1000} type="number" defaultValue={need?.peopleNeeded ?? 1} className="min-h-11 rounded-lg border border-border px-3 font-normal" /></label><label className="grid gap-1 text-sm font-bold sm:col-span-2">Początek<input name="startsAt" required type="datetime-local" defaultValue={localDate(need?.startsAt)} className="min-h-11 rounded-lg border border-border px-3 font-normal" /></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Koniec<input name="endsAt" required type="datetime-local" defaultValue={localDate(need?.endsAt)} className="min-h-11 rounded-lg border border-border px-3 font-normal" /></label><label className="grid gap-1 text-sm font-bold">Wymagane doświadczenie?<select name="experienceRequired" defaultValue={need?.experienceRequired ? "true" : "false"} className="min-h-11 rounded-lg border border-border bg-white px-3 font-normal"><option value="false">Nie</option><option value="true">Tak</option></select></label></div>
    <label className="grid gap-1 text-sm font-bold">Wymagania <span className="font-normal text-muted-foreground">(opcjonalnie)</span><input name="requirements" maxLength={500} defaultValue={need?.requirements ?? ""} placeholder="Np. krótkie przeszkolenie na miejscu" className="min-h-11 rounded-lg border border-border px-3 font-normal" /></label>
    <label className="grid gap-1 text-sm font-bold">Wskazówka dotycząca miejsca <span className="font-normal text-muted-foreground">(opcjonalnie)</span><input name="locationNote" maxLength={300} defaultValue={need?.locationNote ?? ""} placeholder="Wejście od strony..." className="min-h-11 rounded-lg border border-border px-3 font-normal" /></label>
    <input type="hidden" name="status" value={need?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"} />
    {state.error ? <p className="text-sm font-semibold text-red-800" role="alert">{state.error}</p> : null}
    {state.success ? <p className="text-sm font-semibold text-brand-strong" role="status">{state.success}</p> : null}
    <button type="submit" disabled={pending} className="min-h-11 w-fit rounded-lg bg-brand px-4 py-2 text-sm font-extrabold disabled:opacity-60">{pending ? "Zapisywanie…" : need ? "Zapisz zmiany" : "Zapisz szkic"}</button>
  </form>;
}
