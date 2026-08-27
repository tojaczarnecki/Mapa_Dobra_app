import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck } from "lucide-react";
import { SubmissionList } from "@/components/admin/submission-list";
import { facilityVerificationGate } from "@/lib/admin/facility-verification";
import { moderationStatusLabels } from "@/lib/admin/labels";
import { getDashboardData } from "@/lib/admin/submissions";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { classifyPlaceVerificationFreshness, type PlaceVerificationFreshness } from "@/lib/places/verification-freshness";

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

const freshnessLabels: Record<PlaceVerificationFreshness, string> = {
  fresh: "Dane aktualne",
  review: "Warto potwierdzić",
  stale: "Dane stare",
  unverified: "Brak potwierdzenia",
};

function freshnessBadgeClass(freshness: PlaceVerificationFreshness) {
  if (freshness === "fresh") return "border-brand/25 bg-brand-soft text-brand-strong";
  if (freshness === "review") return "border-[#e4b45a] bg-[#fff7e5] text-[#684500]";
  return "border-urgent/30 bg-urgent-soft text-[#8c2d0c]";
}

export default async function AdminDashboardPage() {
  const session = await requirePermission("VIEW_DASHBOARD");
  if (session.user.role === "PLACE_MANAGER") {
    const accesses = await prisma.userPlaceAccess.findMany({
      where: { adminUserId: session.user.id, active: true },
      include: { place: { include: { organization: { select: { name: true } }, accommodation: { include: { capacityGroups: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } } } },
      orderBy: { place: { name: "asc" } },
    });
    return <div className="space-y-5"><header><p className="text-sm font-bold text-brand-strong">Panel placówki</p><h1 className="mt-1 text-3xl font-bold">Moje placówki</h1><p className="mt-2 text-sm text-muted-foreground">Bieżące dane operacyjne przypisanych miejsc.</p></header>{accesses.length ? <div className="grid gap-4 lg:grid-cols-2">{accesses.map(({ place, permissions }) => { const activeGroups = place.accommodation?.capacityGroups ?? []; const known = activeGroups.map((group) => group.availableBeds).filter((value): value is number => value !== null); const total = known.reduce((sum, value) => sum + value, 0); const freshness = classifyPlaceVerificationFreshness(place.verificationStatus, place.verifiedAt); const confirmationGate = facilityVerificationGate(place.recordKind, place.publicationStatus, place.verificationQueueStatus); const canConfirmFreshness = permissions.includes("VERIFY_PLACES"); const needsConfirmation = freshness !== "fresh"; const canSelfConfirmNow = canConfirmFreshness && needsConfirmation && confirmationGate.allowed; const actionLabel = canSelfConfirmNow ? "Sprawdź i potwierdź dane" : permissions.includes("UPDATE_BED_AVAILABILITY") ? "Aktualizuj dostępność" : "Otwórz placówkę"; return <article key={place.id} className="rounded-lg border border-border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{place.name}</h2><p className="mt-1 text-sm text-muted-foreground">{place.addressLine}{place.organization ? ` · ${place.organization.name}` : ""}</p></div><div className="flex flex-wrap justify-end gap-2"><span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">Przypisana</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${freshnessBadgeClass(freshness)}`}><BadgeCheck aria-hidden="true" size={13} />{freshnessLabels[freshness]}</span></div></div>{place.accommodation ? <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-[#f5f3ed] p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Wolne miejsca</dt><dd className="mt-1 text-2xl font-bold">{known.length ? total : "?"}</dd></div><div><dt className="text-xs text-muted-foreground">Przyjęcia</dt><dd className="mt-1 font-bold">{place.accommodation.acceptsToday === "YES" ? "Aktywne" : place.accommodation.acceptsToday === "NO" ? "Wstrzymane" : "Brak danych"}</dd></div></dl> : <p className="mt-4 text-sm text-muted-foreground">To miejsce nie ma modułu noclegowego.</p>}{canSelfConfirmNow ? <p className="mt-3 text-sm font-semibold leading-5 text-muted-foreground">Dane wymagają ponownego sprawdzenia. Po weryfikacji możesz odświeżyć publiczną datę aktualności.</p> : null}<div className="mt-4 flex flex-wrap gap-2"><Link href={`/admin/moje-miejsca/${place.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold">{actionLabel}</Link></div></article>; })}</div> : <section className="rounded-lg border border-border bg-white p-6"><h2 className="font-bold">Brak przypisanych placówek</h2><p className="mt-2 text-sm text-muted-foreground">Skontaktuj się z administratorem Mapy Dobra, aby otrzymać dostęp.</p></section>}</div>;
  }
  if (!session.user.permissions.includes("MODERATE_SUBMISSIONS")) {
    const placeCount = session.user.permissions.includes("VIEW_PLACES") ? await prisma.place.count() : 0;
    return <div className="space-y-5"><header><p className="text-sm font-bold text-brand-strong">Panel administracyjny</p><h1 className="mt-1 text-3xl font-bold">Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Zakres widoku wynika z bieżących uprawnień konta.</p></header><section className="rounded-lg border border-border bg-white p-5"><h2 className="font-bold">Dostępne dane</h2><p className="mt-2 text-sm text-muted-foreground">Miejsca w zakresie odczytu: <strong className="text-foreground">{placeCount}</strong></p>{session.user.permissions.includes("VIEW_PLACES") ? <Link href="/admin/miejsca" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong">Otwórz miejsca</Link> : null}</section></div>;
  }
  const { metrics, latest } = await getDashboardData();

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
