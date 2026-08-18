import Link from "next/link";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { DetailSection, InfoRows, TagList } from "@/components/admin/detail-section";
import { PlacePublicationBadge } from "@/components/admin/places/place-publication-badge";
import { PlaceRecordBadge } from "@/components/admin/places/place-record-badge";
import { PlaceStatusActions } from "@/components/admin/places/place-status-actions";
import { QuickAvailabilityForm } from "@/components/admin/places/quick-availability-form";
import { getAdminPlace, getAdminPlaceHistory } from "@/lib/places/admin-data";
import {
  accessibilityOptions,
  accommodationTypeLabels,
  operationalStatusLabels,
  petPolicyLabels,
  placeStatusLabels,
  sobrietyPolicyLabels,
  verificationSourceLabels,
  weekdayOptions,
} from "@/lib/places/constants";
import { isPubliclyVisiblePlace } from "@/lib/places/public-visibility";
import type { PlacePublicationStatusValue } from "@/types/place-admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const stateLabels = { YES: "Tak", NO: "Nie", UNKNOWN: "Brak danych" } as const;
const availabilityLabels = {
  AVAILABLE: "Są wolne miejsca", FEW: "Niewiele miejsc", FULL: "Brak miejsc",
  UNKNOWN: "Brak aktualnych danych", STALE: "Dane mogą być nieaktualne", SUSPENDED: "Przyjęcia wstrzymane",
} as const;
const auditActionLabels = {
  LOGIN: "Logowanie",
  STATUS_CHANGED: "Zmiana statusu zgłoszenia",
  APPROVED: "Zatwierdzenie zgłoszenia",
  REJECTED: "Odrzucenie zgłoszenia",
  PLACE_CREATED: "Utworzenie miejsca",
  PLACE_UPDATED: "Edycja miejsca",
  PLACE_PUBLISHED: "Publikacja miejsca",
  PLACE_STATUS_CHANGED: "Zmiana statusu miejsca",
  AVAILABILITY_UPDATED: "Aktualizacja dostępności",
  DRAFT_SAVED: "Zapis wersji roboczej",
  DRAFT_REBASED: "Odświeżenie wersji roboczej",
  SUBMISSION_PUBLISHED: "Publikacja zgłoszenia",
  ORGANIZATION_CREATED: "Utworzenie organizacji",
  ORGANIZATION_UPDATED: "Edycja organizacji",
  ORGANIZATION_ARCHIVED: "Archiwizacja organizacji",
  ORGANIZATION_RESTORED: "Przywrócenie organizacji",
  CATEGORY_CREATED: "Utworzenie kategorii",
  CATEGORY_UPDATED: "Edycja kategorii",
  CATEGORY_ACTIVATED: "Aktywacja kategorii",
  CATEGORY_DEACTIVATED: "Dezaktywacja kategorii",
  PLACE_IMPORTED: "Import miejsca",
} as const;
const originLabels = {
  DEMO_MIGRATION: "migracja danych demonstracyjnych",
  ADMIN_MANUAL: "ręczna zmiana administratora",
  USER_SUBMISSION: "zgłoszenie użytkownika",
  SOURCE_IMPORT: "import ze źródła",
} as const;
const fieldLabels: Record<string, string> = {
  name: "nazwa",
  slug: "slug",
  addressLine: "adres",
  phone: "telefon",
  email: "e-mail",
  website: "strona WWW",
  publicationStatus: "status publikacji",
  operationalStatus: "stan działania",
  categories: "kategorie",
  openingHours: "godziny",
  requirements: "warunki pomocy",
  accessibility: "dostępność",
  accommodation: "dane noclegowe",
};

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Brak";
}

function technicalJson(value: unknown) {
  return value === null || value === undefined ? "Brak" : JSON.stringify(value, null, 2);
}

