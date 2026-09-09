import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { experienceRequirementLabel, remainingPeople } from "@/lib/needs/validation";
import { PublicActionLink } from "@/components/places/public-action-link";

type NeedCardProps = {
  id: string;
  title: string;
  peopleNeeded: number;
  responsesCount: number;
  startsAt: Date | string;
  endsAt: Date | string;
  experienceRequired: boolean;
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
  return <article className="need-card">
    <div className="need-card-layout">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-extrabold uppercase tracking-wide text-brand-strong"><span className="inline-flex items-center gap-1.5"><Users aria-hidden="true" size={14} />Potrzebne jeszcze {remaining} {declension(remaining)}</span><span className="font-semibold normal-case tracking-normal text-muted-foreground">{experienceRequirementLabel(props.experienceRequired)}</span></div>
        <h2 className="need-card-title"><Link href={`/potrzeby/${props.id}`} className="hover:text-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{props.title}</Link></h2>
        <p className="need-card-organization">{props.organization.name}</p>
        <div className="need-card-meta"><span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={15} />{dateFormatter.format(startsAt)} · {timeFormatter.format(startsAt)}–{timeFormatter.format(endsAt)}</span><span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" size={15} />{props.place ? `${props.place.name}, ${props.place.addressLine}` : "Łódź · potrzeba organizacji"}</span></div>
      </div>
      <div className="need-card-action"><span className="need-card-status">Aktualne</span><PublicActionLink href={`/potrzeby/${props.id}`} variant="primary" journey="help" system chevron className="needs-detail-link">Zobacz szczegóły</PublicActionLink></div>
    </div>
  </article>;
}
