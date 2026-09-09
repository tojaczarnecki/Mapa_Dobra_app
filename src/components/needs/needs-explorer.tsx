"use client";

import { useMemo, useState } from "react";
import { NeedCard } from "./need-card";

type Need = { id: string; title: string; peopleNeeded: number; responsesCount: number; startsAt: string; endsAt: string; experienceRequired: boolean; requirements: string | null; place: { name: string; city: string; addressLine: string } | null; organization: { name: string } };
type Filter = "TODAY" | "WEEKEND" | "NO_EXPERIENCE";

const filterLabels: Record<Filter, string> = { TODAY: "Dziś", WEEKEND: "Weekend", NO_EXPERIENCE: "Bez doświadczenia" };

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
    if (filter === "NO_EXPERIENCE") return !need.experienceRequired;
    return true;
  }), [filter, needs, now]);
  const visible = filtered.slice(0, visibleCount);
  const groups = ["Dzisiaj", "Jutro", "W ten weekend", "Później"];
  const toggleFilter = (value: Filter) => { setFilter((current) => current === value ? null : value); setVisibleCount(8); setMobileExpanded(false); };

  return <div className="needs-explorer">
    <div className="needs-toolbar"><p className="needs-count">{needs.length} {needs.length === 1 ? "aktualna potrzeba w Łodzi" : "aktualnych potrzeb w Łodzi"}</p><div className="needs-quick-filters" role="group" aria-label="Szybkie filtry">{(Object.keys(filterLabels) as Filter[]).map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => toggleFilter(item)} className={`needs-filter ${filter === item ? "is-active" : ""}`}>{filterLabels[item]}</button>)}<button type="button" aria-expanded={showFilters} onClick={() => setShowFilters((open) => !open)} className="needs-filter needs-filter-more">Filtry</button></div></div>
    {showFilters ? <div className="needs-filter-disclosure">Wybierz filtr, aby zawęzić listę potrzeb. <button type="button" onClick={() => { toggleFilter("NO_EXPERIENCE"); setShowFilters(false); }} className="font-bold text-brand-strong underline-offset-2 hover:underline">Bez doświadczenia</button></div> : null}
    {visible.length ? <div className={mobileExpanded ? "needs-list is-expanded" : "needs-list"}>{(() => { let itemIndex = 0; return groups.map((group) => { const groupNeeds = visible.filter((need) => bucketFor(need.startsAt, now) === group); return groupNeeds.length ? <section key={group} className="needs-group" aria-labelledby={`needs-group-${group}`}><h2 id={`needs-group-${group}`} className="needs-group-title"><span className="sm:hidden">{group === "W ten weekend" ? "Weekend" : group}</span><span className="hidden sm:inline">{group}</span></h2>{groupNeeds.map((need) => { const index = itemIndex; itemIndex += 1; return <div key={need.id} className={index >= 6 ? "needs-list-limited" : undefined}><NeedCard {...need} /></div>; })}</section> : null; }); })()}</div> : <div className="needs-empty"><h2>Nie znaleźliśmy potrzeb pasujących do tych filtrów.</h2><p>Sprawdź ponownie później albo wyczyść filtry.</p><button type="button" onClick={() => setFilter(null)} className="needs-filter needs-filter-more">Wyczyść filtry</button></div>}
    {visibleCount < filtered.length || (!mobileExpanded && visible.length > 6) ? <button type="button" onClick={() => { setMobileExpanded(true); setVisibleCount((count) => count + 8); }} className="needs-load-more">Pokaż kolejne potrzeby</button> : null}
  </div>;
}
