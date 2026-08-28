import Link from "next/link";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { DetailSection, InfoRows } from "@/components/admin/detail-section";
import { OrganizationStatusForm } from "@/components/admin/organizations/organization-status-form";
import { PlacePublicationBadge } from "@/components/admin/places/place-publication-badge";
import { PlaceRecordBadge } from "@/components/admin/places/place-record-badge";
import { operationalStatusLabels } from "@/lib/places/constants";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const auditActionLabels: Record<string, string> = {
  ORGANIZATION_CREATED: "Utworzono organizację",
  ORGANIZATION_UPDATED: "Zmieniono dane organizacji",
  ORGANIZATION_ARCHIVED: "Zarchiwizowano organizację",
  ORGANIZATION_RESTORED: "Przywrócono organizację",
};

function placeCountLabel(count: number) {
  if (count === 1) return "1 miejsce";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return `${count} miejsca`;
  return `${count} miejsc`;
}

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("VIEW_ORGANIZATIONS");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const [organization, history] = await Promise.all([
    prisma.organization.findUnique({
      where: { id },
      include: {
        places: {
          include: { primaryCategory: true, categories: { include: { category: true }, orderBy: { sortOrder: "asc" } } },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.auditLog.findMany({ where: { entityType: "ORGANIZATION", entityId: id }, include: { adminUser: { select: { displayName: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  if (!organization) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/organizacje" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} /> Wróć do organizacji</Link>
      <header className="rounded-lg border border-border bg-white p-4 sm:flex sm:items-end sm:justify-between sm:gap-5 sm:p-5">
        <div className="min-w-0"><span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${organization.active ? "border-brand/35 bg-brand-soft text-[#086b55]" : "border-border bg-surface-muted text-muted-foreground"}`}>{organization.active ? "Aktywna" : "Zarchiwizowana"}</span><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{organization.name}</h1><p className="mt-1 text-sm text-muted-foreground">Prowadzi {placeCountLabel(organization.places.length)}</p></div>
        <Link href={`/admin/organizacje/${id}/edytuj`} className="mt-3 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white sm:mt-0"><Pencil aria-hidden="true" size={17} /> Edytuj organizację</Link>
      </header>

      <DetailSection title="Podstawowe informacje">
        <InfoRows rows={[
          { label: "Nazwa", value: organization.name },
          { label: "Opis", value: organization.description || "Brak opisu" },
          { label: "Telefon", value: organization.phone ? <a className="font-bold text-brand-strong underline" href={`tel:${organization.phone}`}>{organization.phone}</a> : "Nie podano" },
          { label: "E-mail", value: organization.email ? <a className="font-bold text-brand-strong underline" href={`mailto:${organization.email}`}>{organization.email}</a> : "Nie podano" },
          { label: "WWW", value: organization.website ? <a className="inline-flex items-center gap-1 font-bold text-brand-strong underline" href={organization.website} target="_blank" rel="noreferrer">{organization.website}<ExternalLink aria-hidden="true" size={15} /></a> : "Nie podano" },
        ]} />
      </DetailSection>

      {(organization.nip || organization.regon || organization.krs) ? <DetailSection title="Dane rejestrowe"><InfoRows rows={[
        ...(organization.nip ? [{ label: "NIP", value: organization.nip }] : []),
        ...(organization.regon ? [{ label: "REGON", value: organization.regon }] : []),
        ...(organization.krs ? [{ label: "KRS", value: organization.krs }] : []),
      ]} /></DetailSection> : null}

      <DetailSection title="Prowadzone miejsca">
        {organization.places.length ? <ul className="divide-y divide-border">{organization.places.map((place) => (
          <li key={place.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(180px,1.2fr)_minmax(170px,1fr)_auto] lg:items-center">
            <div><Link href={`/admin/miejsca/${place.id}`} className="font-bold text-brand-strong hover:underline">{place.name}</Link><p className="mt-0.5 text-xs text-muted-foreground">{place.categories.map((item) => item.category.name).join(" · ")}</p></div>
            <div className="text-sm"><p>{place.addressLine}</p><p className="mt-1 font-semibold">{operationalStatusLabels[place.operationalStatus]}</p></div>
            <div className="flex flex-wrap gap-2"><PlacePublicationBadge status={place.publicationStatus} /><PlaceRecordBadge kind={place.recordKind} /></div>
          </li>
        ))}</ul> : <p className="text-sm text-muted-foreground">Ta organizacja nie prowadzi jeszcze żadnego miejsca.</p>}
      </DetailSection>

      <DetailSection title="Historia zmian">
        {history.length ? <ol className="divide-y divide-border">{history.map((entry) => <li key={entry.id} className="py-3 text-sm first:pt-0 last:pb-0"><strong>{entry.adminUser.displayName}</strong> · {formatDate(entry.createdAt)}<p className="mt-1 text-muted-foreground">{auditActionLabels[entry.action] ?? entry.action.replaceAll("_", " ")} · {entry.changedFields.join(", ") || "bez zmian pól"}</p></li>)}</ol> : <p className="text-sm text-muted-foreground">Brak zarejestrowanych zmian.</p>}
      </DetailSection>

      {organization.places.length === 0 || !organization.active ? <OrganizationStatusForm id={id} active={organization.active} /> : <p className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground">Archiwizacja jest niedostępna, dopóki organizacja prowadzi miejsca.</p>}
    </div>
  );
}
