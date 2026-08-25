import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";
import { ImportMappingForm } from "@/components/admin/imports/import-mapping-form";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusLabels = {
  IMPORT_READY: "Gotowe do importu",
  MATCH_EXISTING: "Dopasowane do istniejącego",
  REQUIRES_REVIEW: "Wymaga decyzji",
  IMPORTED: "Utworzono szkic",
  SKIPPED: "Pominięte",
} as const;
type Status = keyof typeof statusLabels;

function storedMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as { phase?: string; headers?: string[]; rows?: string[][]; mapping?: Record<string, string>; categoryMapping?: Record<string, string>; organizationMapping?: Record<string, string>; sheets?: Array<{ name: string; headers: string[]; rows: string[][] }> } : {};
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
        where: { status },
        orderBy: [{ proposedName: "asc" }, { proposedAddress: "asc" }],
        include: {
          matchedPlace: { select: { id: true, name: true, recordKind: true } },
          createdPlace: { select: { id: true, name: true, verificationQueueStatus: true, verificationStatus: true } },
          sources: { include: { sourceEntry: true } },
        },
      },
    },
  });
  if (!batch) notFound();
  const batchMetadata = storedMetadata(batch.metadata);
  const [mappingOptions, organizationOptions] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.organization.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const [counts, progressCandidates] = await Promise.all([
    prisma.importCandidate.groupBy({ by: ["status"], where: { importBatchId: id }, _count: { _all: true } }),
    prisma.importCandidate.findMany({ where: { importBatchId: id }, select: { status: true, queueStatus: true, resolution: true, reviewReasons: true, createdPlace: { select: { verificationQueueStatus: true, verificationStatus: true } } } }),
  ]);
  const count = (value: Status) => counts.find((item) => item.status === value)?._count._all ?? 0;
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
        {batch.sourceUrl ? <a href={batch.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-strong hover:underline"><ExternalLink aria-hidden="true" size={16} /> Dokument źródłowy</a> : <p className="mt-2 text-sm text-muted-foreground">Źródło: plik {batch.fileFormat ?? "import"}</p>}
      </header>
      {batchMetadata.phase !== "STAGED" && batchMetadata.rows && batchMetadata.headers ? <ImportMappingForm id={id} headers={batchMetadata.headers} rows={batchMetadata.rows} sheets={batchMetadata.sheets} initialSheet={batch.sheetName} initialMapping={batchMetadata.mapping ?? {}} categories={mappingOptions} organizations={organizationOptions} initialCategoryMapping={batchMetadata.categoryMapping ?? {}} initialOrganizationMapping={batchMetadata.organizationMapping ?? {}} /> : null}
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Postęp paczki">
        <Progress label="Nowe miejsca" value={importedPlaces} detail={`${verifiedPlaces} zweryfikowanych`} />
        <Progress label="Wymaga potwierdzenia" value={pendingPlaces} detail="bez automatycznej publikacji" urgent={pendingPlaces > 0} />
        <Progress label="Konflikty" value={conflicts.length} detail={`${resolvedConflicts} rozwiązanych`} />
        <Progress label="Pozostałe konflikty" value={conflicts.length - resolvedConflicts} detail="do ręcznej decyzji" urgent={conflicts.length > resolvedConflicts} />
      </section>
      <nav aria-label="Status kandydatów" className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {(Object.keys(statusLabels) as Status[]).map((value) => <Link key={value} href={`/admin/importy/${id}?status=${value}`} className={`inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-sm font-bold ${status === value ? "border-brand bg-brand-soft text-brand-strong" : "border-border bg-white"}`}>{statusLabels[value]} ({count(value)})</Link>)}
      </nav>
      <p className="text-sm text-muted-foreground">Oryginalne pozycje źródłowe pozostają niezmienione. Kandydaci wymagający decyzji nie zostali utworzeni jako miejsca.</p>
      {batch.candidates.length ? <ol className="space-y-2">{batch.candidates.map((candidate) => (
        <li key={candidate.id} className="rounded-lg border border-border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><span className="text-xs font-bold uppercase text-muted-foreground">{statusLabels[candidate.status]}</span><h2 className="mt-1 text-base font-bold">{candidate.proposedName}</h2><p className="mt-1 text-sm">{candidate.proposedAddress ?? "Brak stałego adresu"}</p><p className="mt-1 text-xs text-muted-foreground">{candidate.categorySlugs.join(" · ") || "Brak klasyfikacji"}</p></div>
            <div className="flex flex-wrap gap-2">{candidate.createdPlace ? <Link href={`/admin/miejsca/${candidate.createdPlace.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Otwórz szkic</Link> : candidate.matchedPlace ? <Link href={`/admin/miejsca/${candidate.matchedPlace.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Możliwy rekord: {candidate.matchedPlace.recordKind}</Link> : null}<Link href={`/admin/weryfikacja/${candidate.createdPlace?.id ?? candidate.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-3 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white">Weryfikuj</Link></div>
          </div>
          {candidate.reviewReasons.length ? <ul className="mt-3 space-y-1 rounded-md border border-urgent/25 bg-urgent-soft/40 p-3 text-sm">{candidate.reviewReasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul> : null}
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
