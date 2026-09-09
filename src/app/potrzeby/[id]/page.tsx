import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { VolunteerResponseForm } from "@/components/needs/volunteer-response-form";
import { PlaceDetailMap } from "@/components/place-details/place-detail-map";
import { getPublicNeed } from "@/lib/needs/queries";
import { needSignupClosedMessage, resolveNeedSignupAvailability } from "@/lib/needs/availability";
import { directionsHref } from "@/lib/places/actions";
import { remainingPeople } from "@/lib/needs/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const need = await getPublicNeed((await params).id);
  return { title: need ? `${need.title} | Dobra Mapa` : "Potrzeba | Dobra Mapa" };
}

function peopleLabel(value: number) {
  return value === 1 ? "osoba" : value < 5 ? "osoby" : "osób";
}

export default async function NeedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const need = await getPublicNeed((await params).id);
  if (!need) return <div className="needs-detail-not-found"><h1>Ta potrzeba nie jest już aktywna.</h1><Link href="/potrzeby" className="needs-detail-link"><ArrowLeft aria-hidden="true" size={17} />Zobacz aktualne potrzeby</Link></div>;

  const now = new Date();
  const signup = resolveNeedSignupAvailability(need, now);
  const remaining = remainingPeople(need.peopleNeeded, need.responsesCount);
  const acceptsResponses = signup.open && remaining > 0;
  const dateFormatter = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = dateFormatter.format(need.startsAt);
  const timeLabel = `${timeFormatter.format(need.startsAt)}–${timeFormatter.format(need.endsAt)}`;
  const signupDeadlineLabel = need.signupDeadline ? dateTimeFormatter.format(need.signupDeadline) : null;
  const actionStatus = !signup.open
    ? "Zapisy zakończone"
    : remaining > 0
      ? "Aktualne"
      : "Mamy komplet";
  const actionTitle = acceptsResponses
    ? `Potrzebujemy jeszcze ${remaining} ${peopleLabel(remaining)}`
    : !signup.open
      ? "Zapisy są zamknięte"
      : "Mamy komplet";
  const closedMessage = !signup.open
    ? needSignupClosedMessage(signup.reason)
    : "Mamy już komplet osób. Ta potrzeba nie przyjmuje nowych zgłoszeń.";

  return <div className="needs-detail-page mx-auto w-full max-w-[1200px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10 lg:px-8">
    <Link href="/potrzeby" className="needs-back-link"><ArrowLeft aria-hidden="true" size={17} />Wróć do potrzeb</Link>
    <header className="needs-detail-hero">
      <p className="needs-eyebrow">{need.organization.name}</p>
      <h1>{need.title}</h1>
      <div className="needs-detail-facts" aria-label="Najważniejsze informacje">
        <span><MapPin aria-hidden="true" size={17} />{need.place?.name ?? "Cała organizacja"}</span>
        <span><CalendarDays aria-hidden="true" size={17} />{dateLabel} · {timeLabel}</span>
        <span><Users aria-hidden="true" size={17} />Potrzebujemy {need.peopleNeeded} {peopleLabel(need.peopleNeeded)}</span>
        <span>{need.experienceRequired ? "Wymagane doświadczenie" : "Bez doświadczenia"}</span>
        {signupDeadlineLabel ? <span><CalendarDays aria-hidden="true" size={17} />Zapisy do {signupDeadlineLabel}</span> : null}
      </div>
    </header>

    <div className="needs-detail-layout">
      <main className="needs-detail-content">
        <section className="needs-detail-section"><p className="needs-section-eyebrow">O potrzebie</p><h2>Na czym polega pomoc?</h2><p>{need.description}</p></section>
        <section className="needs-detail-section"><p className="needs-section-eyebrow">Termin</p><h2>Kiedy?</h2><div className="needs-detail-info-list"><p><CalendarDays aria-hidden="true" size={18} />{dateLabel}</p><p>{timeLabel}</p>{signupDeadlineLabel ? <p>Zapisy do {signupDeadlineLabel}</p> : null}</div></section>
        <section className="needs-detail-section"><p className="needs-section-eyebrow">Udział</p><h2>Kogo potrzebujemy?</h2><p className="needs-detail-strong"><Users aria-hidden="true" size={18} />Potrzebujemy {need.peopleNeeded} {peopleLabel(need.peopleNeeded)}.</p><p>{need.experienceRequired ? "Wymagane doświadczenie." : "Nie potrzebujesz wcześniejszego doświadczenia."}</p>{need.requirements ? <p>{need.requirements}</p> : null}</section>
        {need.place ? <section className="needs-detail-section needs-location-section"><p className="needs-section-eyebrow">Lokalizacja</p><h2>Gdzie będziesz pomagać?</h2><div className="needs-location-layout"><div><p className="needs-detail-strong"><MapPin aria-hidden="true" size={18} />{need.place.name}</p><p>{need.place.addressLine}</p>{need.locationNote ? <p className="needs-detail-muted">Wskazówka: {need.locationNote}</p> : null}{directionsHref({ latitude: need.place.latitude === null ? undefined : Number(need.place.latitude), longitude: need.place.longitude === null ? undefined : Number(need.place.longitude), address: need.place.addressLine }) ? <a className="needs-detail-link needs-location-route" href={directionsHref({ latitude: need.place.latitude === null ? undefined : Number(need.place.latitude), longitude: need.place.longitude === null ? undefined : Number(need.place.longitude), address: need.place.addressLine })!} target="_blank" rel="noreferrer">Wyznacz trasę <ArrowRight aria-hidden="true" size={17} /></a> : null}</div>{need.place.latitude !== null && need.place.longitude !== null ? <div className="needs-location-map"><PlaceDetailMap latitude={Number(need.place.latitude)} longitude={Number(need.place.longitude)} label={need.place.name} /></div> : null}</div></section> : null}
        <section className="needs-detail-section"><p className="needs-section-eyebrow">Organizator</p><h2>Organizator</h2><p className="needs-detail-strong">{need.organization.name}</p></section>
      </main>

      <aside className="needs-detail-rail">
        <div className="needs-action-card">
          <p className="needs-card-status">{actionStatus}</p>
          <h2 className={acceptsResponses ? "needs-action-title" : "needs-action-title needs-mobile-status"}>{actionTitle}</h2>
          <p className="needs-action-date"><CalendarDays aria-hidden="true" size={17} />{dateLabel} · {timeLabel}</p>
          {signupDeadlineLabel ? <p className="needs-action-date"><CalendarDays aria-hidden="true" size={17} />Zapisy do {signupDeadlineLabel}</p> : null}
          {acceptsResponses ? <VolunteerResponseForm needId={need.id} /> : <p className="needs-action-closed" role="status">{closedMessage}</p>}
          <Link href="/potrzeby" className="needs-detail-link needs-rail-secondary">Zobacz inne potrzeby <ArrowRight aria-hidden="true" size={17} /></Link>
        </div>
      </aside>
    </div>
  </div>;
}
