"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateAdmissionHours, updateAdmissionStatus, updateFacilityContact, type FacilityActionState } from "@/app/admin/(protected)/moje-miejsca/actions";
import { VerificationOpeningHoursEditor } from "@/components/admin/verification/opening-hours-editor";
import type { AdminOpeningDay } from "@/types/place-admin";

function SaveButton({ label }: { label: string }) { const { pending } = useFormStatus(); return <button disabled={pending} className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-bold">{pending ? "Zapisywanie..." : label}</button>; }
function Message({ state }: { state: FacilityActionState }) { return state.error ? <p role="alert" className="text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : state.success ? <p role="status" className="text-sm font-semibold text-brand-strong">{state.success}</p> : null; }

export function AdmissionStatusForm({ placeId, value }: { placeId: string; value: "YES" | "NO" | "UNKNOWN" }) {
  const [state, action] = useActionState(updateAdmissionStatus.bind(null, placeId), {});
  return <form action={action} className="space-y-3"><label className="block text-sm font-bold">Bieżący status przyjęć<select name="status" defaultValue={value === "YES" ? "ACTIVE" : value === "NO" ? "SUSPENDED" : "UNKNOWN"} className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3"><option value="ACTIVE">Przyjęcia aktywne</option><option value="SUSPENDED">Przyjęcia czasowo wstrzymane</option><option value="UNKNOWN">Brak aktualnej informacji</option></select></label><div className="flex flex-wrap items-center justify-between gap-3"><Message state={state} /><SaveButton label="Zapisz status" /></div></form>;
}

export function AdmissionHoursForm({ placeId, days }: { placeId: string; days: AdminOpeningDay[] }) {
  const [state, action] = useActionState(updateAdmissionHours.bind(null, placeId), {});
  return <form action={action} className="space-y-3"><VerificationOpeningHoursEditor initialDays={days} /><div className="flex flex-wrap items-center justify-between gap-3"><Message state={state} /><SaveButton label="Zapisz godziny przyjęć" /></div></form>;
}

export function FacilityContactForm({ placeId, phone, email, website }: { placeId: string; phone: string | null; email: string | null; website: string | null }) {
  const [state, action] = useActionState(updateFacilityContact.bind(null, placeId), {});
  return <form action={action} className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Telefon<input name="phone" defaultValue={phone ?? ""} maxLength={50} className="mt-2 min-h-11 w-full rounded-lg border border-border px-3" /></label><label className="text-sm font-bold">E-mail<input name="email" type="email" defaultValue={email ?? ""} maxLength={320} className="mt-2 min-h-11 w-full rounded-lg border border-border px-3" /></label><label className="text-sm font-bold sm:col-span-2">WWW<input name="website" type="url" defaultValue={website ?? ""} maxLength={2048} className="mt-2 min-h-11 w-full rounded-lg border border-border px-3" /></label><div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2"><Message state={state} /><SaveButton label="Zapisz kontakt" /></div></form>;
}
