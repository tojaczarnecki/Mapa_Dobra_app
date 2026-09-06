import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { remainingPeople } from "@/lib/needs/validation";

type NeedCardProps = {
  id: string;
  title: string;
  peopleNeeded: number;
  responsesCount: number;
  startsAt: Date | string;
  endsAt: Date | string;
  requirements: string | null;
  place: { name: string; city: string; addressLine: string } | null;
  organization: { name: string };
};

const timeFormatter = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" });

function declension(value: number) {
  return value === 1 ? "osoba" : value < 5 ? "osoby" : "osób";
}

export function NeedCard(props: NeedCardProps) {
  const startsAt = new Date(props.startsAt);
  const endsAt = new Date(props.endsAt);
  const remaining = remainingPeople(props.peopleNeeded, props.responsesCount);
  return <article className="min-h-[150px] border-t border-border py-4 first:border-t-0 sm:min-h-0 sm:py-5">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-extrabold uppercase tracking-wide text-brand-strong"><span className="inline-flex items-center gap-1.5"><Users aria-hidden="true" size={14} />Potrzebne jeszcze {remaining} {declension(remaining)}</span><span className="font-semibold normal-case tracking-normal text-muted-foreground">{props.requirements ? "Wymagane doświadczenie" : "Bez doświadczenia"}</span></div>
        <h2 className="mt-2 text-lg font-extrabold leading-tight sm:text-xl"><Link href={`/potrzeby/${props.id}`} className="hover:text-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{props.title}</Link></h2>
        <p className="mt-1 truncate text-sm font-bold text-brand-strong">{props.place?.name ?? props.organization.name} <span className="font-normal text-muted-foreground">· {props.organization.name}</span></p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={14} />{dateFormatter.format(startsAt)} · {timeFormatter.format(startsAt)}–{timeFormatter.format(endsAt)}</span><span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" size={14} />{props.place?.city ?? "Łódź"}</span></div>
      </div>
      <Link href={`/potrzeby/${props.id}`} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Mogę pomóc <ArrowRight aria-hidden="true" size={17} /></Link>
    </div>
  </article>;
}
