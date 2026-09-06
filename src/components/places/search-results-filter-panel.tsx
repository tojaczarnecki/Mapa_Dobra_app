"use client";

import Link from "next/link";
import { Check, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { filterPublicSearchPlaces, type PublicSearchFilters, type PublicSearchPlace } from "@/lib/places/search";

type FilterOption = { label: string; key: string; value: string; active: boolean };
type SearchResultsFilterPanelProps = {
  activeFilterCount: number;
  practicalFilters: FilterOption[];
  categories: FilterOption[];
  sortOptions: FilterOption[];
  baseParams: Record<string, string>;
  baseFilters: PublicSearchFilters;
  places: PublicSearchPlace[];
};
type DraftFilters = {
  category?: string;
  openNow: boolean;
  today: boolean;
  free: boolean;
  noReferral: boolean;
  noDocuments: boolean;
  sort: PublicSearchFilters["sort"];
};

function pluralPlaces(count: number) {
  if (count === 1) return "miejsce";
  if (count >= 2 && count <= 4) return "miejsca";
  return "miejsc";
}

function toDraft(filters: PublicSearchFilters): DraftFilters {
  return { category: filters.category, openNow: Boolean(filters.openNow), today: Boolean(filters.today), free: Boolean(filters.free), noReferral: Boolean(filters.noReferral), noDocuments: Boolean(filters.noDocuments), sort: filters.sort ?? "best" };
}

function OptionButton({ option, selected, onToggle }: { option: FilterOption; selected: boolean; onToggle: () => void }) {
  return <button type="button" className={["search-results-filter-option", selected ? "search-results-filter-option-active" : ""].join(" ")} aria-pressed={selected} onClick={onToggle}>{selected ? <Check aria-hidden="true" size={16} /> : null}<span>{option.label}</span></button>;
}

export function SearchResultsFilterPanel({ activeFilterCount, practicalFilters, categories, sortOptions, baseParams, baseFilters, places }: SearchResultsFilterPanelProps) {
  const [draft, setDraft] = useState(() => toDraft(baseFilters));
  const draftResultCount = useMemo(() => filterPublicSearchPlaces(places, { ...baseFilters, category: draft.category, openNow: draft.openNow, today: draft.today, free: draft.free, noReferral: draft.noReferral, noDocuments: draft.noDocuments, sort: draft.sort }).length, [baseFilters, draft, places]);

  function toggleBoolean(key: keyof Pick<DraftFilters, "openNow" | "today" | "free" | "noReferral" | "noDocuments">) {
    setDraft((current) => ({ ...current, [key]: !current[key] }));
  }

  function submitParams() {
    const params = new URLSearchParams(baseParams);
    ["kategoria", "otwarte", "dzisiaj", "bezplatne", "bez_skierowania", "bez_dokumentow", "sort"].forEach((key) => params.delete(key));
    if (draft.category) params.set("kategoria", draft.category);
    if (draft.openNow) params.set("otwarte", "1");
    if (draft.today) params.set("dzisiaj", "1");
    if (draft.free) params.set("bezplatne", "1");
    if (draft.noReferral) params.set("bez_skierowania", "1");
    if (draft.noDocuments) params.set("bez_dokumentow", "1");
    if (draft.sort && draft.sort !== "best") params.set("sort", draft.sort);
    return Array.from(params.entries());
  }

  const booleanKeys = { otwarte: "openNow", dzisiaj: "today", bezplatne: "free", bez_skierowania: "noReferral", bez_dokumentow: "noDocuments" } as const;
  return <details id="filtry-kategorie" className="search-results-filter-control">
    <summary className="search-control-filter search-results-filter-trigger" aria-label="Filtry i sortowanie" aria-controls="search-results-filter-panel"><SlidersHorizontal aria-hidden="true" size={21} />{activeFilterCount > 0 ? <span className="search-results-filter-badge" aria-label={`${activeFilterCount} aktywne filtry`}>{activeFilterCount}</span> : null}</summary>
    <section id="search-results-filter-panel" className="search-results-filter-panel" aria-label="Filtry i sortowanie">
      <div className="search-results-filter-panel-heading"><div><h2>Filtry i sortowanie</h2><p>Ustaw sposób wyszukiwania miejsc.</p></div><Link className="search-results-filter-reset" href="/szukaj"><RotateCcw aria-hidden="true" size={14} />Zresetuj</Link></div>
      <fieldset className="search-results-filter-group"><legend>Filtry</legend><div className="search-results-filter-options">{practicalFilters.map((option) => { const key = booleanKeys[option.key as keyof typeof booleanKeys]; return key ? <OptionButton key={option.key} option={option} selected={draft[key]} onToggle={() => toggleBoolean(key)} /> : null; })}</div></fieldset>
      <fieldset className="search-results-filter-group"><legend>Kategorie pomocy</legend><div className="search-results-filter-options">{categories.map((option) => <OptionButton key={option.value} option={option} selected={draft.category === option.value} onToggle={() => setDraft((current) => ({ ...current, category: current.category === option.value ? undefined : option.value }))} />)}</div></fieldset>
      <fieldset className="search-results-filter-group"><legend>Sortowanie</legend><div className="search-results-filter-options">{sortOptions.map((option) => <OptionButton key={option.value} option={option} selected={draft.sort === option.value} onToggle={() => setDraft((current) => ({ ...current, sort: option.value as DraftFilters["sort"] }))} />)}</div></fieldset>
      <form action="/szukaj" method="get" className="search-results-filter-submit">{submitParams().map(([name, value], index) => <input key={`${name}-${index}`} type="hidden" name={name} value={value} />)}{draftResultCount > 0 ? <button type="submit" className="search-results-filter-primary">Pokaż {draftResultCount} {pluralPlaces(draftResultCount)}</button> : <div className="search-results-filter-empty"><strong>Brak pasujących miejsc</strong><Link href="/szukaj">Zresetuj filtry</Link></div>}</form>
    </section>
  </details>;
}
