import Link from "next/link";
import { Filter, HeartHandshake, MapPin, ShieldCheck } from "lucide-react";
import type { HelpRequestNeed, HelpRequestStatus, HelpRequestUrgency } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/admin/session";
import { getHelpRequestList, helpRequestNeedLabels, helpRequestStatusLabels, helpRequestUrgencyLabels } from "@/lib/admin/help-requests";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const statuses = ["NEW", "REVIEWING", "FORWARDED", "RESOLVED", "REJECTED"] as const;
const urgencies = ["IMMEDIATE", "STANDARD", "UNKNOWN"] as const;
const needs = Object.keys(helpRequestNeedLabels) as HelpRequestNeed[];

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function HelpRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("VIEW_HELP_REQUESTS");
  const params = await searchParams;
  const status = statuses.includes(first(params.status) as HelpRequestStatus) ? first(params.status) as HelpRequestStatus : undefined;
  const urgency = urgencies.includes(first(params.urgency) as HelpRequestUrgency) ? first(params.urgency) as HelpRequestUrgency : undefined;
  const need = needs.includes(first(params.need) as HelpRequestNeed) ? first(params.need) as HelpRequestNeed : undefined;
  const items = await getHelpRequestList({ status, urgency, need });

  return (
    <div className="space-y-5">
      <header><p className="mb-1 flex items-center gap-2 text-sm font-bold text-[#9a6815]"><HeartHandshake aria-hidden="true" size={18} />Wsparcie</p><h1 className="text-3xl font-bold">Uruchomiona pomoc</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Informacje od osób, które martwią się o kogoś. Nie oceniamy i nie etykietujemy — sprawdzamy, jak można uruchomić wsparcie.</p></header>
      <div className="flex items-start gap-3 rounded-lg border border-[#d7a548]/55 bg-[#fffaf0] p-4 text-sm leading-6"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[#b7791f]" size={19} /><p>To prywatna kolejka. Dane kontaktowe i dokładna lokalizacja są widoczne tylko dla uprawnionych osób.</p></div>
      <form method="get" className="grid gap-2.5 rounded-lg border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto] lg:items-end"><label className="text-sm font-bold"><span className="mb-1 block text-xs">Status</span><select name="status" defaultValue={status ?? ""} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Wszystkie</option>{statuses.map((item) => <option key={item} value={item}>{helpRequestStatusLabels[item]}</option>)}</select></label><label className="text-sm font-bold"><span className="mb-1 block text-xs">Pilność</span><select name="urgency" defaultValue={urgency ?? ""} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Wszystkie</option>{urgencies.map((item) => <option key={item} value={item}>Pilność: {helpRequestUrgencyLabels[item]}</option>)}</select></label><label className="text-sm font-bold"><span className="mb-1 block text-xs">Rodzaj potrzeby</span><select name="need" defaultValue={need ?? ""} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Wszystkie</option>{needs.map((item) => <option key={item} value={item}>{helpRequestNeedLabels[item]}</option>)}</select></label><button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#d79a2b] px-4 text-sm font-bold text-[#352307] hover:bg-[#c48821]"><Filter aria-hidden="true" size={18} />Zastosuj</button></form>
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{items.length} {items.length === 1 ? "informacja" : "informacji"} w kolejce</p>{status || urgency || need ? <Link href="/admin/zgloszenia-pomocy" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft">Wyczyść filtry</Link> : null}</div>
      {items.length ? <ol className="space-y-2">{items.map((item) => <li key={item.id} className="rounded-lg border border-border bg-white p-3 transition-colors hover:border-[#d7a548]/80 hover:bg-[#fffdf7] sm:p-3.5"><div className="grid min-w-0 gap-2.5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1.15fr)_minmax(0,1fr)_auto] lg:items-center"><div className="min-w-0"><p className="text-xs font-bold uppercase text-muted-foreground">{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(item.createdAt)}</p><h2 className="mt-0.5 font-bold leading-5">{item.needs.map((needItem) => helpRequestNeedLabels[needItem]).join(" · ")}</h2><p className="mt-0.5 line-clamp-2 text-sm leading-5 text-muted-foreground">{item.description}</p></div><div className="flex min-w-0 items-start gap-2 text-sm"><MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-[#b7791f]" size={17} /><span className="line-clamp-2">{item.addressText || (item.latitude !== null ? "Wskazano lokalizację na mapie" : "Miejsce opisane w treści")}</span></div><div className="flex flex-wrap items-center gap-1.5"><span className="rounded-full border border-border bg-surface-muted px-2 py-1 text-xs font-bold">{helpRequestStatusLabels[item.status]}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.urgency === "IMMEDIATE" ? "bg-[#fff1e9] text-[#8c2d0c]" : "bg-[#fff1cf] text-[#805712]"}`}>Pilność: {helpRequestUrgencyLabels[item.urgency]}</span><span className="text-xs text-muted-foreground">{item.anonymous ? "Anonimowo" : "Kontakt podany"}</span></div><Link href={`/admin/zgloszenia-pomocy/${item.id}`} className="inline-flex min-h-11 items-center justify-center justify-self-start rounded-lg bg-[#d79a2b] px-3.5 text-sm font-bold text-[#352307] hover:bg-[#c48821] lg:justify-self-end">Otwórz</Link></div></li>)}</ol> : <div className="rounded-lg border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted-foreground">Brak informacji pasujących do filtrów.</div>}
    </div>
  );
}
