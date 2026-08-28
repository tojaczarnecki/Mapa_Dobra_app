"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Save } from "lucide-react";
import { saveOrganization } from "@/app/admin/(protected)/organizacje/actions";
import { useUnsavedChanges } from "@/components/admin/unsaved-changes";
import type { DirectoryActionState, OrganizationFormValue } from "@/types/admin-directory";

const initialState: DirectoryActionState = {};
const fieldClass = "min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

function SubmitButton({ editing, warning }: { editing: boolean; warning: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60">
      <Save aria-hidden="true" size={17} />
      {pending ? "Zapisywanie…" : warning ? "Zapisz mimo podobieństwa" : editing ? "Zapisz zmiany" : "Dodaj organizację"}
    </button>
  );
}

export function OrganizationForm({ initialData }: { initialData: OrganizationFormValue }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [formValues, setFormValues] = useState(initialData);
  const [state, formAction] = useActionState(saveOrganization, initialState);
  useUnsavedChanges(dirty);

  function updateField(field: keyof OrganizationFormValue, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setDirty(true);
  }

  useEffect(() => {
    if (state.success && state.entityId) {
      router.push(`/admin/organizacje/${state.entityId}`);
    }
  }, [router, state]);

  const editing = Boolean(initialData.id);
  const identifierFieldClass = (field: "nip" | "regon" | "krs") => `${fieldClass}${state.fieldErrors?.[field] ? " border-urgent focus:border-urgent focus:ring-urgent/25" : ""}`;
  return (
    <form action={formAction} className="space-y-4 pb-16" onChange={() => setDirty(true)}>
      {initialData.id ? <input type="hidden" name="id" value={initialData.id} /> : null}
      <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold">Podstawowe informacje</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold sm:col-span-2">
            <span className="mb-1.5 block">Nazwa *</span>
            <input name="name" required maxLength={250} value={formValues.name} onChange={(event) => updateField("name", event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-bold">
            <span className="mb-1.5 block">Telefon</span>
            <input name="phone" type="tel" maxLength={50} value={formValues.phone} onChange={(event) => updateField("phone", event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-bold">
            <span className="mb-1.5 block">E-mail</span>
            <input name="email" type="email" maxLength={320} value={formValues.email} onChange={(event) => updateField("email", event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-bold sm:col-span-2">
            <span className="mb-1.5 block">Strona WWW</span>
            <input name="website" type="text" inputMode="url" maxLength={2048} placeholder="https://…" value={formValues.website} onChange={(event) => updateField("website", event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-bold sm:col-span-2">
            <span className="mb-1.5 block">Opis</span>
            <textarea name="description" maxLength={2000} rows={5} value={formValues.description} onChange={(event) => updateField("description", event.target.value)} className={`${fieldClass} resize-y`} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold">Dane rejestrowe</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(["nip", "regon", "krs"] as const).map((field) => (
            <label key={field} className="block text-sm font-bold">
              <span className="mb-1.5 block">{field.toUpperCase()}</span>
              <input
                id={`organization-${field}`}
                name={field}
                inputMode="numeric"
                autoComplete="off"
                maxLength={20}
                value={formValues[field]}
                onChange={(event) => updateField(field, event.target.value)}
                className={identifierFieldClass(field)}
                aria-invalid={state.fieldErrors?.[field] ? "true" : undefined}
                aria-describedby={state.fieldErrors?.[field] ? `organization-${field}-error` : undefined}
              />
              {state.fieldErrors?.[field] ? <p id={`organization-${field}-error`} className="mt-1.5 text-xs font-semibold text-[#8c2d0c]">{state.fieldErrors[field]}</p> : null}
            </label>
          ))}
        </div>
      </section>

      {state.warning ? (
        <div className="rounded-lg border border-urgent/35 bg-urgent-soft p-4 text-sm">
          <p className="flex gap-2 font-bold text-[#8c2d0c]"><AlertTriangle aria-hidden="true" className="shrink-0" size={18} /> {state.warning}</p>
          <label className="mt-3 flex min-h-11 items-center gap-3 font-semibold">
            <input type="checkbox" name="confirmSimilar" value="yes" required />
            Potwierdzam, że to odrębna organizacja.
          </label>
        </div>
      ) : null}
      {state.error ? <p role="alert" className="rounded-lg border border-urgent/35 bg-urgent-soft px-4 py-3 text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}

      <div className="sticky bottom-0 z-10 flex justify-end border-t border-border bg-[#f7f5ef]/95 py-3 backdrop-blur">
        <SubmitButton editing={editing} warning={Boolean(state.warning)} />
      </div>
    </form>
  );
}
