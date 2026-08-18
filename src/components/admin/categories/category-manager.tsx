"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Pencil, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveCategory } from "@/app/admin/(protected)/kategorie/actions";
import { slugifyDirectoryValue } from "@/lib/admin/directory-validation";
import type { DirectoryActionState } from "@/types/admin-directory";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  placeCount: number;
  publishedCount: number;
  primaryCount: number;
};

const initialState: DirectoryActionState = {};
const fieldClass = "min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

function placeCountLabel(count: number) {
  if (count === 1) return "1 miejsce";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return `${count} miejsca`;
  return `${count} miejsc`;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60">
      <Save aria-hidden="true" size={17} /> {pending ? "Zapisywanie…" : label}
    </button>
  );
}

export function NewCategoryForm() {
  const router = useRouter();
  const [state, action] = useActionState(saveCategory, initialState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);
  return (
    <details className="rounded-lg border border-border bg-white p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold text-brand-strong">
        <Plus aria-hidden="true" size={18} /> Dodaj kategorię
      </summary>
      <form action={action} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_120px_auto] lg:items-end">
        <label className="text-sm font-bold">Nazwa *<input name="name" required maxLength={160} value={name} onChange={(event) => { setName(event.target.value); if (!slugTouched) setSlug(slugifyDirectoryValue(event.target.value)); }} className={`mt-1 ${fieldClass}`} /></label>
        <label className="text-sm font-bold">Slug *<input name="slug" required maxLength={120} value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugifyDirectoryValue(event.target.value)); }} className={`mt-1 ${fieldClass}`} /></label>
        <label className="text-sm font-bold">Kolejność<input name="sortOrder" type="number" min={0} max={100000} className={`mt-1 ${fieldClass}`} /></label>
        <div>
          <label className="mb-2 flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" /> Aktywna publicznie</label>
          <SaveButton label="Dodaj" />
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">Nowa kategoria pozostaje nieaktywna, dopóki świadomie nie zaznaczysz aktywacji.</p>
        {state.error ? <p role="alert" className="text-sm font-semibold text-[#8c2d0c] sm:col-span-2 lg:col-span-4">{state.error}</p> : null}
      </form>
    </details>
  );
}

export function CategoryEditor({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const [state, action] = useActionState(saveCategory, initialState);
  const [active, setActive] = useState(category.active);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);
  const needsConfirmation = category.active && !active && category.placeCount > 0;
  return (
    <details className="border-b border-border last:border-b-0">
      <summary className="grid min-h-16 cursor-pointer list-none items-center gap-2 px-3 py-2 hover:bg-brand-soft/30 md:grid-cols-[minmax(160px,1.2fr)_minmax(130px,.9fr)_90px_100px_100px_90px]">
        <span className="min-w-0"><strong className="block truncate text-sm">{category.name}</strong><span className="text-xs text-muted-foreground">{category.slug}</span></span>
        <span className="text-sm"><strong>{placeCountLabel(category.placeCount)}</strong> · {category.publishedCount} opublikowanych</span>
        <span className="text-sm"><span className="md:sr-only">Kolejność: </span>{category.sortOrder}</span>
        <span className={`inline-flex min-h-7 w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${category.active ? "border-brand/35 bg-brand-soft text-[#086b55]" : "border-border bg-surface-muted text-muted-foreground"}`}>{category.active ? "Aktywna" : "Nieaktywna"}</span>
        <span className="text-xs text-muted-foreground">Główna dla {category.primaryCount}</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-strong"><Pencil aria-hidden="true" size={16} /> Edytuj</span>
      </summary>
      <form action={action} className="grid gap-3 bg-[#faf9f5] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_120px_auto] lg:items-end">
        <input type="hidden" name="id" value={category.id} />
        <label className="text-sm font-bold">Nazwa publiczna<input name="name" required maxLength={160} defaultValue={category.name} className={`mt-1 ${fieldClass}`} /></label>
        <label className="text-sm font-bold">Slug — pole chronione<input name="slug" readOnly value={category.slug} className={`mt-1 ${fieldClass} bg-surface-muted`} /></label>
        <label className="text-sm font-bold">Kolejność<input name="sortOrder" type="number" min={0} max={100000} defaultValue={category.sortOrder} className={`mt-1 ${fieldClass}`} /></label>
        <div>
          <label className="mb-2 flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" checked={active} onChange={(event) => setActive(event.target.checked)} /> Aktywna</label>
          <SaveButton label="Zapisz" />
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">Slug pozostaje zablokowany, ponieważ jest częścią publicznych adresów URL. Zmiana wymaga osobnego etapu z przekierowaniami.</p>
        {needsConfirmation ? (
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-urgent/35 bg-urgent-soft px-3 text-sm font-semibold sm:col-span-2 lg:col-span-4">
            <input type="checkbox" name="confirmDeactivation" value="yes" required />
            Ta kategoria jest przypisana do {placeCountLabel(category.placeCount)}, w tym jest główna dla {category.primaryCount}. Potwierdzam dezaktywację bez usuwania relacji.
          </label>
        ) : null}
        {state.warning ? <p className="flex gap-2 text-sm font-semibold text-[#8c2d0c] sm:col-span-2 lg:col-span-4"><AlertTriangle aria-hidden="true" size={18} /> {state.warning}</p> : null}
        {state.error ? <p role="alert" className="text-sm font-semibold text-[#8c2d0c] sm:col-span-2 lg:col-span-4">{state.error}</p> : null}
        {state.success ? <p role="status" className="text-sm font-semibold text-brand-strong sm:col-span-2 lg:col-span-4">{state.success}</p> : null}
      </form>
    </details>
  );
}
