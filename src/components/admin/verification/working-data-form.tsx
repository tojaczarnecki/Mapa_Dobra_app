"use client";

import Link from "next/link";
import { Save } from "lucide-react";
import { useActionState, useState } from "react";
import { saveVerificationWorkingData, type VerificationActionState } from "@/app/admin/(protected)/weryfikacja/actions";
import type { AdminOpeningDay } from "@/types/place-admin";
import { VerificationOpeningHoursEditor } from "./opening-hours-editor";

type Option = { id: string; name: string; active: boolean };
type CategoryOption = Option & { slug: string };

export function WorkingDataForm({ place, categories, organizations, openingDays, rawOpeningHours, nextId }: {
  place: {
    id: string; name: string; addressLine: string; street: string; buildingNumber: string; postalCode: string; city: string; district: string;
    phone: string; email: string; website: string; organizationId: string; primaryCategorySlug: string; categorySlugs: string[];
  };
  categories: CategoryOption[];
  organizations: Option[];
  openingDays: AdminOpeningDay[];
  rawOpeningHours: string | null;
  nextId: string | null;
}) {
  const action = saveVerificationWorkingData.bind(null, place.id, nextId);
  const [state, formAction, pending] = useActionState<VerificationActionState, FormData>(action, {});
  const [selectedCategories, setSelectedCategories] = useState(place.categorySlugs);
  return (
    <form action={formAction} className="space-y-4">
      <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-strong">Wersja administratora</p><h2 className="mt-1 text-xl font-bold">Dane robocze</h2><p className="mt-1 text-sm text-muted-foreground">Zmiany zapisują się do Place, nie do niezmiennego wpisu źródłowego.</p></div><Link href={`/admin/miejsca/${place.id}/edytuj`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Pełny formularz CMS</Link></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nazwa" name="name" defaultValue={place.name} required wide />
          <Field label="Ulica" name="street" defaultValue={place.street} />
          <Field label="Numer" name="buildingNumber" defaultValue={place.buildingNumber} />
          <Field label="Pełny adres" name="addressLine" defaultValue={place.addressLine} required wide />
          <Field label="Kod pocztowy" name="postalCode" defaultValue={place.postalCode} />
          <Field label="Miasto" name="city" defaultValue={place.city} required />
          <Field label="Dzielnica" name="district" defaultValue={place.district} />
          <Field label="Telefon" name="phone" defaultValue={place.phone} />
          <Field label="E-mail" name="email" type="email" defaultValue={place.email} />
          <Field label="WWW" name="website" type="url" defaultValue={place.website} wide />
          <label className="text-sm font-bold sm:col-span-2">Organizacja<select name="organizationId" defaultValue={place.organizationId} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Brak organizacji</option>{organizations.filter((item) => item.active || item.id === place.organizationId).map((organization) => <option key={organization.id} value={organization.id}>{organization.name}{organization.active ? "" : " (nieaktywna)"}</option>)}</select><span className="mt-1 block text-xs font-normal text-muted-foreground">Brakującej organizacji nie tworzymy automatycznie. <Link href="/admin/organizacje/nowa" className="font-bold text-brand-strong hover:underline">Dodaj w CMS</Link>.</span></label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <h2 className="text-xl font-bold">Kategorie</h2><p className="mt-1 text-sm text-muted-foreground">Główna kategoria musi być aktywna i należeć do zaznaczonych.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{categories.filter((item) => item.active || selectedCategories.includes(item.slug)).map((category) => <label key={category.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold"><input type="checkbox" name="categorySlugs" value={category.slug} checked={selectedCategories.includes(category.slug)} onChange={(event) => setSelectedCategories((current) => event.target.checked ? [...new Set([...current, category.slug])] : current.filter((slug) => slug !== category.slug))} className="h-5 w-5 accent-[#13ad87]" />{category.name}{category.active ? "" : " (nieaktywna)"}</label>)}</div>
        <label className="mt-3 block text-sm font-bold">Kategoria główna<select name="primaryCategorySlug" defaultValue={place.primaryCategorySlug} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal">{categories.filter((item) => item.active && selectedCategories.includes(item.slug)).map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label>
      </section>

      <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <h2 className="text-xl font-bold">Godziny działania</h2>{rawOpeningHours ? <div className="mt-3 rounded-md border border-brand/25 bg-brand-soft/40 p-3"><p className="text-xs font-bold uppercase text-brand-strong">Tekst źródłowy z PDF</p><p className="mt-1 text-sm whitespace-pre-wrap">{rawOpeningHours}</p></div> : <p className="mt-2 text-sm text-muted-foreground">PDF nie zawierał jednoznacznego tekstu godzin. UNKNOWN pozostaje poprawnym stanem.</p>}
        <div className="mt-3"><VerificationOpeningHoursEditor initialDays={openingDays} /></div>
      </section>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white/95 p-3 shadow-lg backdrop-blur">
        <div>{state.error ? <p className="text-sm font-semibold text-urgent" role="alert">{state.error}</p> : null}{state.success ? <p className="text-sm font-semibold text-brand-strong" role="status">{state.success}</p> : null}</div>
        <div className="flex flex-wrap gap-2"><button type="submit" name="intent" value="save" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:opacity-60"><Save aria-hidden="true" size={18} />Zapisz zmiany</button>{nextId ? <button type="submit" name="intent" value="next" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60">Zapisz i przejdź do następnego</button> : null}</div>
      </div>
    </form>
  );
}

function Field({ label, name, defaultValue, type = "text", required = false, wide = false }: { label: string; name: string; defaultValue: string; type?: string; required?: boolean; wide?: boolean }) {
  return <label className={`text-sm font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}<input type={type} name={name} defaultValue={defaultValue} required={required} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/25" /></label>;
}
