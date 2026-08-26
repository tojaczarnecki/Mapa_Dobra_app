"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Save } from "lucide-react";
import { saveOrganization } from "@/app/admin/(protected)/organizacje/actions";
import { useUnsavedChanges } from "@/components/admin/unsaved-changes";
import { applyRegistryData } from "@/lib/organizations/gus-merge";
import type { GusRegistryData } from "@/lib/organizations/gus-client";
import type { DirectoryActionState, OrganizationFormValue } from "@/types/admin-directory";

const initialState: DirectoryActionState = {};
const fieldClass = "min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

function SubmitButton({ editing, warning }: { editing: boolean; warning: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60"><Save aria-hidden="true" size={17} />{pending ? "Zapisywanie…" : warning ? "Zapisz mimo podobieństwa" : editing ? "Zapisz zmiany" : "Dodaj organizację"}</button>;
}

export function OrganizationForm({ initialData, gusConfigured = false }: { initialData: OrganizationFormValue; gusConfigured?: boolean }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [state, formAction] = useActionState(saveOrganization, initialState);
  const [formValues, setFormValues] = useState(initialData);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not-found" | "error" | "unavailable">("idle");
  const [registry, setRegistry] = useState<GusRegistryData | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ field: keyof OrganizationFormValue; current: string; proposed: string }>>([]);
  useUnsavedChanges(dirty);

  useEffect(() => {
    if (state.success && state.entityId) router.push(`/admin/organizacje/${state.entityId}`);
  }, [router, state]);

  function updateField(field: keyof OrganizationFormValue, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setDirty(true);
  }

  async function lookupRegistry() {
    setLookupState("loading");
    setRegistry(null);
    setSuggestions([]);
    try {
      const response = await fetch(`/api/registry/gus?nip=${encodeURIComponent(formValues.nip)}`, { cache: "no-store" });
      const payload = await response.json() as { ok?: boolean; data?: GusRegistryData; code?: string };
      if (response.status === 404) { setLookupState("not-found"); return; }
      if (payload.code === "NOT_CONFIGURED") { setLookupState("unavailable"); return; }
      if (!response.ok || !payload.data) { setLookupState("error"); return; }
      setRegistry(payload.data);
      setLookupState("found");
    } catch { setLookupState("error"); }
  }

  function applyRegistry() {
    if (!registry) return;
    const result = applyRegistryData(formValues, registry);
    setFormValues((current) => ({ ...current, ...result.values }));
    setSuggestions(result.suggestions);
    const registryFields = ["name", "nip", "regon", "krs", "legalForm"] as const;
    if (registryFields.some((key) => result.values[key] !== formValues[key])) setDirty(true);
  }

  const editing = Boolean(initialData.id);
  return <form action={formAction} className="space-y-4 pb-16" onChange={() => setDirty(true)}>
    {initialData.id ? <input type="hidden" name="id" value={initialData.id} /> : null}
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <h2 className="text-lg font-bold">Podstawowe informacje</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold sm:col-span-2"><span className="mb-1.5 block">Nazwa *</span><input name="name" required maxLength={250} value={formValues.name} onChange={(event) => updateField("name", event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold"><span className="mb-1.5 block">Telefon</span><input name="phone" type="tel" maxLength={50} value={formValues.phone} onChange={(event) => updateField("phone", event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold"><span className="mb-1.5 block">E-mail</span><input name="email" type="email" maxLength={320} value={formValues.email} onChange={(event) => updateField("email", event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold sm:col-span-2"><span className="mb-1.5 block">Strona WWW</span><input name="website" type="url" maxLength={2048} placeholder="https://…" value={formValues.website} onChange={(event) => updateField("website", event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold sm:col-span-2"><span className="mb-1.5 block">NIP</span><div className="flex gap-2"><input name="nip" inputMode="numeric" autoComplete="off" maxLength={20} value={formValues.nip} onChange={(event) => updateField("nip", event.target.value)} className={fieldClass} /><button type="button" onClick={lookupRegistry} disabled={!gusConfigured || lookupState === "loading"} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-bold hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60"><Download aria-hidden="true" size={16} />{lookupState === "loading" ? "Pobieramy…" : "Pobierz dane z GUS"}</button></div><span className="mt-1 block text-xs font-normal text-muted-foreground">{gusConfigured ? "Dane rejestrowe możesz pobrać po sprawdzeniu NIP." : "Automatyczne pobieranie danych jest obecnie niedostępne."}</span></label>
        <label className="block text-sm font-bold"><span className="mb-1.5 block">REGON</span><input name="regon" inputMode="numeric" autoComplete="off" maxLength={20} value={formValues.regon} onChange={(event) => updateField("regon", event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold"><span className="mb-1.5 block">KRS</span><input name="krs" inputMode="numeric" autoComplete="off" maxLength={20} value={formValues.krs} onChange={(event) => updateField("krs", event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold"><span className="mb-1.5 block">Forma prawna</span><input name="legalForm" maxLength={160} value={formValues.legalForm} onChange={(event) => updateField("legalForm", event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold sm:col-span-2"><span className="mb-1.5 block">Opis</span><textarea name="description" maxLength={2000} rows={5} value={formValues.description} onChange={(event) => updateField("description", event.target.value)} className={`${fieldClass} resize-y`} /></label>
      </div>
    </section>
    {lookupState === "found" && registry ? <section className="rounded-lg border border-border bg-white p-4 text-sm"><p className="font-bold text-brand-strong">Dane znalezione w GUS</p><p className="mt-1">{registry.name ?? "Nazwa niedostępna"}{registry.regon ? ` · REGON ${registry.regon}` : ""}</p><p className="text-muted-foreground">{[registry.address.street, registry.address.buildingNumber, registry.address.postalCode, registry.address.city].filter(Boolean).join(" ") || "Adres niedostępny"}</p><button type="button" onClick={applyRegistry} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-bold hover:bg-brand-strong hover:text-white">Uzupełnij brakujące dane</button>{suggestions.length ? <p className="mt-2 text-xs text-muted-foreground">Pola z innymi wartościami pozostawiono bez zmian.</p> : null}</section> : null}
    {lookupState === "not-found" ? <p role="status" className="rounded-lg border border-border bg-white px-4 py-3 text-sm">Nie znaleźliśmy podmiotu dla tego NIP.</p> : null}
    {lookupState === "error" ? <p role="status" className="rounded-lg border border-urgent/35 bg-urgent-soft px-4 py-3 text-sm">Nie udało się pobrać danych z GUS. Możesz uzupełnić dane ręcznie.</p> : null}
    {lookupState === "unavailable" ? <p role="status" className="rounded-lg border border-border bg-white px-4 py-3 text-sm">Automatyczne pobieranie danych jest obecnie niedostępne.</p> : null}
    {state.warning ? <div className="rounded-lg border border-urgent/35 bg-urgent-soft p-4 text-sm"><p className="flex gap-2 font-bold text-[#8c2d0c]"><AlertTriangle aria-hidden="true" className="shrink-0" size={18} /> {state.warning}</p><label className="mt-3 flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" name="confirmSimilar" value="yes" required />Potwierdzam, że to odrębna organizacja.</label></div> : null}
    {state.error ? <p role="alert" className="rounded-lg border border-urgent/35 bg-urgent-soft px-4 py-3 text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
    <div className="sticky bottom-0 z-10 flex justify-end border-t border-border bg-[#f7f5ef]/95 py-3 backdrop-blur"><SubmitButton editing={editing} warning={Boolean(state.warning)} /></div>
  </form>;
}
