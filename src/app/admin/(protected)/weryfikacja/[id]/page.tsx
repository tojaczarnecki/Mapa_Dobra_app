import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleHelp, ExternalLink, Play, X } from "lucide-react";
import { notFound } from "next/navigation";
import { startCandidateVerification, startPlaceVerification } from "@/app/admin/(protected)/weryfikacja/actions";
import { CandidateResolutionPanel } from "@/components/admin/verification/candidate-resolution-panel";
import { ContactWorkflow } from "@/components/admin/verification/contact-workflow";
import { LocationEditor } from "@/components/admin/verification/location-editor";
import { VerificationActions } from "@/components/admin/verification/verification-actions";
import { VerificationStatusBadge } from "@/components/admin/verification/verification-status-badge";
import { WorkingDataForm } from "@/components/admin/verification/working-data-form";
import { normalizeComparable } from "@/lib/imports/caritas-gdzie-parser";
import { getAdminPlace, getAdminPlaceFormOptions, toPlaceAdminPayload } from "@/lib/places/admin-data";
import { scheduleFromRows } from "@/lib/places/opening-hours";
import { accommodationTypeLabels, petPolicyLabels, sobrietyPolicyLabels } from "@/lib/places/constants";
import { prisma } from "@/lib/prisma";
import { getVerificationCompleteness } from "@/lib/verification/completeness";
import { contactReasonsBlockingPublication } from "@/lib/verification/contact";
import { getCandidateComparisonOptions, getVerificationNavigation } from "@/lib/verification/queue";
import { requirePermission } from "@/lib/admin/session";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export default async function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("VERIFY_PLACES");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const place = await getAdminPlace(id);
  const navigation = await getVerificationNavigation(id);
  if (place?.verificationQueueStatus) return <PlaceVerification place={place} navigation={navigation} allowedToPublish={session.user.permissions.includes("PUBLISH_PLACES")} />;
  const candidate = await getCandidateWithRelations(id);
  if (!candidate?.queueStatus) notFound();
  return <CandidateVerification candidate={candidate} navigation={navigation} />;
}

