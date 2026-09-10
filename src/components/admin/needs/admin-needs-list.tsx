"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Clock3, Users } from "lucide-react";
import { NeedForm } from "./need-form";
import { NeedStatusActions } from "./need-status-actions";
import { ResponseStatusForm } from "./response-status-form";

type Response = { id: string; firstName: string; phone: string | null; email: string | null; note: string | null; status: string; createdAt: string; updatedAt: string };
type Need = { id: string; title: string; description: string; peopleNeeded: number; startsAt: string; endsAt: string; signupDeadline: string | null; experienceRequired: boolean; requirements: string | null; locationNote: string | null; status: string; placeId?: string | null; organization?: { name: string } | null; place?: { name: string; addressLine: string } | null; responses: Response[] };
type View = "ACTIVE" | "DRAFTS" | "COMPLETED" | "CANCELLED";

const viewLabels: Record<View, string> = { ACTIVE: "Aktywne", DRAFTS: "Szkice", COMPLETED: "Zakończone", CANCELLED: "Anulowane" };
const statusLabels: Record<string, string> = { PUBLISHED: "Opublikowana", DRAFT: "Szkic", FILLED: "Komplet", CANCELLED: "Anulowana" };

function isExpired(need: Pick<Need, "status" | "endsAt">) {
  return need.status === "PUBLISHED" && new Date(need.endsAt).getTime() <= Date.now();
}

function viewForNeed(need: Pick<Need, "status" | "endsAt">): View {
  if (need.status === "DRAFT") return "DRAFTS";
  if (need.status === "FILLED" || isExpired(need)) return "COMPLETED";
  if (need.status === "CANCELLED") return "CANCELLED";
  return "ACTIVE";
}

function isPubliclyReadable(need: Pick<Need, "status" | "endsAt">) {
  return need.status === "PUBLISHED" && !isExpired(need);
}

function dateLabel(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(start);
  const time = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time.format(start)}–${time.format(end)}`;
}

function responseCountLabel(count: number) {
  if (count === 1) return "1 zgłoszenie";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return `${count} zgłoszenia`;
  return `${count} zgłoszeń`;
}

function confirmedCountLabel(confirmed: number, needed: number) {
  return `${confirmed} z ${needed} potwierdzonych osób`;
}

function NeedRow({ need, defaultPlaceId }: { need: Need; defaultPlaceId?: string }) {
  const placeId = need.placeId ?? defaultPlaceId ?? null;
  const confirmedCount = need.responses.filter((response) => response.status === "CONFIRMED").length;
  const newCount = need.responses.filter((response) => response.status === "NEW").length;
  const expired = isExpired(need);
  const isCompleted = need.status === "FILLED" || need.status === "CANCELLED" || expired;
  const statusLabel = expired ? "Po terminie" : statusLabels[need.status] ?? need.status;
  return <details className="group border-t border-border first:border-t-0">
    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
      <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide ${need.status === "PUBLISHED" && !expired ? "border-brand/30 bg-brand-soft text-brand-strong" : need.status === "DRAFT" ? "border-border bg-surface-muted text-muted-foreground" : "border-border bg-white text-muted-foreground"}`}>{statusLabel}</span>
      <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{need.title}</span><span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" size={13} />{dateLabel(need.startsAt, need.endsAt)}</span><span className="inline-flex items-center gap-1"><Users aria-hidden="true" size={13} />{confirmedCountLabel(confirmedCount, need.peopleNeeded)}</span></span></span>
      {newCount ? <span className="shrink-0 text-right text-xs font-extrabold text-brand-strong">{newCount} nowe {newCount === 1 ? "zgłoszenie" : newCount < 5 ? "zgłoszenia" : "zgłoszeń"}</span> : null}
      <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground sm:inline">{responseCountLabel(need.responses.length)}</span>
      <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div className="pb-5 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4"><div className="max-w-2xl"><p className="text-sm leading-6 text-muted-foreground">{need.description}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">{isCompleted ? confirmedCountLabel(confirmedCount, need.peopleNeeded) : `Potrzebne jeszcze ${Math.max(0, need.peopleNeeded - confirmedCount)} osób`} · {responseCountLabel(need.responses.length)}</p>{need.organization ? <p className="mt-2 text-xs font-semibold text-muted-foreground">{need.organization.name}{need.place ? ` · ${need.place.name}` : " · potrzeba organizacji"}</p> : null}{need.place?.addressLine ? <p className="mt-1 text-xs text-muted-foreground">{need.place.addressLine}</p> : null}</div>{isPubliclyReadable(need) ? <Link href={`/potrzeby/${need.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Zobacz publicznie</Link> : <span className="text-xs font-semibold text-muted-foreground">Brak aktywnego widoku publicznego</span>}</div>
      {!expired ? <div className="mt-4"><NeedStatusActions needId={need.id} placeId={placeId} status={need.status} /></div> : null}
      <details className="mt-4"><summary className="cursor-pointer text-sm font-bold text-brand-strong">Edytuj potrzebę</summary><div className="mt-3"><NeedForm placeId={placeId} need={{ ...need, startsAt: new Date(need.startsAt), endsAt: new Date(need.endsAt) }} /></div></details>
      {need.responses.length ? <div className="mt-4 border-t border-border pt-4"><h4 className="text-sm font-extrabold">Zgłoszenia</h4><div className="mt-2 grid gap-2">{need.responses.map((response) => <div key={response.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-muted p-3 text-sm"><div><p className="font-bold">{response.firstName} · {response.phone ?? response.email}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{response.status === "NEW" ? "Nowe" : response.status === "CONFIRMED" ? "Potwierdzone" : response.status === "DECLINED" ? "Odrzucone" : response.status}</p>{response.note ? <p className="mt-1 text-muted-foreground">{response.note}</p> : null}</div><ResponseStatusForm key={`${need.id}-${need.status}-${response.id}`} responseId={response.id} placeId={placeId} responseStatus={response.status as "NEW" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED"} /></div>)}</div></div> : <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">Brak zgłoszeń.</p>}
    </div>
  </details>;
}

export function AdminNeedsList({ placeId, needs, global = false, initialView = "ACTIVE" }: { placeId?: string; needs: Need[]; global?: boolean; initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const counts = needs.reduce<Record<View, number>>((result, need) => { result[viewForNeed(need)] += 1; return result; }, { ACTIVE: 0, DRAFTS: 0, COMPLETED: 0, CANCELLED: 0 });
  const visibleNeeds = needs.filter((need) => viewForNeed(need) === view);
  return <div className="mt-5">
    <div className={`grid border-b border-border ${global ? "grid-cols-4" : "grid-cols-3"}`} role="tablist" aria-label="Widoki potrzeb">
      {(global ? (Object.keys(viewLabels) as View[]) : (["ACTIVE", "DRAFTS", "COMPLETED"] as View[])).map((option) => <button key={option} type="button" role="tab" aria-selected={view === option} onClick={() => setView(option)} className={`min-h-11 border-b-2 px-2 text-sm font-extrabold transition-colors ${view === option ? "border-brand text-brand-strong" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{viewLabels[option]} <span className="ml-1 text-xs font-bold">{counts[option]}</span></button>)}
    </div>
    <div className="mt-1" aria-live="polite">{visibleNeeds.length ? visibleNeeds.map((need) => <NeedRow key={need.id} need={need} defaultPlaceId={placeId} />) : <p className="border-t border-border py-6 text-sm text-muted-foreground">Brak potrzeb w tym widoku.</p>}</div>
  </div>;
}