export default async function AdminPlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const place = await getAdminPlace(id);
  if (!place) notFound();
  const history = await getAdminPlaceHistory(place.id, place.accommodation?.capacityGroups.map((group) => group.id) ?? []);
  const publicHref = `/${place.citySlug}/${place.primaryCategory.slug}/${place.slug}`;
  const operationHours = place.openingHours.filter((row) => row.kind === "OPERATION");
  const admissionHours = place.openingHours.filter((row) => row.kind === "ADMISSION");
  const canOpenPublicly = isPubliclyVisiblePlace(place);

  return (
    <div className="space-y-5">
      <Link href="/admin/miejsca" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft">
        <ArrowLeft aria-hidden="true" size={18} /> Wróć do miejsc
      </Link>
      <header className={`rounded-lg border border-border p-4 sm:p-5 ${place.recordKind === "TEST" ? "bg-urgent-soft/20" : "bg-white"}`}>
        <div className="sm:flex sm:items-end sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PlacePublicationBadge status={place.publicationStatus} />
              <PlaceRecordBadge kind={place.recordKind} />
              <span className="inline-flex min-h-7 items-center rounded-full border border-border bg-white px-2.5 py-1 text-xs font-bold">{operationalStatusLabels[place.operationalStatus]}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{place.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{place.addressLine}</p>
          </div>
          <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0 sm:justify-end">
          <Link href={`/admin/miejsca/${place.id}/edytuj`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white">
            <Pencil aria-hidden="true" size={17} /> Edytuj miejsce
          </Link>
          {canOpenPublicly ? (
            <Link href={publicHref} target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold hover:bg-surface-muted">
              <ExternalLink aria-hidden="true" size={17} /> Otwórz publicznie
            </Link>
          ) : null}
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <DetailSection title="Podstawowe dane"><InfoRows rows={[{ label: "Nazwa", value: place.name }, { label: "Slug", value: place.slug }, { label: "Typ", value: place.typeLabel ?? "Nie podano" }, { label: "Opis", value: place.description ?? "Nie podano" }, { label: "Dla kogo", value: place.audience.length ? place.audience.join(", ") : "Brak danych" }, { label: "Usługi", value: place.services.length ? place.services.join(", ") : "Brak danych" }]} /></DetailSection>
          <DetailSection title="Kategorie"><TagList items={place.categories.map((item) => item.category.name)} /></DetailSection>
          <DetailSection title="Organizacja"><InfoRows rows={[{ label: "Nazwa", value: place.organization ? <Link href={`/admin/organizacje/${place.organization.id}`} className="font-bold text-brand-strong hover:underline">{place.organization.name}</Link> : "Nie podano" }, { label: "Telefon", value: place.organization?.phone ?? "Nie podano" }, { label: "E-mail", value: place.organization?.email ?? "Nie podano" }, { label: "WWW", value: place.organization?.website ?? "Nie podano" }]} /></DetailSection>
          <DetailSection title="Adres"><InfoRows rows={[{ label: "Ulica", value: place.street ?? "Nie podano" }, { label: "Numer", value: place.buildingNumber ?? "Nie podano" }, { label: "Pełny adres", value: place.addressLine }, { label: "Kod pocztowy", value: place.postalCode ?? "Nie podano" }, { label: "Miasto", value: place.city }, { label: "Dzielnica", value: place.district ?? "Nie podano" }, { label: "Współrzędne", value: place.latitude !== null && place.longitude !== null ? `${place.latitude}, ${place.longitude}` : "Nie podano" }]} /></DetailSection>
          <DetailSection title="Kontakt"><InfoRows rows={[{ label: "Telefon", value: place.phone ?? "Nie podano" }, { label: "E-mail", value: place.email ?? "Nie podano" }, { label: "WWW", value: place.website ?? "Nie podano" }, { label: "Social media", value: place.socialMedia ?? "Nie podano" }]} /></DetailSection>
          <HoursSection title="Godziny działania" rows={operationHours} />
          {admissionHours.length ? <HoursSection title="Godziny przyjęć" rows={admissionHours} /> : null}
          <DetailSection title="Warunki otrzymania pomocy"><InfoRows rows={place.requirements.length ? place.requirements.map((item) => ({ label: item.label, value: `${stateLabels[item.state]}${item.note ? ` — ${item.note}` : ""}` })) : [{ label: "Informacje", value: "Brak danych" }]} /></DetailSection>
          <DetailSection title="Dostępność"><InfoRows rows={place.accessibility.length ? place.accessibility.map((item) => ({ label: item.label || accessibilityOptions.find((option) => option.feature === item.feature)?.label || item.feature, value: `${stateLabels[item.state]}${item.note ? ` — ${item.note}` : ""}` })) : [{ label: "Informacje", value: "Brak danych" }]} /></DetailSection>
          {place.accommodation ? <AccommodationSection placeId={place.id} accommodation={place.accommodation} /> : null}
          <HistorySection history={history} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-5">
          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="text-lg font-bold">Statusy</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div><dt className="font-bold text-muted-foreground">Publikacja</dt><dd className="mt-1">{placeStatusLabels[place.publicationStatus]}</dd><p className="mt-1 text-xs text-muted-foreground">Steruje widocznością miejsca.</p></div>
              <div><dt className="font-bold text-muted-foreground">Stan działania</dt><dd className="mt-1">{operationalStatusLabels[place.operationalStatus]}</dd><p className="mt-1 text-xs text-muted-foreground">Opisuje bieżące funkcjonowanie placówki.</p></div>
            </dl>
            <div className="mt-4 border-t border-border pt-4"><PlaceStatusActions placeId={place.id} currentStatus={place.publicationStatus as PlacePublicationStatusValue} /></div>
          </section>
          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="mb-3 text-lg font-bold">Weryfikacja</h2>
            <InfoRows rows={[{ label: "Status", value: place.verificationStatus === "VERIFIED" ? "Zweryfikowane" : place.verificationStatus === "NEEDS_CONFIRMATION" ? "Wymaga potwierdzenia" : "Niezweryfikowane" }, { label: "Kiedy", value: formatDate(place.verifiedAt) }, { label: "Przez", value: place.verifiedBy?.displayName ?? "Brak danych" }, { label: "Źródło", value: place.verificationSource ? verificationSourceLabels[place.verificationSource] : "Nie podano" }, { label: "Ostatnia edycja", value: place.lastEditedBy?.displayName ?? "Migracja danych" }]} />
            {place.internalNote ? <div className="mt-4 rounded-md border border-urgent/25 bg-urgent-soft/50 p-3 text-sm"><strong className="block">Notatka wewnętrzna</strong><p className="mt-1 leading-5">{place.internalNote}</p></div> : null}
            {place.createdFromImport ? (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                <strong className="block">Pochodzenie importu</strong>
                <Link href={`/admin/importy/${place.createdFromImport.importBatch.id}`} className="mt-1 inline-flex min-h-11 items-center font-bold text-brand-strong hover:underline">
                  {place.createdFromImport.importBatch.key}
                </Link>
                <p className="text-xs text-muted-foreground">Strony: {[...new Set(place.createdFromImport.sources.flatMap((source) => source.sourceEntry.sourcePages))].sort((a, b) => a - b).join(", ")}</p>
              </div>
            ) : null}
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

function AccommodationSection({ placeId, accommodation }: { placeId: string; accommodation: AdminAccommodation }) {
  const activeGroups = accommodation.capacityGroups.filter((group) => group.active);
  const inactiveGroups = accommodation.capacityGroups.filter((group) => !group.active);
  return (
    <DetailSection title="Nocleg">
      <InfoRows rows={[{ label: "Typ", value: accommodationTypeLabels[accommodation.type] }, { label: "Grupy docelowe", value: accommodation.targetGroups.length ? accommodation.targetGroups.join(", ") : "Brak danych" }, { label: "Dostępność", value: availabilityLabels[accommodation.availabilityState] }, { label: "Aktualizacja", value: formatDate(accommodation.availabilityConfirmedAt) }, { label: "Przyjmuje dzisiaj", value: stateLabels[accommodation.acceptsToday] }, { label: "Skierowanie", value: stateLabels[accommodation.referralRequired] }, { label: "Dokument", value: stateLabels[accommodation.documentRequired] }, { label: "Meldunek w Łodzi", value: stateLabels[accommodation.lodzRegistrationRequired] }, { label: "Trzeźwość", value: sobrietyPolicyLabels[accommodation.sobrietyPolicy] }, { label: "Zwierzęta", value: petPolicyLabels[accommodation.petPolicy] }, { label: "Usługi opiekuńcze", value: stateLabels[accommodation.careServices] }, { label: "Wyżywienie", value: accommodation.mealsInfo ?? "Brak danych" }, { label: "Higiena", value: accommodation.hygieneInfo ?? "Brak danych" }, { label: "Bagaż", value: accommodation.luggageInfo ?? "Brak danych" }, { label: "Godzina powrotu", value: accommodation.returnTimeInfo ?? "Brak danych" }, { label: "Maksymalny pobyt", value: accommodation.maxStayInfo ?? "Brak danych" }, { label: "Odpłatność", value: accommodation.feeInfo ?? "Brak danych" }]} />
      {activeGroups.length ? (
        <>
          <CapacityTable groups={activeGroups} />
          <QuickAvailabilityForm placeId={placeId} groups={activeGroups} />
        </>
      ) : <p className="mt-4 text-sm text-muted-foreground">Brak aktywnych pul miejsc.</p>}
      {inactiveGroups.length ? <div className="mt-4"><h3 className="mb-2 text-sm font-bold text-muted-foreground">Pule wyłączone</h3><CapacityTable groups={inactiveGroups} muted /></div> : null}
      {accommodation.availabilityHistory.length ? (
        <div className="mt-5"><h3 className="mb-2 text-sm font-bold">Ostatnie aktualizacje dostępności</h3><ol className="divide-y divide-border rounded-lg border border-border">{accommodation.availabilityHistory.slice(0, 8).map((item) => <li key={item.id} className="px-3 py-2.5 text-sm"><strong>{item.availableBeds ?? "Brak danych"} wolnych</strong> z {item.totalBeds ?? "?"} · {formatDate(item.reportedAt)}<span className="block text-xs text-muted-foreground">{item.adminUser?.displayName ?? (item.origin === "DEMO_MIGRATION" ? "Migracja DEMO" : item.origin)}</span></li>)}</ol></div>
      ) : null}
    </DetailSection>
  );
}

function CapacityTable({ groups, muted = false }: { groups: Array<{ id: string; label: string; availableBeds: number | null; totalBeds: number | null }>; muted?: boolean }) {
  return <div className={`mt-5 overflow-hidden rounded-lg border border-border ${muted ? "opacity-65" : ""}`}><div className="grid grid-cols-[minmax(0,1fr)_90px_90px] bg-[#f5f3ed] px-3 py-2 text-xs font-bold uppercase text-muted-foreground"><span>Pula</span><span>Wolne</span><span>Razem</span></div>{groups.map((group) => <div key={group.id} className="grid grid-cols-[minmax(0,1fr)_90px_90px] border-t border-border px-3 py-2.5 text-sm"><strong>{group.label}</strong><span>{group.availableBeds ?? "?"}</span><span>{group.totalBeds ?? "?"}</span></div>)}</div>;
}

type PlaceHistory = Awaited<ReturnType<typeof getAdminPlaceHistory>>;

function HistorySection({ history }: { history: PlaceHistory }) {
  return (
    <DetailSection title="Historia zmian">
      {history.length ? <ol className="divide-y divide-border">{history.map((entry) => {
        const fields = entry.changedFields.map((field) => fieldLabels[field] ?? (field.startsWith("capacityGroups.") ? field.replace("capacityGroups.", "pula: ").replace(".availableBeds", " — wolne miejsca") : field));
        return <li key={entry.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="text-sm">{auditActionLabels[entry.action]}</strong><time className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</time></div><p className="mt-1 text-sm text-muted-foreground">{entry.adminUser.displayName}{entry.changeOrigin ? ` · ${originLabels[entry.changeOrigin]}` : ""}{entry.sourceType ? ` · ${verificationSourceLabels[entry.sourceType]}` : ""}</p>{fields.length ? <p className="mt-2 text-sm"><strong>Zmieniono:</strong> {fields.join(", ")}</p> : null}{entry.note ? <p className="mt-1 text-sm">{entry.note}</p> : null}<details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-brand-strong">Pokaż szczegóły techniczne</summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><pre className="max-h-64 overflow-auto rounded-md bg-[#f5f3ed] p-2 whitespace-pre-wrap"><strong>Przed</strong>{"\n"}{technicalJson(entry.previousValues)}</pre><pre className="max-h-64 overflow-auto rounded-md bg-[#f5f3ed] p-2 whitespace-pre-wrap"><strong>Po</strong>{"\n"}{technicalJson(entry.newValues)}</pre></div></details></li>;
      })}</ol> : <p className="text-sm text-muted-foreground">Brak zapisanej historii zmian tego miejsca.</p>}
    </DetailSection>
  );
}