async function PlaceVerification({ place, navigation, allowedToPublish }: { place: NonNullable<Awaited<ReturnType<typeof getAdminPlace>>>; navigation: Awaited<ReturnType<typeof getVerificationNavigation>>; allowedToPublish: boolean }) {
  const [options] = await Promise.all([getAdminPlaceFormOptions()]);
  const payload = toPlaceAdminPayload(place);
  const rawOpeningHours = place.createdFromImport?.sources.map((item) => item.sourceEntry.rawOpeningHours).filter(Boolean).join("\n") || null;
  const blockingContactReasons = place.verificationQueueStatus === "CONTACT_REQUIRED"
    ? contactReasonsBlockingPublication(place.verificationContact?.reasons ?? [], Boolean(place.accommodation))
    : [];
  const complete = getVerificationCompleteness({
    name: place.name,
    addressLine: place.addressLine,
    latitude: place.latitude === null ? null : Number(place.latitude),
    longitude: place.longitude === null ? null : Number(place.longitude),
    locationSource: place.locationSource,
    phone: place.phone,
    email: place.email,
    website: place.website,
    recordKind: place.recordKind,
    publicationStatus: place.publicationStatus,
    verificationStatus: place.verificationStatus,
    verifiedAt: place.verifiedAt,
    verificationSource: place.verificationSource,
    primaryCategoryActive: place.primaryCategory.active,
    categoryCount: place.categories.length,
    hasKnownOpeningHours: place.openingHours.some((row) => row.status !== "UNKNOWN"),
    hasKnownRequirements: place.requirements.some((row) => row.state !== "UNKNOWN"),
    hasImportSource: Boolean(place.createdFromImport),
    hasUnresolvedConflict: place.importMatchCandidates.length > 0,
    blockingContactReasons,
    accommodation: Boolean(place.accommodation),
    accommodationTargetGroupCount: place.accommodation?.targetGroups.length ?? 0,
  });
  return (
    <div className="space-y-5">
      <VerificationNav {...navigation} />
      <header className="rounded-lg border border-border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-brand-strong">Nowe miejsce z importu</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{place.name}</h1><p className="mt-2 text-sm text-muted-foreground">{place.addressLine}</p><div className="mt-3 flex flex-wrap gap-2"><VerificationStatusBadge status={place.verificationQueueStatus!} /><span className="inline-flex min-h-7 items-center rounded-full border border-border px-2.5 py-1 text-xs font-bold">{place.recordKind}</span><span className="inline-flex min-h-7 items-center rounded-full border border-border px-2.5 py-1 text-xs font-bold">{place.publicationStatus}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold"><WorkflowPill complete={place.latitude !== null && place.longitude !== null && place.locationSource !== null} label="Lokalizacja" /><WorkflowPill complete={place.verificationStatus === "VERIFIED"} label="Weryfikacja" />{place.verificationQueueStatus === "CONTACT_REQUIRED" ? <span className="inline-flex min-h-7 items-center rounded-full border border-[#d7a548] bg-[#fff4d8] px-2.5 py-1 text-[#684500]">Kontakt wymagany</span> : null}<WorkflowPill complete={complete.readyToPublish} label="Gotowe" /></div></div>{place.verificationQueueStatus === "PENDING" ? <form action={startPlaceVerification.bind(null, place.id)}><button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft"><Play aria-hidden="true" size={17} />Rozpocznij weryfikację</button></form> : null}</div></header>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start"><main className="min-w-0 space-y-5">
        {place.createdFromImport ? <SourceData sources={place.createdFromImport.sources.map((item) => item.sourceEntry)} sourceUrl={place.createdFromImport.importBatch.sourceUrl} /> : null}
        <WorkingDataForm place={{ id: place.id, name: payload.name, addressLine: payload.addressLine, street: payload.street, buildingNumber: payload.buildingNumber, postalCode: payload.postalCode, city: payload.city, district: payload.district, phone: payload.phone, email: payload.email, website: payload.website, organizationId: payload.organizationId, primaryCategorySlug: payload.primaryCategorySlug, categorySlugs: payload.categorySlugs }} categories={options.categories} organizations={options.organizations} openingDays={scheduleFromRows(place.openingHours, "OPERATION")} rawOpeningHours={rawOpeningHours} nextId={navigation.nextId} />
        <LocationEditor placeId={place.id} nextId={navigation.nextId} address={place.addressLine} initialLatitude={place.latitude === null ? null : Number(place.latitude)} initialLongitude={place.longitude === null ? null : Number(place.longitude)} initialSource={place.locationSource} />
        <ContactWorkflow placeId={place.id} phone={place.phone} email={place.email} website={place.website} organization={place.organization?.name ?? null} contact={place.verificationContact ? { reasons: place.verificationContact.reasons, requiredNote: place.verificationContact.requiredNote, requiredAt: place.verificationContact.requiredAt.toISOString(), requiredBy: place.verificationContact.requiredByAdminUser.displayName, contactedAt: place.verificationContact.contactedAt?.toISOString() ?? null, contactMethod: place.verificationContact.contactMethod, contactResult: place.verificationContact.contactResult, contactedBy: place.verificationContact.contactedByAdminUser?.displayName ?? null } : null} />
        {place.accommodation ? <AccommodationReview accommodation={place.accommodation} admissionHours={scheduleFromRows(place.openingHours, "ADMISSION")} /> : null}
        <VerificationActions placeId={place.id} canPublish={complete.readyToPublish && place.verificationQueueStatus === "READY"} allowedToPublish={allowedToPublish} isProduction={place.recordKind === "PRODUCTION"} publicationStatus={place.publicationStatus} />
      </main><aside className="space-y-4 xl:sticky xl:top-4"><CompletenessPanel checks={complete.checks} ready={complete.readyToPublish} /><section className="rounded-lg border border-brand/25 bg-brand-soft/35 p-4"><h2 className="font-bold">Źródło historyczne</h2><p className="mt-2 text-sm leading-6">Przewodnik 2025/2026 służy jako pochodzenie importu. Dane wymagają aktualnego potwierdzenia w sierpniu 2026.</p></section></aside></div>
    </div>
  );
}

async function CandidateVerification({ candidate, navigation }: { candidate: NonNullable<Awaited<ReturnType<typeof prisma.importCandidate.findUnique>>> & Record<string, unknown>; navigation: Awaited<ReturnType<typeof getVerificationNavigation>> }) {
  const typed = candidate as Awaited<ReturnType<typeof getCandidateWithRelations>>;
  if (!typed) notFound();
  const [comparison, options] = await Promise.all([getCandidateComparisonOptions(typed.id), getAdminPlaceFormOptions()]);
  const proposed = typed.proposedData as Record<string, unknown>;
  const organizationId = options.organizations.find((item) => normalizeComparable(item.name) === normalizeComparable(typed.proposedOrganizationName ?? ""))?.id ?? "";
  return (
    <div className="space-y-5">
      <VerificationNav {...navigation} />
      <header className="rounded-lg border border-border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-urgent">{typed.resolution ? "Rozstrzygnięty kandydat importowy" : "Kandydat wymagający ręcznej decyzji"}</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{typed.proposedName}</h1><p className="mt-2 text-sm text-muted-foreground">{typed.proposedAddress ?? "Brak stałego adresu"}</p><div className="mt-3 flex flex-wrap gap-2"><VerificationStatusBadge status={typed.queueStatus!} /><span className="inline-flex min-h-7 items-center rounded-full border border-border px-2.5 py-1 text-xs font-bold">{typed.status}</span></div></div>{typed.queueStatus === "PENDING" ? <form action={startCandidateVerification.bind(null, typed.id)}><button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft"><Play aria-hidden="true" size={17} />Rozpocznij analizę</button></form> : null}</div></header>
      <div className="grid gap-5 xl:grid-cols-2"><SourceData sources={typed.sources.map((item) => item.sourceEntry)} sourceUrl={typed.importBatch.sourceUrl} /><section className="rounded-lg border border-border bg-white p-4 sm:p-5"><p className="text-xs font-bold uppercase text-brand-strong">Propozycja importera</p><h2 className="mt-1 text-xl font-bold">Dane robocze kandydata</h2><dl className="mt-3 divide-y divide-border text-sm"><Row label="Nazwa" value={typed.proposedName} /><Row label="Organizacja" value={typed.proposedOrganizationName ?? "Brak danych"} /><Row label="Adres" value={typed.proposedAddress ?? "Brak stałego adresu"} /><Row label="Telefon" value={typed.proposedPhone ?? "Brak danych"} /><Row label="Kategorie" value={typed.categorySlugs.join(" · ") || "Brak klasyfikacji"} /><Row label="Główna kategoria" value={typed.primaryCategorySlug ?? "Wymaga decyzji"} /><Row label="Godziny źródłowe" value={typeof proposed.rawOpeningHours === "string" ? proposed.rawOpeningHours : "UNKNOWN"} /></dl>{typed.reviewReasons.length ? <ul className="mt-3 space-y-1 rounded-md border border-urgent/25 bg-urgent-soft/30 p-3 text-sm">{typed.reviewReasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul> : null}</section></div>
      <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><h2 className="text-xl font-bold">Porównanie możliwych rekordów</h2><p className="mt-1 text-sm text-muted-foreground">Ten sam adres jest tylko wskazówką, nigdy samodzielną podstawą scalenia.</p>{comparison.suggestions.length ? <div className="mt-3 grid gap-2">{comparison.suggestions.map((place) => <article key={place.id} className="rounded-lg border border-border p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{place.name}</h3><p className="mt-1 text-sm">{place.addressLine}</p><p className="mt-1 text-xs text-muted-foreground">{place.organization?.name ?? "Brak organizacji"} · {place.categories.map((item) => item.category.name).join(" · ")}</p></div><Link href={`/admin/miejsca/${place.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Otwórz miejsce</Link></div></article>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Nie znaleziono wiarygodnego podobnego miejsca w bazie.</p>}{comparison.relatedCandidates.length ? <div className="mt-4"><h3 className="text-sm font-bold">Podobni kandydaci w tej paczce</h3><ul className="mt-2 space-y-1 text-sm">{comparison.relatedCandidates.map((item) => <li key={item.id}><Link href={`/admin/weryfikacja/${item.id}`} className="font-semibold text-brand-strong hover:underline">{item.proposedName}</Link> · {item.proposedAddress ?? "brak adresu"}</li>)}</ul></div> : null}</section>
      {typed.createdPlace ? <div className="rounded-lg border border-brand/35 bg-brand-soft p-4"><strong>Utworzony szkic:</strong> <Link href={`/admin/weryfikacja/${typed.createdPlace.id}`} className="font-bold text-brand-strong hover:underline">{typed.createdPlace.name}</Link></div> : null}
      {typed.resolution ? <section className="rounded-lg border border-brand/30 bg-brand-soft/35 p-4 sm:p-5"><h2 className="text-xl font-bold">Decyzja została zapisana</h2><dl className="mt-3 divide-y divide-brand/20 text-sm"><Row label="Rozstrzygnięcie" value={typed.resolution === "SAME_PLACE" ? "To to samo miejsce" : typed.resolution === "DIFFERENT_PLACE" ? "To różne miejsca" : "Pominięto"} /><Row label="Administrator" value={typed.resolvedBy?.displayName ?? "Administrator"} /><Row label="Data" value={typed.resolvedAt ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(typed.resolvedAt) : "Brak daty"} /><Row label="Notatka" value={typed.resolutionNote ?? "Bez notatki"} /></dl><p className="mt-3 text-sm text-muted-foreground">Dane źródłowe i rozstrzygnięcie pozostają w historii. Decyzja nie publikuje miejsca.</p></section> : <CandidateResolutionPanel candidateId={typed.id} initial={{ name: typed.proposedName, address: typed.proposedAddress ?? "", categorySlugs: typed.categorySlugs.filter((slug) => options.categories.some((item) => item.slug === slug && item.active)), primaryCategorySlug: typed.primaryCategorySlug ?? typed.categorySlugs[0] ?? "", organizationId, matchedPlaceId: typed.matchedPlaceId ?? "" }} categories={options.categories} organizations={options.organizations} places={comparison.allPlaces.map((item) => ({ id: item.id, name: item.name, addressLine: item.addressLine }))} />}
    </div>
  );
}

async function getCandidateWithRelations(id: string) {
  return prisma.importCandidate.findUnique({ where: { id }, include: { importBatch: true, sources: { include: { sourceEntry: true } }, matchedPlace: true, createdPlace: { select: { id: true, name: true } }, resolvedBy: { select: { displayName: true } } } });
}

function VerificationNav({ previousId, nextId, position, total }: Awaited<ReturnType<typeof getVerificationNavigation>>) {
  return <nav aria-label="Nawigacja kolejki" className="flex flex-wrap items-center justify-between gap-2"><Link href="/admin/weryfikacja" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} />Wróć do kolejki</Link><p className="text-sm font-bold text-muted-foreground">{position ? `${position} z ${total}` : "Pozycja poza aktywną kolejką"}</p><div className="flex gap-2">{previousId ? <Link href={`/admin/weryfikacja/${previousId}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold"><ArrowLeft aria-hidden="true" size={17} />Poprzednie</Link> : null}{nextId ? <Link href={`/admin/weryfikacja/${nextId}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold">Następne<ArrowRight aria-hidden="true" size={17} /></Link> : null}</div></nav>;
}

function WorkflowPill({ complete, label }: { complete: boolean; label: string }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 ${complete ? "border-brand/35 bg-brand-soft text-[#075f53]" : "border-border bg-[#efede7] text-muted-foreground"}`}>{label} {complete ? "✓" : "—"}</span>;
}

function SourceData({ sources, sourceUrl }: { sources: Array<{ id: string; section: string; sourcePages: number[]; rawName: string; rawAddress: string | null; rawPhone: string | null; rawEmail: string | null; rawWebsite: string | null; rawOpeningHours: string | null; rawAdmissionHours: string | null; rawAssistanceDescription: string | null; rawText: string }>; sourceUrl: string }) {
  return <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-urgent">Niezmienny zapis źródłowy</p><h2 className="mt-1 text-xl font-bold">Dane z PDF</h2></div><a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ExternalLink aria-hidden="true" size={17} />Otwórz PDF</a></div><div className="mt-3 space-y-3">{sources.map((source) => <article key={source.id} className="rounded-lg border border-border bg-[#faf9f5] p-3"><p className="text-xs font-bold uppercase text-muted-foreground">{source.section} · strony {source.sourcePages.join(", ")}</p><dl className="mt-2 divide-y divide-border text-sm"><Row label="Nazwa" value={source.rawName} /><Row label="Adres" value={source.rawAddress ?? "Brak w źródle"} /><Row label="Telefon" value={source.rawPhone ?? "Brak w źródle"} /><Row label="E-mail / WWW" value={[source.rawEmail, source.rawWebsite].filter(Boolean).join(" · ") || "Brak w źródle"} /><Row label="Godziny" value={source.rawOpeningHours ?? "Brak w źródle"} /><Row label="Godziny przyjęć" value={source.rawAdmissionHours ?? "Brak w źródle"} /><Row label="Forma pomocy" value={source.rawAssistanceDescription ?? "Brak w źródle"} /></dl><details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-brand-strong">Pokaż pełny zapis źródłowy</summary><pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-white p-3 font-sans text-sm">{source.rawText}</pre></details></article>)}</div></section>;
}

function CompletenessPanel({ checks, ready }: { checks: ReturnType<typeof getVerificationCompleteness>["checks"]; ready: boolean }) {
  return <section className="rounded-lg border border-border bg-white p-4"><h2 className="font-bold">Status kompletności</h2><ul className="mt-3 space-y-2">{checks.map((check) => { const Icon = check.state === "complete" ? Check : check.state === "missing" ? X : CircleHelp; return <li key={check.key} className="flex items-center justify-between gap-3 text-sm"><span>{check.label}</span><span className={`inline-flex items-center gap-1 font-bold ${check.state === "complete" ? "text-brand-strong" : check.state === "missing" ? "text-urgent" : "text-muted-foreground"}`}><Icon aria-hidden="true" size={16} />{check.state === "complete" ? "Tak" : check.state === "missing" ? "Brak" : check.state === "unknown" ? "UNKNOWN" : "Opcjonalne"}</span></li>; })}</ul><p className={`mt-4 rounded-md p-3 text-sm font-bold ${ready ? "bg-brand-soft text-brand-strong" : "bg-[#efede7] text-muted-foreground"}`}>{ready ? "Minimalne dane są gotowe do publikacji." : "Miejsce nie jest jeszcze gotowe do publikacji."}</p></section>;
}

function AccommodationReview({ accommodation, admissionHours }: { accommodation: NonNullable<NonNullable<Awaited<ReturnType<typeof getAdminPlace>>>["accommodation"]>; admissionHours: ReturnType<typeof scheduleFromRows> }) {
  return <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><h2 className="text-xl font-bold">Nocleg — kontrola przed publikacją</h2><dl className="mt-3 divide-y divide-border text-sm"><Row label="Typ" value={accommodationTypeLabels[accommodation.type]} /><Row label="Grupy docelowe" value={accommodation.targetGroups.join(" · ") || "Brak danych"} /><Row label="Godziny przyjęć" value={admissionHours.map((day) => day.status === "OPEN" ? `${day.weekday}: ${day.periods.map((period) => `${period.opensAt}-${period.closesAt}`).join(", ")}` : null).filter(Boolean).join("; ") || accommodation.admissionHoursDescription || "UNKNOWN"} /><Row label="Trzeźwość" value={sobrietyPolicyLabels[accommodation.sobrietyPolicy]} /><Row label="Zwierzęta" value={petPolicyLabels[accommodation.petPolicy]} /><Row label="Aktualna dostępność" value={accommodation.availabilityLabel ?? "UNKNOWN — potwierdź telefonicznie"} /></dl>{accommodation.capacityGroups.length ? <div className="mt-3"><h3 className="text-sm font-bold">Pule miejsc</h3><ul className="mt-2 divide-y divide-border rounded-md border border-border">{accommodation.capacityGroups.map((group) => <li key={group.id} className="flex justify-between gap-3 px-3 py-2 text-sm"><span>{group.label}</span><strong>{group.totalBeds ?? "?"} wszystkich · {group.availableBeds ?? "UNKNOWN"} wolnych</strong></li>)}</ul></div> : null}</section>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 py-2 sm:grid-cols-[150px_minmax(0,1fr)]"><dt className="font-bold text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap">{value}</dd></div>; }
