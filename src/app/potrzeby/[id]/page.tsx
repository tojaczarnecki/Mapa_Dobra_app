import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { VolunteerResponseForm } from "@/components/needs/volunteer-response-form";
import { getPublicNeed } from "@/lib/needs/queries";
import { remainingPeople } from "@/lib/needs/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const need = await getPublicNeed((await params).id);
  return { title: need ? `${need.title} | Dobra Mapa` : "Potrzeba | Dobra Mapa" };
}

export default async function NeedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const need = await getPublicNeed((await params).id);
  if (!need) return <div className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-3xl font-extrabold">Ta potrzeba nie jest już aktywna.</h1><Link href="/potrzeby" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-bold text-brand-strong"><ArrowLeft size={17} />Zobacz aktualne potrzeby</Link></div>;
  const remaining = remainingPeople(need.peopleNeeded, need.responsesCount);
  const formatter = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  const time = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
  return <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-10 sm:px-6 lg:px-8"><Link href="/potrzeby" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft size={17} />Aktualne potrzeby</Link><article className="mt-8 max-w-3xl"><p className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-brand-strong"><Users size={17} />Potrzebne jeszcze {remaining} {remaining === 1 ? "osoba" : remaining < 5 ? "osoby" : "osób"}</p><h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">{need.title}</h1><p className="mt-2 text-lg font-bold text-brand-strong">{need.place?.name ?? need.organization.name}</p><p className="mt-5 text-base leading-7 text-muted-foreground">{need.description}</p><div className="mt-6 grid gap-3 border-y border-border py-5 text-sm font-semibold sm:grid-cols-2"><span className="inline-flex items-center gap-2"><CalendarDays size={18} />{formatter.format(need.startsAt)} · {time.format(need.startsAt)}–{time.format(need.endsAt)}</span><span className="inline-flex items-center gap-2"><MapPin size={18} />{need.place?.city ?? "Łódź"}</span><span>{need.requirements ? `Potrzebne doświadczenie: ${need.requirements}` : "Bez doświadczenia"}</span>{need.locationNote ? <span>Wskazówka: {need.locationNote}</span> : null}</div><VolunteerResponseForm needId={need.id} /></article></div>;
}
