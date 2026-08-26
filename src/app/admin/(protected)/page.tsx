import Link from "next/link";
import { ArrowRight, ClipboardCheck, HeartHandshake, MapPinned, SearchCheck } from "lucide-react";
import { SubmissionList } from "@/components/admin/submission-list";
import { moderationStatusLabels } from "@/lib/admin/labels";
import { resolveAvailabilityState } from "@/lib/accommodations/freshness";
import { getDashboardData } from "@/lib/admin/submissions";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

const metricDescriptions = {
  PENDING: "Do weryfikacji",
  UNDER_REVIEW: "W trakcie weryfikacji",
  APPROVED: "Zatwierdzone",
  REJECTED: "Odrzucone",
} as const;

const metricLinks = {
  PENDING: "/admin/zgloszenia?status=pending",
  UNDER_REVIEW: "/admin/zgloszenia?status=under-review",
  APPROVED: "/admin/zgloszenia?status=approved",
  REJECTED: "/admin/zgloszenia?status=rejected",
} as const;

export default async function AdminDashboardPage() {
  const session = await requirePermission("VIEW_DASHBOARD");
  if (session.user.role === "PLACE_MANAGER") {
    const accesses = await prisma.userPlaceAccess.findMany({
      where: { adminUserId: session.user.id, active: true },
      include: { place: { include: { organization: { select: { name: true } }, accommodation: { include: { capacityGroups: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } } } },
      orderBy: { place: { name: "asc" } },
    });
    return <div className="space-y-5"><header><p className="text-sm font-bold text-brand-strong">Panel placówki</p><h1 className="mt-1 text-3xl font-bold">Moje placówki</h1><p className="mt-2 text-sm text-muted-foreground">Bieżące dane operacyjne przypisanych miejsc.</p></header>{accesses.length ? <div className="grid gap-4 lg:grid-cols-2">{accesses.map(({ place, permissions }) => { const activeGroups = place.accommodation?.capacityGroups ?? []; const known = activeGroups.map((group) => group.availableBeds).filter((value): value is number => value !== null); const total = known.reduce((sum, value) => sum + value, 0); const availabilityState = place.accommodation ? resolveAvailabilityState(place.accommodation.availabilityState, place.accommodation.availabilityConfirmedAt) : null; const updateLabel = place.accommodation?.availabilityConfirmedAt ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(place.accommodation.availabilityConfirmedAt) : "Brak potwierdzenia"; return <article key={place.id} className="rounded-lg border border-border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{place.name}</h2><p className="mt-1 text-sm text-muted-foreground">{place.addressLine}{place.organization ? ` · ${place.organization.name}` : ""}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${availabilityState === "STALE" ? "bg-[#fff4df] text-[#7a4a00]" : "bg-brand-soft text-brand-strong"}`}>{availabilityState === "STALE" ? "Do potwierdzenia" : "Przypisana"}</span></div>{place.accommodation ? <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-[#f5f3ed] p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Wolne miejsca</dt><dd className="mt-1 text-2xl font-bold">{known.length ? total : "?"}</dd></div><div><dt className="text-xs text-muted-foreground">Przyjęcia</dt><dd className="mt-1 font-bold">{place.accommodation.acceptsToday === "YES" ? "Aktywne" : place.accommodation.acceptsToday === "NO" ? "Wstrzymane" : "Brak danych"}</dd></div><div className="col-span-2 border-t border-border pt-2 text-xs text-muted-foreground">Ostatnie potwierdzenie: <strong className="text-foreground">{updateLabel}</strong></div></dl> : <p className="mt-4 text-sm text-muted-foreground">To miejsce nie ma modułu noclegowego.</p>}<div className="mt-4 flex flex-wrap gap-2"><Link href={`/admin/moje-miejsca/${place.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold">{permissions.includes("UPDATE_BED_AVAILABILITY") ? "Aktualizuj dostępność" : "Otwórz placówkę"}</Link></div></article>; })}</div> : <section className="rounded-lg border border-border bg-white p-6"><h2 className="font-bold">Brak przypisanych placówek</h2><p className="mt-2 text-sm text-muted-foreground">Skontaktuj się z administratorem Mapy Dobra, aby otrzymać dostęp.</p></section>}</div>;
  }
  if (!session.user.permissions.includes("MODERATE_SUBMISSIONS")) {
    const placeCount = session.user.permissions.includes("VIEW_PLACES") ? await prisma.place.count() : 0;
    return <div className="space-y-5"><header><p className="text-sm font-bold text-brand-strong">Panel administracyjny</p><h1 className="mt-1 text-3xl font-bold">Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Zakres widoku wynika z bieżących uprawnień konta.</p></header><section className="rounded-lg border border-border bg-white p-5"><h2 className="font-bold">Dostępne dane</h2><p className="mt-2 text-sm text-muted-foreground">Miejsca w zakresie odczytu: <strong className="text-foreground">{placeCount}</strong></p>{session.user.permissions.includes("VIEW_PLACES") ? <Link href="/admin/miejsca" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong">Otwórz miejsca</Link> : null}</section></div>;
  }
  const { metrics, latest, actionCounts } = await getDashboardData();
  const can = (permission: (typeof session.user.permissions)[number]) => session.user.permissions.includes(permission);

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-bold text-brand-strong">Panel administratora</p>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stan kolejki publicznych zgłoszeń Mapy Dobra.
          </p>
        </div>
        <Link
          href="/admin/zgloszenia?status=pending"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-[#10231e] transition hover:bg-brand-strong hover:text-white"
        >
          <ClipboardCheck aria-hidden="true" size={19} />
          Otwórz kolejkę
        </Link>
      </header>

      <section aria-labelledby="action-items-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-strong">Priorytety</p><h2 id="action-items-heading" className="text-xl font-bold">Do zrobienia</h2></div>
          <p className="text-sm text-muted-foreground">Najważniejsze kolejki na teraz</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {can("MODERATE_SUBMISSIONS") ? <ActionItem href="/admin/zgloszenia?status=pending" label="Nowe zgłoszenia" description="Czekają na moderację" count={actionCounts.submissions} icon={ClipboardCheck} /> : null}
          {can("VIEW_HELP_REQUESTS") ? <ActionItem href="/admin/zgloszenia-pomocy?status=NEW" label="Zgłoszenia pomocy" description="Wymagają reakcji" count={actionCounts.helpRequests} icon={HeartHandshake} tone="urgent" /> : null}
          {can("VERIFY_PLACES") ? <ActionItem href="/admin/weryfikacja" label="Miejsca do weryfikacji" description="Kolejka jakości danych" count={actionCounts.verification} icon={SearchCheck} tone="warning" /> : null}
          {can("UPDATE_BED_AVAILABILITY") || can("VIEW_PLACES") ? <ActionItem href="/admin/miejsca?accommodation=yes" label="Noclegi do sprawdzenia" description="Brak aktualizacji w 24 h" count={actionCounts.staleAccommodations} icon={MapPinned} tone="warning" /> : null}
        </div>
      </section>

      <section aria-labelledby="admin-areas-heading">
        <h2 id="admin-areas-heading" className="mb-3 text-lg font-bold">Obszary pracy</h2>
        <div className="divide-y divide-border border-y border-border bg-white">
          {can("VIEW_PLACES") ? <AreaRow href="/admin/miejsca" label="Miejsca" description="Baza miejsc, statusy i edycja" /> : null}
          {can("MODERATE_SUBMISSIONS") || can("VIEW_HELP_REQUESTS") ? <AreaRow href="/admin/zgloszenia" label="Zgłoszenia" description="Zmiany, nowe miejsca i pomoc" /> : null}
          {can("VIEW_KNOWLEDGE") ? <AreaRow href="/admin/encyklopedia" label="Treści" description="Encyklopedia Dobra i kategorie" /> : null}
          {can("VIEW_ORGANIZATIONS") ? <AreaRow href="/admin/organizacje" label="Organizacje" description="Organizacje i dostęp do miejsc" /> : null}
          {can("VIEW_IMPORTS") ? <AreaRow href="/admin/importy" label="Narzędzia" description="Importy i operacje techniczne" /> : null}
        </div>
      </section>

      <section aria-labelledby="queue-status-heading">
        <h2 id="queue-status-heading" className="mb-4 text-lg font-bold">
          Status zgłoszeń
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Link
              key={metric.status}
              href={metricLinks[metric.status]}
              className="rounded-lg border border-border bg-white p-4 transition hover:border-brand hover:shadow-sm"
              aria-label={`${moderationStatusLabels[metric.status]}: ${metric.total}`}
            >
              <p className="text-sm font-bold text-muted-foreground">
                {metricDescriptions[metric.status]}
              </p>
              <p className="mt-1.5 text-3xl font-bold leading-none">{metric.total}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2.5 text-xs text-muted-foreground">
                <span>Zmiany: <strong className="text-foreground">{metric.placeUpdates}</strong></span>
                <span>Nowe: <strong className="text-foreground">{metric.newPlaces}</strong></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="latest-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="latest-heading" className="text-lg font-bold">Najnowsze zgłoszenia</h2>
          <Link
            href="/admin/zgloszenia"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"
          >
            Wszystkie
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
        <SubmissionList items={latest} compact />
      </section>
    </div>
  );
}

function ActionItem({ href, label, description, count, icon: Icon, tone = "neutral" }: { href: string; label: string; description: string; count: number; icon: typeof ClipboardCheck; tone?: "neutral" | "warning" | "urgent" }) {
  const toneClass = tone === "urgent" ? "border-urgent/40" : tone === "warning" ? "border-[#d7a548]/60" : "border-border";
  return <Link href={href} className={`group flex min-w-0 items-start gap-3 rounded-lg border bg-white p-4 transition hover:border-brand hover:shadow-sm ${toneClass}`}><Icon aria-hidden="true" className={tone === "urgent" ? "mt-0.5 shrink-0 text-urgent" : tone === "warning" ? "mt-0.5 shrink-0 text-[#9a6815]" : "mt-0.5 shrink-0 text-brand-strong"} size={19} /><span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span><span className="text-2xl font-bold leading-none">{count}</span><ArrowRight aria-hidden="true" className="mt-1 shrink-0 text-muted-foreground transition group-hover:text-brand-strong" size={17} /></Link>;
}

function AreaRow({ href, label, description }: { href: string; label: string; description: string }) {
  return <Link href={href} className="group flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-brand-soft/40"><span className="min-w-0"><strong className="block text-sm">{label}</strong><span className="block text-xs text-muted-foreground">{description}</span></span><ArrowRight aria-hidden="true" className="shrink-0 text-muted-foreground group-hover:text-brand-strong" size={18} /></Link>;
}
