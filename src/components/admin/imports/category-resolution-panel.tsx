"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveCategoryDecision, type CategoryDecisionActionState } from "@/app/admin/(protected)/importy/actions";
import { categoryMatchLabel, categoryMethodLabel, finalSelectedCategoryIds, initialCategoryFormValues, secondaryCategoryOptions, shouldStartEditing } from "./category-resolution-panel-model";

type CategoryOption = { id: string; slug: string; name: string; active: boolean };
type TokenView = { sourceToken: string; categoryName: string | null; categorySlug: string | null; method: string | null; unresolved: boolean; warnings: string[] };
type DecisionView = { primaryCategoryId: string; categories: Array<{ categoryId: string; sortOrder: number; name: string }>; resolvedBy: string | null; resolvedAt: string | null; note: string | null } | null;
type EffectiveState = "AUTO_SINGLE" | "ADMIN_DECISION" | "REQUIRES_REVIEW";

const initialState: CategoryDecisionActionState = { ok: false, message: "" };

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60"><Save aria-hidden="true" size={17} />{pending ? "Zapisywanie…" : editing ? "Zapisz zmiany" : "Zapisz przypisanie kategorii"}</button>;
}

export function CategoryResolutionPanel({ candidateId, sourceValue, tokens, reanalysis, effectiveState, effectiveCategoryIds, activeCategories, currentDecision, canEdit }: {
  candidateId: string;
  sourceValue: string | null;
  tokens: TokenView[];
  reanalysis: { status: string; matchedCategoryNames: string[]; unresolvedTokens: string[] } | null;
  effectiveState: EffectiveState;
  effectiveCategoryIds: string[];
  activeCategories: CategoryOption[];
  currentDecision: DecisionView;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState<CategoryDecisionActionState, FormData>(async (_previous, formData) => saveCategoryDecision(formData), initialState);
  const initialValues = initialCategoryFormValues(currentDecision ? { primaryCategoryId: currentDecision.primaryCategoryId, categoryIds: currentDecision.categories.map((item) => item.categoryId) } : null, effectiveState, effectiveCategoryIds);
  const [primaryCategoryId, setPrimaryCategoryId] = useState(initialValues.primaryCategoryId);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialValues.selectedCategoryIds);
  const [editing, setEditing] = useState(shouldStartEditing(effectiveState, Boolean(currentDecision), canEdit));
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state]);

  const orderedSelected = useMemo(() => finalSelectedCategoryIds(primaryCategoryId, selectedCategoryIds), [primaryCategoryId, selectedCategoryIds]);
  const secondaryCategories = useMemo(() => secondaryCategoryOptions(activeCategories, primaryCategoryId), [activeCategories, primaryCategoryId]);
  const categoryName = (id: string) => activeCategories.find((category) => category.id === id)?.name ?? "Nieaktywna kategoria";
  const summaryCategories = currentDecision?.categories.map((item) => item.name) ?? effectiveCategoryIds.map(categoryName);
  const showForm = canEdit && editing;

  return <section className="mt-3 rounded-md border border-border bg-[#faf9f5] p-3" aria-labelledby={`category-decision-${candidateId}`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 id={`category-decision-${candidateId}`} className="font-bold">Kategorie</h3><p className="mt-1 text-xs text-muted-foreground">Decyzja dla importowanego miejsca</p></div><span className="rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">{effectiveState === "AUTO_SINGLE" ? "Automatycznie przypisano" : effectiveState === "ADMIN_DECISION" ? "Rozstrzygnięte przez administratora" : "Wymaga decyzji"}</span></div>
    <div className="mt-3 rounded-md border border-border bg-white p-3"><p className="text-xs font-bold uppercase text-muted-foreground">Pobrano z pliku</p><p className="mt-1 text-sm">{sourceValue || "—"}</p></div>
    {tokens.length ? <div className="mt-3"><p className="text-sm font-bold">Analiza systemu</p><ul className="mt-2 space-y-1 text-sm">{tokens.map((token, index) => <li key={`${token.sourceToken}-${index}`} className="rounded-md border border-border bg-white p-2"><span className="font-semibold">{token.sourceToken}</span>{token.unresolved ? <span className="ml-2 text-urgent">Nie rozpoznano</span> : <span className="ml-2">→ {token.categoryName ?? token.categorySlug}{token.method ? ` · po ${categoryMethodLabel(token.method)}` : ""}</span>}{token.warnings.length ? <span className="block text-xs text-muted-foreground">{token.warnings.join(", ")}</span> : null}</li>)}</ul></div> : null}
    {reanalysis ? <div className="mt-3 rounded-md border border-brand/25 bg-brand-soft/30 p-3 text-sm"><p className="font-bold">Ponowna analiza</p><p className="mt-1">{categoryMatchLabel(reanalysis.status)}: {reanalysis.matchedCategoryNames.join(", ") || "brak dopasowań"}</p>{reanalysis.unresolvedTokens.length ? <p className="mt-1 text-urgent">Nierozpoznano: {reanalysis.unresolvedTokens.join(", ")}</p> : null}</div> : null}
    {!showForm ? <div className="mt-3 border-t border-border pt-3 text-sm"><p className="font-bold">Aktualne przypisanie</p>{effectiveState === "AUTO_SINGLE" ? <><p className="mt-1">Główna: {summaryCategories[0] ?? "—"}</p>{reanalysis ? <p className="mt-1 text-muted-foreground">Wynik ponownej analizy: {categoryMatchLabel(reanalysis.status)}</p> : null}</> : effectiveState === "ADMIN_DECISION" ? <><p className="mt-1">Główna: {summaryCategories[0] ?? "—"}</p><p className="mt-1">Dodatkowe: {summaryCategories.slice(1).join(", ") || "brak"}</p>{currentDecision?.resolvedBy ? <p className="mt-1 text-muted-foreground">{currentDecision.resolvedBy}{currentDecision.resolvedAt ? ` · ${new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(currentDecision.resolvedAt))}` : ""}</p> : null}{currentDecision?.note ? <p className="mt-1 text-muted-foreground">Notatka: {currentDecision.note}</p> : null}</> : <><p className="mt-1 text-urgent">Wybierz kategorię główną, aby kontynuować.</p><p className="mt-1">Rozpoznane kategorie: {summaryCategories.join(", ") || "brak"}</p></>}{canEdit ? <button type="button" onClick={() => setEditing(true)} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong hover:bg-white">{effectiveState === "AUTO_SINGLE" ? "Zmień przypisanie" : effectiveState === "ADMIN_DECISION" ? "Edytuj przypisanie" : "Wybierz kategorię główną, aby kontynuować"}</button> : <p className="mt-3 text-sm text-muted-foreground">Decyzja kategorii jest tylko do odczytu dla tego rekordu.</p>}</div> : null}
    {showForm ? <form action={action} className="mt-4 space-y-3 border-t border-border pt-3"><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="primaryCategoryId" value={primaryCategoryId} /><input type="hidden" name="selectedCategoryIds" value={JSON.stringify(orderedSelected)} /><label className="block text-sm font-bold">Kategoria główna<select value={primaryCategoryId} onChange={(event) => { const value = event.target.value; setPrimaryCategoryId(value); setSelectedCategoryIds((current) => value ? [value, ...current.filter((id) => id !== value)] : current); }} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal" required><option value="">Wybierz kategorię główną</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><fieldset><legend className="text-sm font-bold">Dodatkowe kategorie</legend><div className="mt-1 grid gap-1.5 sm:grid-cols-2">{secondaryCategories.map((category) => { const selected = orderedSelected.includes(category.id); return <label key={category.id} className="flex min-h-11 items-center gap-2 rounded-md border border-border px-2 text-sm"><input type="checkbox" checked={selected} onChange={(event) => setSelectedCategoryIds((current) => event.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} className="h-5 w-5 accent-[#13ad87]" />{category.name}</label>; })}</div></fieldset><label className="block text-sm font-bold">Notatka <span className="font-normal text-muted-foreground">(opcjonalnie)</span><textarea name="note" maxLength={1000} defaultValue={currentDecision?.note ?? ""} className="mt-1 min-h-20 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal" /></label>{state.message ? <p role={state.ok ? undefined : "alert"} className={`text-sm font-semibold ${state.ok ? "text-brand-strong" : "text-[#8c2d0c]"}`}>{state.message}</p> : null}<SaveButton editing={Boolean(currentDecision)} /></form> : null}
  </section>;
}
