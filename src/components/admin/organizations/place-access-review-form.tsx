"use client";

import { useState } from "react";
import { reviewPlaceAccessRequest } from "@/app/admin/(protected)/rejestracje-organizacji/actions";

const permissions = [
  ["UPDATE_BED_AVAILABILITY", "Dostępność miejsc"], ["UPDATE_ADMISSION_STATUS", "Status przyjęć"], ["UPDATE_ADMISSION_HOURS", "Godziny przyjęć"], ["UPDATE_PLACE_CONTACT", "Kontakt placówki"], ["UPDATE_PLACE_BASIC", "Podstawowe dane"], ["UPDATE_ACCOMMODATION_DETAILS", "Szczegóły noclegu"], ["UPDATE_TOTAL_CAPACITY", "Całkowita pojemność"],
] as const;
type Permission = (typeof permissions)[number][0];
const presets: Record<string, Permission[]> = { availability: ["UPDATE_BED_AVAILABILITY"], operator: ["UPDATE_BED_AVAILABILITY", "UPDATE_ADMISSION_STATUS", "UPDATE_ADMISSION_HOURS"], contact: ["UPDATE_PLACE_CONTACT", "UPDATE_ADMISSION_HOURS"] };

export function PlaceAccessReviewForm({ id }: { id: string }) {
  const [selected, setSelected] = useState<Permission[]>(presets.operator);
  return <form action={reviewPlaceAccessRequest} className="mt-4 space-y-3"><input type="hidden" name="id" value={id} /><input type="hidden" name="permissions" value={JSON.stringify(selected)} /><fieldset><legend className="text-sm font-semibold">Zakres dostępu</legend><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setSelected(presets.availability)} className="min-h-10 rounded-md border border-border px-2.5 text-xs font-semibold">Tylko dostępność</button><button type="button" onClick={() => setSelected(presets.operator)} className="min-h-10 rounded-md border border-border px-2.5 text-xs font-semibold">Operator placówki</button><button type="button" onClick={() => setSelected(presets.contact)} className="min-h-10 rounded-md border border-border px-2.5 text-xs font-semibold">Kontakt i godziny</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{permissions.map(([value, label]) => <label key={value} className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(value)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} />{label}</label>)}</div></fieldset><div className="flex flex-wrap gap-2"><button name="decision" value="approve" className="inline-flex min-h-11 rounded-lg bg-brand px-4 text-sm font-bold">Nadaj wybrany dostęp</button><button name="decision" value="reject" className="inline-flex min-h-11 rounded-lg border border-border px-4 text-sm font-bold">Odrzuć</button></div></form>;
}
