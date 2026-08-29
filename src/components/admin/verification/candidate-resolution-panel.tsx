"use client";

import Link from "next/link";
import { GitMerge, GitPullRequest, SkipForward } from "lucide-react";
import { useActionState, useState } from "react";
import { resolveCandidateDifferentPlace, resolveCandidateSamePlace, skipImportCandidate, type VerificationActionState } from "@/app/admin/(protected)/weryfikacja/actions";

type Category = { id: string; slug: string; name: string; active: boolean };
type Organization = { id: string; name: string; active: boolean };
type PlaceOption = { id: string; name: string; addressLine: string };

export function CandidateResolutionPanel({ candidateId, importBatchId, initial, categories, organizations, places, effectiveCategory = null, spreadsheetPlaceReview = false }: {
  candidateId: string;
  importBatchId: string;
  initial: { name: string; address: string; categorySlugs: string[]; primaryCategorySlug: string; organizationId: string; matchedPlaceId: string };
  categories: Category[];
  organizations: Organization[];
  places: PlaceOption[];
  effectiveCategory?: { primary: string | null; selected: string[]; review: boolean } | null;
  spreadsheetPlaceReview?: boolean;
}) {
  const [selectedCategories, setSelectedCategories] = useState(initial.categorySlugs);
  const [sameState, sameAction, samePending] = useActionState<VerificationActionState, FormData>(resolveCandidateSamePlace.bind(null, candidateId), {});
  const [differentState, differentAction, differentPending] = useActionState<VerificationActionState, FormData>(resolveCandidateDifferentPlace.bind(null, candidateId), {});
  const [skipState, skipAction, skipPending] = useActionState<VerificationActionState, FormData>(skipImportCandidate.bind(null, candidateId), {});
  return (
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <h2 className="text-xl font-bold">Decyzja administratora</h2><p className="mt-1 text-sm text-muted-foreground">Rozwiązanie konfliktu nie publikuje miejsca i nie nadpisuje istniejących danych.</p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <form action={sameAction} className="rounded-lg border border-brand/30 bg-brand-soft/30 p-3">
          <h3 className="flex items-center gap-2 font-bold"><GitMerge aria-hidden="true" size={19} />To to samo miejsce</h3><p className="mt-1 text-sm text-muted-foreground">Powiąż źródło z rekordem bez kopiowania pól.</p>
          <label className="mt-3 block text-sm font-bold">Istniejące miejsce<select name="placeId" required defaultValue={initial.matchedPlaceId} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Wybierz miejsce</option>{places.map((place) => <option key={place.id} value={place.id}>{place.name} — {place.addressLine}</option>)}</select></label>
          <label className="mt-2 block text-sm font-bold">Notatka <span className="font-normal text-muted-foreground">(opcjonalnie)</span><input name="note" maxLength={1000} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <button type="submit" disabled={samePending} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong hover:bg-white disabled:opacity-60">Powiąż z miejscem</button>{sameState.error ? <p className="mt-2 text-sm font-semibold text-urgent">{sameState.error}</p> : null}{sameState.success ? <p className="mt-2 text-sm font-semibold text-brand-strong">{sameState.success}</p> : null}
        </form>

        {spreadsheetPlaceReview ? <form action={differentAction} className="rounded-lg border border-border p-3">
          <h3 className="flex items-center gap-2 font-bold"><GitPullRequest aria-hidden="true" size={19} />To inna placówka</h3><p className="mt-1 text-sm text-muted-foreground">Utworzy nowe miejsce jako szkic. Istniejące miejsce nie zostanie zmienione.</p>
          <label className="mt-3 block text-sm font-bold">Miejsce uznane za inne<select name="reviewedPlaceId" required defaultValue={initial.matchedPlaceId} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Wybierz miejsce</option>{places.map((place) => <option key={place.id} value={place.id}>{place.name} — {place.addressLine}</option>)}</select></label>
          <div className="mt-3 rounded-md border border-border bg-[#faf9f5] p-3 text-sm"><p className="font-bold">Kategorie zostaną pobrane z decyzji importu</p>{effectiveCategory?.review ? <p className="mt-1 text-urgent">Kategoria wymaga rozstrzygnięcia w imporcie.</p> : <><p className="mt-1">Główna: {effectiveCategory?.primary ?? "—"}</p><p className="mt-1">Wybrane: {effectiveCategory?.selected.join(", ") || "—"}</p></>}<Link href={`/admin/importy/${importBatchId}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-brand-strong hover:underline">Rozstrzygnij kategorię w imporcie</Link></div>
          <label className="mt-2 block text-sm font-bold">Organizacja<select name="organizationId" defaultValue={initial.organizationId} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Bez organizacji</option>{organizations.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="mt-3 block text-sm font-bold">Notatka <span className="font-normal text-muted-foreground">(opcjonalnie)</span><input name="note" maxLength={1000} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <button type="submit" disabled={differentPending} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60">{differentPending ? "Tworzę szkic..." : "To inna placówka"}</button>{differentState.error ? <p className="mt-2 text-sm font-semibold text-urgent">{differentState.error}</p> : null}{differentState.success ? <p className="mt-2 text-sm font-semibold text-brand-strong">{differentState.success}</p> : null}
        </form> : <form action={differentAction} className="rounded-lg border border-border p-3">
          <h3 className="flex items-center gap-2 font-bold"><GitPullRequest aria-hidden="true" size={19} />To różne miejsca</h3><p className="mt-1 text-sm text-muted-foreground">Utwórz osobny szkic wymagający dalszej weryfikacji.</p>
          <label className="mt-3 block text-sm font-bold">Nazwa<input name="name" required defaultValue={initial.name} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <label className="mt-2 block text-sm font-bold">Stały adres<input name="addressLine" required defaultValue={initial.address} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <label className="mt-2 block text-sm font-bold">Organizacja<select name="organizationId" defaultValue={initial.organizationId} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Brak organizacji</option>{organizations.filter((item) => item.active || item.id === initial.organizationId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <fieldset className="mt-3"><legend className="text-sm font-bold">Kategorie</legend><div className="mt-1 grid gap-1.5 sm:grid-cols-2">{categories.filter((item) => item.active).map((category) => <label key={category.id} className="flex min-h-11 items-center gap-2 rounded-md border border-border px-2 text-sm"><input type="checkbox" name="categorySlugs" value={category.slug} checked={selectedCategories.includes(category.slug)} onChange={(event) => setSelectedCategories((current) => event.target.checked ? [...new Set([...current, category.slug])] : current.filter((slug) => slug !== category.slug))} className="h-5 w-5 accent-[#13ad87]" />{category.name}</label>)}</div></fieldset>
          <label className="mt-2 block text-sm font-bold">Główna kategoria<select name="primaryCategorySlug" defaultValue={initial.primaryCategorySlug} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal">{categories.filter((item) => item.active && selectedCategories.includes(item.slug)).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
          <label className="mt-2 block text-sm font-bold">Notatka <span className="font-normal text-muted-foreground">(opcjonalnie)</span><input name="note" maxLength={1000} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <button type="submit" disabled={differentPending} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60">Utwórz osobny szkic</button>{differentState.error ? <p className="mt-2 text-sm font-semibold text-urgent">{differentState.error}</p> : null}{differentState.success ? <p className="mt-2 text-sm font-semibold text-brand-strong">{differentState.success}</p> : null}
        </form>}
      </div>
      <form action={skipAction} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-urgent/25 bg-urgent-soft/25 p-3"><label className="min-w-[220px] flex-1 text-sm font-bold">Powód pominięcia<input name="reason" required maxLength={1000} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal" /></label><button type="submit" disabled={skipPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-urgent/40 px-4 text-sm font-bold text-[#8b2d0b] hover:bg-white disabled:opacity-60"><SkipForward aria-hidden="true" size={18} />Pomiń</button>{skipState.error ? <p className="w-full text-sm font-semibold text-urgent">{skipState.error}</p> : null}{skipState.success ? <p className="w-full text-sm font-semibold text-brand-strong">{skipState.success}</p> : null}</form>
      <Link href="/admin/weryfikacja" className="mt-3 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-muted-foreground hover:bg-[#efede7]">Wrócę później</Link>
    </section>
  );
}
