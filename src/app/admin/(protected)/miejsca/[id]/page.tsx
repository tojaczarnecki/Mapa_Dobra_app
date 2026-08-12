import Link from "next/link";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { DetailSection, InfoRows, TagList } from "@/components/admin/detail-section";
import { PlacePublicationBadge } from "@/components/admin/places/place-publication-badge";
import { PlaceStatusActions } from "@/components/admin/places/place-status-actions";
import { getAdminPlace } from "@/lib/places/admin-data";
import {
  accessibilityOptions,
  accommodationTypeLabels,
  petPolicyLabels,
  placeStatusLabels,
  sobrietyPolicyLabels,
  verificationSourceLabels,
  weekdayOptions,
} from "@/lib/places/constants";
import type { PlacePublicationStatusValue } from "@/types/place-admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const stateLabels = { YES: "Tak", NO: "Nie", UNKNOWN: "Brak danych" } as const;
const availabilityLabels = {
  AVAILABLE: "Są wolne miejsca", FEW: "Niewiele miejsc", FULL: "Brak miejsc",
  UNKNOWN: "Brak aktualnych danych", STALE: "Dane mogą być nieaktualne", SUSPENDED: "Przyjęcia wstrzymane",
} as const;

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Brak";
}

export default async function AdminPlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const place = await getAdminPlace(id);
  if (!place) notFound();
  const publicHref = `/lodz/${place.primaryCategory.slug}/${place.slug}`;
  const operationHours = place.openingHours.filter((row) => row.kind === "OPERATION");
  const admissionHours = place.openingHours.filter((row) => row.kind === "ADMISSION");

  return (
    <div className="space-y-5">
      <Link href="/admin/miejsca" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft">
        <ArrowLeft aria-hidden="true" size={18} />
        Wróć do miejsc
      </Link>
      <header className="rounded-lg border border-border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <PlacePublicationBadge status={place.publicationStatus} />
          {place.isDemo ? <span className="text-xs font-bold text-muted-foreground">DEMO</span> : null}
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{place.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{place.addressLine}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/admin/miejsca/${place.id}/edytuj`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white">
            <Pencil aria-hidden="true" size={17} /> Edytuj
          </Link>
          {place.publicationStatus !== "DRAFT" && place.publicationStatus !== "ARCHIVED" ? (
            <Link href={publicHref} target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold hover:bg-surface-muted">
              <ExternalLink aria-hidden="true" size={17} /> Widok publiczny
            </Link>
          ) : null}
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <DetailSection title="Podstawowe">
            <InfoRows rows={[
              { label: "Nazwa", value: place.name },
              { label: "Organizacja", value: place.organization?.name ?? "Nie podano" },
              { label: "Kategorie", value: <TagList items={place.categories.map((item) => item.category.name)} /> },
              { label: "Opis", value: place.description ?? "Nie podano" },
              { label: "Dla kogo", value: place.audience.length ? place.audience.join(", ") : "Brak danych" },
              { label: "Usługi", value: place.services.length ? place.services.join(", ") : "Brak danych" },
            ]} />
          </DetailSection>
          <DetailSection title="Adres i kontakt">
            <InfoRows rows={[
              { label: "Adres", value: place.addressLine },
              { label: "Dzielnica", value: place.district ?? "Nie podano" },
              { label: "Współrzędne", value: place.latitude !== null && place.longitude !== null ? `${place.latitude}, ${place.longitude}` : "Nie podano" },
              { label: "Telefon", value: place.phone ?? "Nie podano" },
              { label: "E-mail", value: place.email ?? "Nie podano" },
              { label: "WWW", value: place.website ?? "Nie podano" },
            ]} />
          </DetailSection>
          <HoursSection title="Godziny działania" rows={operationHours} />
          {admissionHours.length ? <HoursSection title="Godziny przyjęć" rows={admissionHours} /> : null}
          <DetailSection title="Warunki pomocy">
            <InfoRows rows={place.requirements.map((item) => ({ label: item.label, value: `${stateLabels[item.state]}${item.note ? ` — ${item.note}` : ""}` }))} />
          </DetailSection>
          <DetailSection title="Dostępność">
            <InfoRows rows={place.accessibility.map((item) => ({ label: item.label || accessibilityOptions.find((option) => option.feature === item.feature)?.label || item.feature, value: `${stateLabels[item.state]}${item.note ? ` — ${item.note}` : ""}` }))} />
          </DetailSection>
          {place.accommodation ? <AccommodationSection accommodation={place.accommodation} /> : null}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-5">
          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="mb-3 text-lg font-bold">Status i publikacja</h2>
            <p className="mb-4 text-sm text-muted-foreground">Aktualnie: <strong className="text-foreground">{placeStatusLabels[place.publicationStatus]}</strong></p>
            <PlaceStatusActions placeId={place.id} currentStatus={place.publicationStatus as PlacePublicationStatusValue} />
          </section>
          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="mb-3 text-lg font-bold">Weryfikacja</h2>
            <InfoRows rows={[
              { label: "Status", value: place.verificationStatus === "VERIFIED" ? "Zweryfikowane" : place.verificationStatus === "NEEDS_CONFIRMATION" ? "Wymaga potwierdzenia" : "Niezweryfikowane" },
              { label: "Kiedy", value: formatDate(place.verifiedAt) },
              { label: "Źródło", value: place.verificationSource ? verificationSourceLabels[place.verificationSource] : "Nie podano" },
              { label: "Ostatnia edycja", value: place.lastEditedBy?.displayName ?? "Migracja danych" },
            ]} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function HoursSection({ title, rows }: { title: string; rows: Array<{ weekday: string; status: string; opensAt: string | null; closesAt: string | null; note: string | null }> }) {
  const values = weekdayOptions.map((day) => {
    const matches = rows.filter((row) => row.weekday === day.value);
    if (!matches.length) return { label: day.label, value: "Brak danych" };
    if (matches[0].status === "CLOSED") return { label: day.label, value: "Zamknięte" };
    if (matches[0].status === "UNKNOWN") return { label: day.label, value: matches[0].note ?? "Brak potwierdzonych godzin" };
    return { label: day.label, value: matches.map((row) => `${row.opensAt ?? "?"}–${row.closesAt ?? "?"}`).join(", ") };
  });
  return <DetailSection title={title}><InfoRows rows={values} /></DetailSection>;
}

type AdminAccommodation = NonNullable<NonNullable<Awaited<ReturnType<typeof getAdminPlace>>>["accommodation"]>;

function AccommodationSection({ accommodation }: { accommodation: AdminAccommodation }) {
  return (
    <DetailSection title="Dane noclegowe">
      <InfoRows rows={[
        { label: "Typ", value: accommodationTypeLabels[accommodation.type] },
        { label: "Dostępność", value: availabilityLabels[accommodation.availabilityState] },
        { label: "Aktualizacja", value: formatDate(accommodation.availabilityConfirmedAt) },
        { label: "Przyjmuje dzisiaj", value: stateLabels[accommodation.acceptsToday] },
        { label: "Trzeźwość", value: sobrietyPolicyLabels[accommodation.sobrietyPolicy] },
        { label: "Zwierzęta", value: petPolicyLabels[accommodation.petPolicy] },
        { label: "Usługi opiekuńcze", value: stateLabels[accommodation.careServices] },
      ]} />
      {accommodation.capacityGroups.length ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] bg-[#f5f3ed] px-3 py-2 text-xs font-bold uppercase text-muted-foreground"><span>Pula</span><span>Wolne</span><span>Razem</span></div>
          {accommodation.capacityGroups.map((group) => (
            <div key={group.id} className="grid grid-cols-[minmax(0,1fr)_90px_90px] border-t border-border px-3 py-2.5 text-sm"><strong>{group.label}</strong><span>{group.availableBeds ?? "?"}</span><span>{group.totalBeds ?? "?"}</span></div>
          ))}
        </div>
      ) : null}
      {accommodation.availabilityHistory.length ? (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold">Ostatnie aktualizacje dostępności</h3>
          <ol className="divide-y divide-border rounded-lg border border-border">
            {accommodation.availabilityHistory.slice(0, 8).map((item) => (
              <li key={item.id} className="px-3 py-2.5 text-sm">
                <strong>{item.availableBeds ?? "?"} wolnych</strong> z {item.totalBeds ?? "?"} · {formatDate(item.reportedAt)}
                <span className="block text-xs text-muted-foreground">{item.adminUser?.displayName ?? (item.origin === "DEMO_MIGRATION" ? "Migracja DEMO" : item.origin)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </DetailSection>
  );
}
