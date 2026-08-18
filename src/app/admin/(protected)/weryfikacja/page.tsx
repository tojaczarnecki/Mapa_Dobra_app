import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Filter, MapPinOff, SearchCheck } from "lucide-react";
import { VerificationStatusBadge } from "@/components/admin/verification/verification-status-badge";
import { prisma } from "@/lib/prisma";
import { getVerificationQueueItems } from "@/lib/verification/queue";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const statusValues = ["PENDING", "IN_PROGRESS", "CONTACT_REQUIRED", "READY", "VERIFIED", "SKIPPED"] as const;
const typeValues = ["NEW_PLACE", "POSSIBLE_DUPLICATE", "MATCH_EXISTING", "IMPORT_CONFLICT"] as const;
const dataValues = ["missing-coordinates", "missing-phone", "missing-hours", "missing-primary-category", "accommodation", "manual-decision"] as const;
const statusLabels = { PENDING: "Wymaga weryfikacji", IN_PROGRESS: "W trakcie", CONTACT_REQUIRED: "Wymaga kontaktu", READY: "Gotowe", VERIFIED: "Zweryfikowane", SKIPPED: "Odrzucone / pominięte" } as const;
const typeLabels = { NEW_PLACE: "Nowe miejsce", POSSIBLE_DUPLICATE: "Możliwy duplikat", MATCH_EXISTING: "Dopasowanie do istniejącego", IMPORT_CONFLICT: "Inny konflikt importowy" } as const;

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function valid<T extends string>(value: string | undefined, values: readonly T[]) { return value && values.includes(value as T) ? value as T : undefined; }

export default async function VerificationQueuePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = valid(first(params.status), statusValues);
  const type = valid(first(params.type), typeValues);
  const data = valid(first(params.data), dataValues);
  const source = first(params.source) ?? "all";
  const [items, batches] = await Promise.all([
    getVerificationQueueItems(),
    prisma.importBatch.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, edition: true } }),
  ]);
  const filtered = items.filter((item) => {
    if (status && item.queueStatus !== status) return false;
    if (type && item.issueType !== type) return false;
    if (source !== "all" && item.sourceBatchId !== source) return false;
    if (data === "missing-coordinates" && !item.missingCoordinates) return false;
    if (data === "missing-phone" && !item.missingPhone) return false;
    if (data === "missing-hours" && !item.missingHours) return false;
    if (data === "missing-primary-category" && !item.missingPrimaryCategory) return false;
    if (data === "accommodation" && !item.accommodation) return false;
    if (data === "manual-decision" && !item.manualDecision) return false;
    return true;
  });
  const active = items.filter((item) => item.queueStatus !== "VERIFIED" && item.queueStatus !== "SKIPPED");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const stats = [
    { label: "Wszystkie do weryfikacji", value: active.length, icon: SearchCheck },
    { label: "Nowe miejsca", value: active.filter((item) => item.entityKind === "PLACE").length, icon: CheckCircle2 },
    { label: "Konflikty / duplikaty", value: active.filter((item) => item.entityKind === "CANDIDATE").length, icon: AlertTriangle },
    { label: "Wymaga kontaktu", value: items.filter((item) => item.queueStatus === "CONTACT_REQUIRED").length, icon: AlertTriangle },
    { label: "Brak współrzędnych", value: active.filter((item) => item.entityKind === "PLACE" && item.missingCoordinates).length, icon: MapPinOff },
    { label: "Gotowe do publikacji", value: items.filter((item) => item.queueStatus === "READY").length, icon: CheckCircle2 },
    { label: "Zweryfikowane dzisiaj", value: items.filter((item) => item.verifiedAt && item.verifiedAt >= today).length, icon: CheckCircle2 },
  ];
  return (
    <div className="space-y-5">
      <header><p className="mb-1 text-sm font-bold text-brand-strong">Jakość danych</p><h1 className="text-3xl font-bold">Weryfikacja</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Źródło → porównanie → poprawka → lokalizacja → aktualne potwierdzenie → świadoma publikacja.</p></header>
      <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-border bg-white p-3"><dt className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Icon aria-hidden="true" size={16} />{label}</dt><dd className="mt-1 text-2xl font-bold">{value}</dd></div>)}</dl>
      <form method="get" className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
        <FilterSelect label="Status" name="status" value={status ?? "all"} options={statusValues.map((value) => ({ value, label: statusLabels[value] }))} />
        <FilterSelect label="Typ" name="type" value={type ?? "all"} options={typeValues.map((value) => ({ value, label: typeLabels[value] }))} />
        <FilterSelect label="Dane" name="data" value={data ?? "all"} options={[{ value: "missing-coordinates", label: "Brak współrzędnych" }, { value: "missing-phone", label: "Brak telefonu" }, { value: "missing-hours", label: "Brak godzin" }, { value: "missing-primary-category", label: "Brak kategorii głównej" }, { value: "accommodation", label: "Nocleg" }, { value: "manual-decision", label: "Tylko ręczna decyzja" }]} />
        <FilterSelect label="Źródło" name="source" value={source} options={batches.map((batch) => ({ value: batch.id, label: `${batch.title} · ${batch.edition}` }))} />
        <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-bold hover:bg-brand-soft"><Filter aria-hidden="true" size={18} />Zastosuj</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">{filtered.length} pozycji w bieżącym widoku</p>{status || type || data || source !== "all" ? <Link href="/admin/weryfikacja" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft">Wyczyść filtry</Link> : null}</div>
      {filtered.length ? <ol className="space-y-2">{filtered.map((item) => {
        const flags = [item.issueType !== "NEW_PLACE" ? typeLabels[item.issueType] : null, item.missingCoordinates ? "Brak współrzędnych" : null, item.missingHours ? "Godziny UNKNOWN" : null, item.missingPhone ? "Brak telefonu" : null].filter(Boolean) as string[];
        return <li key={`${item.entityKind}-${item.id}`} className="rounded-lg border border-border bg-white p-3 sm:p-4"><div className="grid gap-3 xl:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_170px_190px_auto] xl:items-center"><div className="min-w-0"><p className="text-xs font-bold uppercase text-muted-foreground">{item.entityKind === "PLACE" ? "Nowy szkic miejsca" : typeLabels[item.issueType]}</p><h2 className="mt-1 font-bold leading-5">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.categories.join(" · ") || "Brak klasyfikacji"}</p></div><div className="text-sm"><p>{item.address ?? "Brak stałego adresu"}</p><p className="mt-1 text-xs text-muted-foreground">strony {item.sourcePages.join(", ") || "—"}</p></div><VerificationStatusBadge status={item.queueStatus} /><div><p className="text-xs font-bold text-muted-foreground line-clamp-2">{item.sourceLabel}</p><p className={`mt-1 text-xs font-semibold ${flags.length ? "text-[#8b2d0b]" : "text-brand-strong"}`}>{flags.length ? flags.join(" · ") : "Dane kompletne w zakresie wymaganym"}</p></div><Link href={`/admin/weryfikacja/${item.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white">Zweryfikuj <ArrowRight aria-hidden="true" size={17} /></Link></div></li>;
      })}</ol> : <div className="rounded-lg border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted-foreground">Brak pozycji pasujących do filtrów.</div>}
    </div>
  );
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value: string; options: Array<{ value: string; label: string }> }) {
  return <label className="text-sm font-bold"><span className="mb-1 block text-xs">{label}</span><select name={name} defaultValue={value} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="all">Wszystkie</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
