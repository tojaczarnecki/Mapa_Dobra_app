import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";
import { activeImportIssueCodesForCandidate, importIssueLabel } from "@/lib/imports/issue-labels";
import { MaterializeCandidateButton } from "@/components/admin/imports/materialize-candidate-button";
import { hasSpreadsheetSourceRowDuplicate, isSpreadsheetBatchMetadata, isSpreadsheetPlaceReviewCandidate } from "@/lib/imports/spreadsheet-place-review";
import { duplicateRowNumbers, getDuplicateDecisionState, getDuplicateDisposition, isOriginalDuplicateEdge } from "@/lib/imports/duplicate-decisions";
import { DuplicateDecisionPanel } from "@/components/admin/imports/duplicate-decision-panel";
import { OrganizationDecisionPanel } from "@/components/admin/imports/organization-decision-panel";
import { parseOrganizationDecision, resolveEffectiveOrganization } from "@/lib/imports/organization-decisions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusLabels = {
  IMPORT_READY: "Gotowe do importu",
  MATCH_EXISTING: "Dopasowane do istniejącego",
  REQUIRES_REVIEW: "Wymaga decyzji",
  IMPORTED: "Utworzono szkic",
  SKIPPED: "Pominięte",
} as const;
type Status = keyof typeof statusLabels;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function rowNumber(candidateKey: string): number | null {
  const match = /^row-(\d+)$/.exec(candidateKey);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export default async function AdminImportBatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("VIEW_IMPORTS");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const query = await searchParams;
  const requestedStatus = first(query.status);
  const status = requestedStatus && requestedStatus in statusLabels ? requestedStatus as Status : "REQUIRES_REVIEW";
  const batch = await prisma.importBatch.findUnique({
    where: { id },
    include: {
      candidates: {
        orderBy: [{ proposedName: "asc" }, { proposedAddress: "asc" }],
        include: {
          matchedPlace: { select: { id: true, name: true, recordKind: true } },
          createdPlace: { select: { id: true, name: true, verificationQueueStatus: true, verificationStatus: true } },
          organizationDecision: { select: { decision: true, organizationId: true } },
          sources: { include: { sourceEntry: true } },
          duplicateDecisionsAsA: { select: { candidateBId: true, decision: true } },
          duplicateDecisionsAsB: { select: { candidateAId: true, decision: true } },
        },
      },
    },
  });
  if (!batch) notFound();
  const [progressCandidates, allCandidates] = await Promise.all([
    prisma.importCandidate.findMany({ where: { importBatchId: id }, select: { status: true, queueStatus: true, resolution: true, reviewReasons: true, createdPlace: { select: { verificationQueueStatus: true, verificationStatus: true } } } }),
    prisma.importCandidate.findMany({ where: { importBatchId: id }, select: { id: true, candidateKey: true, proposedData: true, proposedName: true, proposedAddress: true, proposedPhone: true, proposedOrganizationName: true, primaryCategorySlug: true, categorySlugs: true, status: true, resolution: true, createdPlaceId: true, queueStatus: true, duplicateDecisionsAsA: { select: { candidateBId: true, decision: true } }, duplicateDecisionsAsB: { select: { candidateAId: true, decision: true } } } }),
  ]);
  const selectedOrganizationIds = batch.candidates.flatMap((candidate) => candidate.organizationDecision?.organizationId ? [candidate.organizationDecision.organizationId] : []);
  const organizations = isSpreadsheetBatchMetadata(batch.metadata) ? await prisma.organization.findMany({ where: { OR: [{ active: true }, { id: { in: selectedOrganizationIds } }] }, select: { id: true, name: true, nip: true, regon: true, krs: true, active: true }, orderBy: { name: "asc" } }) : [];
  const rowNumberToCandidateId = new Map<number, string>();
  for (const candidate of allCandidates) {
    const sourceRow = rowNumber(candidate.candidateKey);
    if (sourceRow !== null) rowNumberToCandidateId.set(sourceRow, candidate.id);
  }
  const duplicateDecisions = allCandidates.flatMap((candidate) => [
    ...candidate.duplicateDecisionsAsA.map((decision) => ({ candidateAId: candidate.id, candidateBId: decision.candidateBId, decision: decision.decision as "KEEP_A" | "KEEP_B" | "DIFFERENT_RECORDS" })),
    ...candidate.duplicateDecisionsAsB.map((decision) => ({ candidateAId: decision.candidateAId, candidateBId: candidate.id, decision: decision.decision as "KEEP_A" | "KEEP_B" | "DIFFERENT_RECORDS" })),
  ]);
  const dispositionFor = (candidate: { id: string; proposedData: unknown }) => getDuplicateDisposition(getDuplicateDecisionState(candidate.id, duplicateRowNumbers(candidate.proposedData).map((rowNumber) => ({ rowNumber })), rowNumberToCandidateId, duplicateDecisions));
  const organizationResolvedFor = (candidate: { proposedData: unknown; organizationDecision?: { decision: string; organizationId: string | null } | null }) => {
    const root = candidate.proposedData && typeof candidate.proposedData === "object" && !Array.isArray(candidate.proposedData) ? candidate.proposedData as Record<string, unknown> : null;
    const analysis = root?.analysis && typeof root.analysis === "object" && !Array.isArray(root.analysis) ? root.analysis as Record<string, unknown> : null;
    const organization = analysis?.organization && typeof analysis.organization === "object" && !Array.isArray(analysis.organization) ? analysis.organization as Record<string, unknown> : null;
    const organizationStatus = organization?.status;
    if (typeof organizationStatus !== "string" || !["NONE", "MATCHED", "POSSIBLE", "CONFLICT", "NEW_CANDIDATE"].includes(organizationStatus)) return false;
    const organizationId = typeof organization?.organizationId === "string" ? organization.organizationId : null;
    const decision = parseOrganizationDecision(candidate.organizationDecision);
    const lookupId = decision?.decision === "SELECTED_ORGANIZATION" ? decision.organizationId : organizationStatus === "MATCHED" ? organizationId : null;
    const current = lookupId ? organizations.find((item) => item.id === lookupId) ?? null : null;
    const effective = resolveEffectiveOrganization({ status: organizationStatus as "NONE" | "MATCHED" | "POSSIBLE" | "CONFLICT" | "NEW_CANDIDATE", organizationId }, decision, current);
    return effective.status !== "UNRESOLVED" && effective.status !== "BLOCKED_INACTIVE_MATCH";
  };
  const activeIssuesFor = (candidate: { reviewReasons: readonly string[]; id: string; proposedData: unknown; organizationDecision?: { decision: string; organizationId: string | null } | null }) => activeImportIssueCodesForCandidate(candidate.proposedData, candidate.reviewReasons, dispositionFor(candidate), organizationResolvedFor(candidate));
  const effectiveStatus = (candidate: { status: string; id: string; proposedData: unknown }): Status => dispositionFor(candidate) === "LOSER" ? "SKIPPED" : candidate.status as Status;
  const count = (value: Status) => allCandidates.filter((candidate) => effectiveStatus(candidate) === value).length;
  const importedPlaces = progressCandidates.filter((item) => item.createdPlace).length;
  const verifiedPlaces = progressCandidates.filter((item) => item.createdPlace?.verificationStatus === "VERIFIED").length;
  const pendingPlaces = progressCandidates.filter((item) => item.createdPlace && item.createdPlace.verificationStatus !== "VERIFIED").length;
  const conflicts = progressCandidates.filter((item) => item.reviewReasons.length > 0 || item.status === "MATCH_EXISTING" || item.resolution !== null);
  const resolvedConflicts = conflicts.filter((item) => item.queueStatus === "VERIFIED" || item.queueStatus === "SKIPPED").length;
  return (
    <div className="space-y-5">
      <Link href="/admin/importy" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} /> Wróć do importów</Link>
      <header className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <p className="text-sm font-bold text-brand-strong">{batch.key}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{batch.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{batch.publisher} · edycja {batch.edition}</p>
        <a href={batch.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-strong hover:underline"><ExternalLink aria-hidden="true" size={16} /> Dokument źródłowy</a>
      </header>
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Postęp paczki">
        <Progress label="Nowe miejsca" value={importedPlaces} detail={`${verifiedPlaces} zweryfikowanych`} />
        <Progress label="Wymaga potwierdzenia" value={pendingPlaces} detail="bez automatycznej publikacji" urgent={pendingPlaces > 0} />
        <Progress label="Konflikty" value={conflicts.length} detail={`${resolvedConflicts} rozwiązanych`} />
        <Progress label="Pozostałe konflikty" value={conflicts.length - resolvedConflicts} detail="do ręcznej decyzji" urgent={conflicts.length > resolvedConflicts} />
      </section>
      <nav aria-label="Status kandydatów" className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {(Object.keys(statusLabels) as Status[]).map((value) => <Link key={value} href={`/admin/importy/${id}?status=${value}`} className={`inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-sm font-bold ${status === value ? "border-brand bg-brand-soft text-brand-strong" : "border-border bg-white"}`}>{statusLabels[value]} ({count(value)})</Link>)}
      </nav>
      {status === "IMPORT_READY" ? <p className="text-sm text-muted-foreground">Rekord jest gotowy do utworzenia jako szkic. Akcja utworzenia miejsca będzie dostępna w kolejnym kroku.</p> : null}
      {status === "REQUIRES_REVIEW" ? <p className="text-sm text-muted-foreground">Ten rekord wymaga rozstrzygnięcia konfliktu przed utworzeniem miejsca.</p> : null}
      <p className="text-sm text-muted-foreground">Oryginalne pozycje źródłowe pozostają niezmienione. Kandydaci wymagający decyzji nie zostali utworzeni jako miejsca.</p>
      {batch.candidates.filter((candidate) => effectiveStatus(candidate) === status).length ? <ol className="space-y-2">{batch.candidates.filter((candidate) => effectiveStatus(candidate) === status).map((candidate) => (
        <li key={candidate.id} className="rounded-lg border border-border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><span className="text-xs font-bold uppercase text-muted-foreground">{statusLabels[effectiveStatus(candidate)]}</span><h2 className="mt-1 text-base font-bold">{candidate.proposedName}</h2><p className="mt-1 text-sm">{candidate.proposedAddress ?? "Brak stałego adresu"}</p><p className="mt-1 text-xs text-muted-foreground">{candidate.categorySlugs.join(" · ") || "Brak klasyfikacji"}</p></div>
            <div className="flex flex-wrap gap-2">{dispositionFor(candidate) === "LOSER" ? <span className="inline-flex min-h-11 items-center rounded-lg border border-border bg-[#f5f3ed] px-3 text-sm font-bold text-muted-foreground">Pominięto jako duplikat</span> : candidate.createdPlace ? <><span className="inline-flex min-h-11 items-center rounded-lg border border-brand/30 bg-brand-soft px-3 text-sm font-bold text-brand-strong">Utworzono szkic</span><Link href={`/admin/miejsca/${candidate.createdPlace.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Otwórz szkic</Link></> : candidate.matchedPlace ? <Link href={`/admin/miejsca/${candidate.matchedPlace.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Możliwy rekord: {candidate.matchedPlace.recordKind}</Link> : candidate.status === "IMPORT_READY" ? <MaterializeCandidateButton candidateId={candidate.id} batchId={id} /> : null}{dispositionFor(candidate) !== "LOSER" && (candidate.queueStatus || isSpreadsheetPlaceReviewCandidate({ batchMetadata: batch.metadata, status: candidate.status, proposedData: candidate.proposedData, resolution: candidate.resolution }, dispositionFor(candidate))) ? <Link href={`/admin/weryfikacja/${candidate.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-3 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white">Weryfikuj</Link> : null}</div>
            {isSpreadsheetBatchMetadata(batch.metadata) && hasSpreadsheetSourceRowDuplicate({ proposedData: candidate.proposedData }) && dispositionFor(candidate) === "UNRESOLVED" ? <p className="mt-2 text-sm text-muted-foreground">Rekord wymaga rozstrzygnięcia duplikatu w pliku.</p> : null}
            {dispositionFor(candidate) === "LOSER" ? <p className="mt-2 text-sm text-muted-foreground">Ten wpis nie będzie importowany — zachowano inny rekord z tego pliku.</p> : null}
          </div>
          {activeIssuesFor(candidate).length ? <ul className="mt-3 space-y-1 rounded-md border border-urgent/25 bg-urgent-soft/40 p-3 text-sm">{activeIssuesFor(candidate).map((reason) => <li key={reason}>• {importIssueLabel(reason)}</li>)}</ul> : null}
          {(() => {
            const root = candidate.proposedData && typeof candidate.proposedData === "object" && !Array.isArray(candidate.proposedData) ? candidate.proposedData as Record<string, unknown> : null;
            const mapped = root?.mappedValues && typeof root.mappedValues === "object" && !Array.isArray(root.mappedValues) ? root.mappedValues as Record<string, unknown> : null;
            const analysis = root?.analysis && typeof root.analysis === "object" && !Array.isArray(root.analysis) ? root.analysis as Record<string, unknown> : null;
            const organizationAnalysis = analysis?.organization && typeof analysis.organization === "object" && !Array.isArray(analysis.organization) ? analysis.organization as Record<string, unknown> : null;
            const status = organizationAnalysis?.status;
            const relevant = status === "NEW_CANDIDATE" || status === "POSSIBLE" || status === "CONFLICT" || status === "MATCHED" || candidate.organizationDecision;
            const terminal = candidate.status === "IMPORTED" || candidate.status === "SKIPPED" || Boolean(candidate.createdPlaceId) || candidate.resolution === "SAME_PLACE";
            if (!isSpreadsheetBatchMetadata(batch.metadata) || !relevant) return null;
            const matchedOrganizationId = typeof organizationAnalysis?.organizationId === "string" ? organizationAnalysis.organizationId : null;
            const matchedOrganization = matchedOrganizationId ? organizations.find((item) => item.id === matchedOrganizationId) : null;
            const unresolvedMatched = status === "MATCHED" && !matchedOrganization?.active;
            const shouldEdit = !terminal && (status !== "MATCHED" || unresolvedMatched || Boolean(candidate.organizationDecision));
            const candidateIds = Array.isArray(organizationAnalysis?.candidateIds) ? organizationAnalysis.candidateIds.filter((value): value is string => typeof value === "string") : [];
            return <OrganizationDecisionPanel candidateId={candidate.id} batchId={id} source={{ name: typeof mapped?.organizationName === "string" ? mapped.organizationName : null, nip: typeof mapped?.organizationNip === "string" ? mapped.organizationNip : null, regon: typeof mapped?.organizationRegon === "string" ? mapped.organizationRegon : null, krs: typeof mapped?.organizationKrs === "string" ? mapped.organizationKrs : null }} suggestedIds={candidateIds} organizations={organizations} currentDecision={candidate.organizationDecision} active={shouldEdit} />;
          })()}
          {(() => {
            const sourceCandidate = allCandidates.find((item) => item.id === candidate.id);
            if (!sourceCandidate) return null;
            const currentRowNumber = rowNumber(sourceCandidate.candidateKey);
            const duplicates = currentRowNumber === null ? [] : allCandidates.flatMap((duplicate) => {
              const duplicateRow = rowNumber(duplicate.candidateKey);
              if (duplicate.id === candidate.id || duplicateRow === null || !isOriginalDuplicateEdge({ rowNumber: currentRowNumber, proposedData: sourceCandidate.proposedData }, { rowNumber: duplicateRow, proposedData: duplicate.proposedData })) return [];
              const decision = sourceCandidate.duplicateDecisionsAsA.find((item) => item.candidateBId === duplicate.id)?.decision ?? sourceCandidate.duplicateDecisionsAsB.find((item) => item.candidateAId === duplicate.id)?.decision ?? null;
              return [{ id: duplicate.id, rowNumber: duplicateRow, name: duplicate.proposedName, address: duplicate.proposedAddress, phone: duplicate.proposedPhone, organization: duplicate.proposedOrganizationName, category: (duplicate.primaryCategorySlug ?? duplicate.categorySlugs.join(" · ")) || null, decision, canonicalCurrent: candidate.id < duplicate.id }];
            });
            return <DuplicateDecisionPanel candidateId={candidate.id} batchId={id} duplicates={duplicates} />;
          })()}
          <details className="mt-3 border-t border-border pt-3 text-sm">
            <summary className="min-h-11 cursor-pointer font-bold text-brand-strong">Pokaż dokładny zapis z PDF</summary>
            <div className="space-y-3 pt-2">{candidate.sources.map(({ sourceEntry }) => <article key={sourceEntry.id} className="rounded-md bg-[#f5f3ed] p-3"><p className="text-xs font-bold uppercase text-muted-foreground">{sourceEntry.section} · strony {sourceEntry.sourcePages.join(", ")}</p><pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-sans text-sm leading-5">{sourceEntry.rawText}</pre></article>)}</div>
          </details>
        </li>
      ))}</ol> : <div className="rounded-lg border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted-foreground">Brak kandydatów w tym statusie.</div>}
    </div>
  );
}

function Progress({ label, value, detail, urgent = false }: { label: string; value: number; detail: string; urgent?: boolean }) {
  return <div className={`rounded-lg border p-3 ${urgent ? "border-urgent/30 bg-urgent-soft/30" : "border-border bg-white"}`}><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
