"use client";

import { useMemo, useState } from "react";
import { NeedCard } from "./need-card";

type Need = { id: string; title: string; peopleNeeded: number; responsesCount: number; startsAt: string; endsAt: string; requirements: string | null; place: { name: string; city: string; addressLine: string } | null; organization: { name: string } };
type Filter = "TODAY" | "WEEKEND" | "NO_EXPERIENCE" | "NEAREST";

const filterLabels: Record<Filter, string> = { TODAY: "Dziś", WEEKEND: "Weekend", NO_EXPERIENCE: "Bez doświadczenia", NEAREST: "Najbliżej" };

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function bucketFor(startsAt: string, now: Date) {
  const date = startOfDay(new Date(startsAt));
  const today = startOfDay(now);
  if (date === today) return "Dzisiaj";
  if (date === today + 86400000) return "Jutro";
  const daysToSaturday = now.getDay() === 0 ? 6 : 6 - now.getDay();
  const saturday = today + daysToSaturday * 86400000;
  if (date === saturday || date === saturday + 86400000) return "W ten weekend";
  return "Później";
}

export function NeedsExplorer({ needs }: { needs: Need[] }) {
  const [filter, setFilter] = useState<Filter | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const now = useMemo(() => new Date(), []);
  const filtered = useMemo(() => needs.filter((need) => {
    if (filter === "TODAY") return bucketFor(need.startsAt, now) === "Dzisiaj";
    if (filter === "WEEKEND") return bucketFor(need.startsAt, now) === "W ten weekend";
    if (filter === "NO_EXPERIENCE") return !need.requirements;
    return true;
  }), [filter, needs, now]);
  const visible = filtered.slice(0, visibleCount);
  const groups = ["Dzisiaj", "Jutro", "W ten weekend", "Później"];
  const toggleFilter = (value: Filter) => { setFilter((current) => current === value ? null : value); setVisibleCount(8); setMobileExpanded(false); };

  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3"><p className="text-sm font-bold text-foreground">{needs.length} {needs.length === 1 ? "aktualna potrzeba w Łodzi" : "aktualnych potrzeb w Łodzi"}</p><div className="flex flex-wrap gap-1.5" role="group" aria-label="Szybkie filtry">{(Object.keys(filterLabels) as Filter[]).map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => toggleFilter(item)} className={`min-h-10 rounded-full border px-3 text-xs font-bold transition-colors ${filter === item ? "border-brand bg-brand-soft text-brand-strong" : "border-border text-muted-foreground hover:border-brand/50 hover:text-foreground"}`}>{filterLabels[item]}</button>)}<button type="button" aria-expanded={showFilters} onClick={() => setShowFilters((open) => !open)} className="min-h-10 rounded-full border border-border px-3 text-xs font-bold text-muted-foreground hover:border-brand/50 hover:text-foreground">Filtry</button></div></div>
    {showFilters ? <div className="border-b border-border py-3 text-sm text-muted-foreground">Wybierz filtr, aby zawęzić listę potrzeb. <button type="button" onClick={() => { toggleFilter("NO_EXPERIENCE"); setShowFilters(false); }} className="font-bold text-brand-strong underline-offset-2 hover:underline">Bez doświadczenia</button></div> : null}
    {visible.length ? <div className={mobileExpanded ? "mobile-needs-expanded mt-2" : "mt-2"}>{(() => { let itemIndex = 0; return groups.map((group) => { const groupNeeds = visible.filter((need) => bucketFor(need.startsAt, now) === group); return groupNeeds.length ? <section key={group} aria-labelledby={`needs-group-${group}`}><h2 id={`needs-group-${group}`} className="mt-5 border-b border-brand/20 pb-2 text-sm font-extrabold text-brand-strong first:mt-0"><span className="sm:hidden">{group === "W ten weekend" ? "Weekend" : group}</span><span className="hidden sm:inline">{group}</span></h2>{groupNeeds.map((need) => { const index = itemIndex; itemIndex += 1; return <div key={need.id} className={index >= 6 ? "hidden sm:block" : undefined}><NeedCard {...need} /></div>; })}</section> : null; }); })()}</div> : <p className="border-t border-border py-8 text-sm text-muted-foreground">Nie znaleźliśmy potrzeb pasujących do tego filtra.</p>}
    {visibleCount < filtered.length || (!mobileExpanded && visible.length > 6) ? <button type="button" onClick={() => { setMobileExpanded(true); setVisibleCount((count) => count + 8); }} className="mt-6 inline-flex min-h-11 rounded-lg border border-brand px-4 py-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft">Pokaż kolejne potrzeby</button> : null}
  </>;
}
