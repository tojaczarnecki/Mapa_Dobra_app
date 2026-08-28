import Link from "next/link";
import { ArrowRight, ExternalLink, FileInput } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";

const batchStatusLabels = {
  PROCESSING: "W trakcie zapisu",
  STAGED: "Przygotowana",
  FAILED: "Zapis nieudany",
  IMPORTED: "Zaimportowana",
  COMPLETED_WITH_REVIEW: "Import zakończony - wymaga decyzji",
} as const;

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Nie wykonano";
}

export default async function AdminImportsPage() {
  await requirePermission("VIEW_IMPORTS");
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { candidates: { select: { status: true } } },
  });
  return (
    <div className="space-y-5">
      <header>
        <p className="mb-1 text-sm font-bold text-brand-strong">Źródła danych</p>
        <h1 className="text-3xl font-bold">Importy</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Paczki źródłowe, kandydaci po deduplikacji i rekordy oczekujące na decyzję administratora.</p>
      </header>
      {batches.length ? <ol className="space-y-2">{batches.map((batch) => {
        const count = (status: string) => batch.candidates.filter((candidate) => candidate.status === status).length;
        return (
          <li key={batch.id} className="rounded-lg border border-border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex min-h-7 items-center rounded-full border border-brand/35 bg-brand-soft px-2.5 py-1 text-xs font-bold text-[#086b55]">{batchStatusLabels[batch.status]}</span>
                <h2 className="mt-2 text-lg font-bold">{batch.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{batch.publisher} · edycja {batch.edition} · import: {formatDate(batch.importedAt)}</p>
              </div>
              <Link href={`/admin/importy/${batch.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Otwórz paczkę <ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Pozycje źródłowe" value={batch.rawEntryCount} />
              <Stat label="Kandydaci" value={batch.candidateCount} />
              <Stat label="Utworzone szkice" value={count("IMPORTED")} />
              <Stat label="Dopasowane" value={count("MATCH_EXISTING")} />
              <Stat label="Wymaga decyzji" value={count("REQUIRES_REVIEW")} urgent={count("REQUIRES_REVIEW") > 0} />
            </dl>
            <a href={batch.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-strong hover:underline"><ExternalLink aria-hidden="true" size={16} /> Otwórz dokument źródłowy</a>
          </li>
        );
      })}</ol> : <div className="rounded-lg border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted-foreground"><FileInput aria-hidden="true" className="mx-auto mb-2" /> Brak paczek importowych.</div>}
    </div>
  );
}

function Stat({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  return <div className={`rounded-md border px-3 py-2 ${urgent ? "border-urgent/30 bg-urgent-soft/40" : "border-border bg-[#faf9f5]"}`}><dt className="text-xs font-bold text-muted-foreground">{label}</dt><dd className="mt-0.5 text-xl font-bold">{value}</dd></div>;
}
