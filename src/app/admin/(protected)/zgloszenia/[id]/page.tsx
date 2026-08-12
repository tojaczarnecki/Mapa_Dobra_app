import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { ModerationPanel } from "@/components/admin/moderation-panel";
import { SubmissionDraftEditor } from "@/components/admin/submission-draft-editor";
import {
  DetailSection,
  InfoRows,
  TagList,
} from "@/components/admin/detail-section";
import {
  categoryLabels,
  formatAdminDate,
  informationStateLabels,
  sourceTypeLabels,
  updateTypeLabels,
} from "@/lib/admin/labels";
import { getSubmissionDetail } from "@/lib/admin/submissions";
import { getOrCreateSubmissionDraft, getSubmissionDraft } from "@/lib/admin/submission-drafts";
import { requireAdmin } from "@/lib/admin/session";
import { prepareApprovedSubmissionDraft } from "../draft-actions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function ExternalUrl({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 font-semibold text-brand-strong underline decoration-brand/45 underline-offset-4"
    >
      {href}
      <ExternalLink aria-hidden="true" size={15} />
    </a>
  );
}

function ReporterContact({
  name,
  email,
  phone,
}: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const rows = [
    name ? { label: "Imię i nazwisko", value: name } : null,
    email
      ? {
          label: "E-mail",
          value: <a className="font-semibold text-brand-strong underline" href={`mailto:${email}`}>{email}</a>,
        }
      : null,
    phone
      ? {
          label: "Telefon",
          value: <a className="font-semibold text-brand-strong underline" href={`tel:${phone}`}>{phone}</a>,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  return (
    <DetailSection
      title="Kontakt do zgłaszającego"
      description="Te dane służą wyłącznie moderacji i nie są częścią publicznych danych miejsca."
      privateData
    >
      {rows.length > 0 ? <InfoRows rows={rows} /> : <p className="text-sm text-muted-foreground">Nie podano kontaktu.</p>}
    </DetailSection>
  );
}

function SourceInfo({
  sourceType,
  sourceUrl,
}: {
  sourceType?: keyof typeof sourceTypeLabels | null;
  sourceUrl?: string | null;
}) {
  if (!sourceType && !sourceUrl) return null;
  const rows = [
    sourceType ? { label: "Źródło", value: sourceTypeLabels[sourceType] } : null,
    sourceUrl ? { label: "Adres źródła", value: <ExternalUrl href={sourceUrl} /> } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  return (
    <DetailSection title="Źródło informacji">
      <InfoRows rows={rows} />
    </DetailSection>
  );
}

function currentOpeningHours(place: PlaceUpdateDetail["targetPlace"]) {
  if (!place) return undefined;
  return place.openingHours
    .filter((row) => row.kind === "OPERATION")
    .map((row) => {
      const value = row.status === "CLOSED"
        ? "Zamknięte"
        : row.status === "UNKNOWN"
          ? row.note ?? "Brak potwierdzonych godzin"
          : `${row.opensAt ?? "?"}-${row.closesAt ?? "?"}`;
      return `${row.weekday}: ${value}`;
    })
    .join("; ");
}

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const session = await requireAdmin();
  const detail = await getSubmissionDetail(id);
  if (!detail) notFound();

  const isPlaceUpdate = detail.kind === "place-update";
  const submission = detail.submission;
  const draft = submission.moderationStatus === "APPROVED" && submission.publicationStatus === "NOT_PUBLISHED"
    ? await getSubmissionDraft(id)
    : await getOrCreateSubmissionDraft(id, session.user.id);
  const title = isPlaceUpdate ? detail.submission.placeNameSnapshot : detail.submission.name;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/zgloszenia"
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Wróć do zgłoszeń
      </Link>

      <header className="rounded-lg border border-border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-brand-strong">
            {isPlaceUpdate ? "Zgłoszenie zmiany" : "Zgłoszenie nowego miejsca"}
          </span>
          <StatusBadge status={submission.moderationStatus} />
          {submission.publicationStatus === "PUBLISHED" ? (
            <span className="rounded-full border border-brand/40 bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">Zatwierdzone i opublikowane</span>
          ) : submission.moderationStatus === "APPROVED" ? (
            <span className="rounded-full border border-urgent/45 bg-urgent-soft px-2.5 py-1 text-xs font-bold text-[#8c2d0c]">Zatwierdzone, ale nieopublikowane</span>
          ) : (
            <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">Nieopublikowane</span>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>Zgłoszono: <strong className="text-foreground">{formatAdminDate(submission.createdAt)}</strong></span>
          <span>ID: <code className="text-xs text-foreground">{submission.id}</code></span>
          {submission.moderatedBy ? (
            <span>Moderator: <strong className="text-foreground">{submission.moderatedBy.displayName}</strong></span>
          ) : null}
        </div>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="order-2 min-w-0 space-y-5 lg:order-1">
          {draft ? (
            <SubmissionDraftEditor key={draft.updatedAt} draft={draft} status={submission.moderationStatus} publicationStatus={submission.publicationStatus} />
          ) : submission.moderationStatus === "APPROVED" && submission.publicationStatus === "NOT_PUBLISHED" ? (
            <section className="rounded-lg border border-urgent/40 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-bold">Zatwierdzone, ale nieopublikowane</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">To starsze zgłoszenie zachowuje swoją historię zatwierdzenia. Przygotuj nową wersję roboczą i świadomie wybierz dane do publikacji.</p>
              <form action={prepareApprovedSubmissionDraft} className="mt-4">
                <input type="hidden" name="submissionId" value={submission.id} />
                <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white">Przygotuj do publikacji</button>
              </form>
            </section>
          ) : null}
          {detail.kind === "place-update" ? (
            <PlaceUpdateDetails submission={detail.submission} />
          ) : (
            <NewPlaceDetails submission={detail.submission} />
          )}
        </div>
        <aside className="order-1 lg:order-2">
          <ModerationPanel
            entityId={submission.id}
            entityType={detail.kind}
            status={submission.moderationStatus}
            moderatorNote={submission.moderatorNote}
            rejectionReason={submission.rejectionReason}
          />
        </aside>
      </div>
    </div>
  );
}

type PlaceUpdateDetail = Extract<
  NonNullable<Awaited<ReturnType<typeof getSubmissionDetail>>>,
  { kind: "place-update" }
>["submission"];

function PlaceUpdateDetails({ submission }: { submission: PlaceUpdateDetail }) {
  const currentPlace = submission.targetPlace;
  const comparisons = [
    submission.proposedPhone
      ? { label: "Telefon", current: currentPlace?.phone ?? undefined, proposed: submission.proposedPhone }
      : null,
    submission.proposedAddress
      ? { label: "Adres", current: currentPlace?.addressLine, proposed: submission.proposedAddress }
      : null,
    submission.proposedOpeningHours
      ? {
          label: "Godziny",
          current: currentOpeningHours(currentPlace),
          proposed: submission.proposedOpeningHours,
        }
      : null,
    submission.proposedWebsite
      ? { label: "Strona WWW", current: currentPlace?.website ?? undefined, proposed: submission.proposedWebsite }
      : null,
    submission.proposedOtherValue
      ? { label: "Inna wartość", current: undefined, proposed: submission.proposedOtherValue }
      : null,
  ].filter(Boolean) as Array<{ label: string; current?: string; proposed: string }>;

  return (
    <>
      <DetailSection title="Treść zgłoszenia">
        <p className="mb-4 whitespace-pre-wrap text-sm leading-6">{submission.description}</p>
        <TagList items={submission.submissionTypes.map((type) => updateTypeLabels[type])} />
      </DetailSection>

      {comparisons.length > 0 ? (
        <DetailSection
          title="Porównanie danych"
          description={currentPlace ? "Bieżące wartości pochodzą z aktualnego, opublikowanego rekordu w PostgreSQL." : "Nie odnaleziono wiarygodnego rekordu miejsca. Pokazujemy wyłącznie zgłoszone wartości."}
        >
          <div className="space-y-4">
            {comparisons.map((comparison) => (
              <article key={comparison.label} className="rounded-lg border border-border p-4">
                <h3 className="mb-3 text-sm font-bold">{comparison.label}</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase text-muted-foreground">Obecnie</dt>
                    <dd className="mt-1 break-words text-sm leading-6">{comparison.current ?? "Brak wiarygodnych danych"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-brand-strong">Zgłoszona zmiana</dt>
                    <dd className="mt-1 break-words text-sm font-semibold leading-6">{comparison.proposed}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </DetailSection>
      ) : null}

      <SourceInfo sourceType={submission.sourceType} sourceUrl={submission.sourceUrl} />
      <ReporterContact name={submission.reporterName} email={submission.reporterEmail} phone={submission.reporterPhone} />
    </>
  );
}

type NewPlaceDetail = Extract<
  NonNullable<Awaited<ReturnType<typeof getSubmissionDetail>>>,
  { kind: "new-place" }
>["submission"];

function NewPlaceDetails({ submission }: { submission: NewPlaceDetail }) {
  const addressRows = [
    submission.streetAddress ? { label: "Ulica i numer", value: submission.streetAddress } : null,
    submission.postalCode ? { label: "Kod pocztowy", value: submission.postalCode } : null,
    { label: "Miasto", value: submission.city },
    submission.district ? { label: "Dzielnica", value: submission.district } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;
  const placeContactRows = [
    submission.phone
      ? { label: "Telefon", value: <a className="font-semibold text-brand-strong underline" href={`tel:${submission.phone}`}>{submission.phone}</a> }
      : null,
    submission.email
      ? { label: "E-mail", value: <a className="font-semibold text-brand-strong underline" href={`mailto:${submission.email}`}>{submission.email}</a> }
      : null,
    submission.website ? { label: "Strona WWW", value: <ExternalUrl href={submission.website} /> } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;
  const accommodationRows = [
    submission.accommodationType ? { label: "Typ noclegu", value: submission.accommodationType } : null,
    submission.availabilityKnown
      ? { label: "Czy dostępność jest znana", value: informationStateLabels[submission.availabilityKnown] }
      : null,
    submission.availableBedsReported !== null
      ? { label: "Zgłoszone wolne miejsca", value: String(submission.availableBedsReported) }
      : null,
    submission.availabilityReportedAt
      ? { label: "Aktualność informacji", value: formatAdminDate(submission.availabilityReportedAt) }
      : null,
    submission.availabilityReportedDescription
      ? { label: "Opis dostępności", value: submission.availabilityReportedDescription }
      : null,
    submission.admissionHoursDescription
      ? { label: "Godziny przyjęć", value: submission.admissionHoursDescription }
      : null,
    submission.sobrietyPolicy ? { label: "Zasady trzeźwości", value: submission.sobrietyPolicy } : null,
    submission.petPolicy ? { label: "Zwierzęta", value: submission.petPolicy } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  return (
    <>
      <DetailSection title="Podstawowe informacje">
        <InfoRows
          rows={[
            { label: "Nazwa miejsca", value: submission.name },
            ...(submission.organizationName
              ? [{ label: "Organizacja", value: submission.organizationName }]
              : []),
          ]}
        />
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-3 text-sm font-bold">Rodzaje pomocy</h3>
          <TagList items={submission.categories.map((category) => categoryLabels[category])} />
        </div>
      </DetailSection>

      <DetailSection title="Adres">
        <InfoRows rows={addressRows} />
      </DetailSection>

      {placeContactRows.length > 0 ? (
        <DetailSection title="Kontakt do miejsca">
          <InfoRows rows={placeContactRows} />
        </DetailSection>
      ) : null}

      {submission.openingHoursDescription ? (
        <DetailSection title="Godziny">
          <p className="whitespace-pre-wrap text-sm leading-6">{submission.openingHoursDescription}</p>
        </DetailSection>
      ) : null}

      {submission.description ? (
        <DetailSection title="Opis">
          <p className="whitespace-pre-wrap text-sm leading-6">{submission.description}</p>
        </DetailSection>
      ) : null}

      {submission.requirements.length > 0 ? (
        <DetailSection title="Warunki skorzystania">
          <TagList items={submission.requirements} />
        </DetailSection>
      ) : null}

      {accommodationRows.length > 0 || submission.targetGroups.length > 0 || submission.accessibilityFeatures.length > 0 ? (
        <DetailSection title="Informacje noclegowe">
          {accommodationRows.length > 0 ? <InfoRows rows={accommodationRows} /> : null}
          {submission.targetGroups.length > 0 ? (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-3 text-sm font-bold">Dla kogo</h3>
              <TagList items={submission.targetGroups} />
            </div>
          ) : null}
          {submission.accessibilityFeatures.length > 0 ? (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-3 text-sm font-bold">Dostępność</h3>
              <TagList items={submission.accessibilityFeatures} />
            </div>
          ) : null}
        </DetailSection>
      ) : null}

      <SourceInfo sourceType={submission.sourceType} sourceUrl={submission.sourceUrl} />
      <ReporterContact name={submission.reporterName} email={submission.reporterEmail} phone={submission.reporterPhone} />
    </>
  );
}
