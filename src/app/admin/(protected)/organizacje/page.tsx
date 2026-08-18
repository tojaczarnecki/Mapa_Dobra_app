import Link from "next/link";
import { Building2, Eye, Pencil, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

function placeCountLabel(count: number) {
  if (count === 1) return "1 miejsce";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return `${count} miejsca`;
  return `${count} miejsc`;
}

export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().slice(0, 200);
  const sort = first(params.sort) ?? "name";
  const organizations = await prisma.organization.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { website: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { places: true } } },
    orderBy: sort === "places"
      ? [{ places: { _count: "desc" } }, { name: "asc" }]
      : sort === "updated"
        ? [{ updatedAt: "desc" }, { name: "asc" }]
        : [{ name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-bold text-brand-strong">Baza organizacji</p>
          <h1 className="text-3xl font-bold">Organizacje</h1>
          <p className="mt-1 text-sm text-muted-foreground">{organizations.length} organizacji w bieżącym widoku</p>
        </div>
        <Link href="/admin/organizacje/nowa" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white">
          <Plus aria-hidden="true" size={18} /> Dodaj organizację
        </Link>
      </header>

      <form method="get" className="grid gap-2 rounded-lg border border-border bg-white p-2.5 sm:grid-cols-[minmax(220px,1fr)_220px_auto] sm:items-end">
        <label className="text-xs font-bold">Szukaj po nazwie, e-mailu lub WWW
          <span className="relative mt-1 block"><Search aria-hidden="true" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input name="q" defaultValue={query} className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-10 pr-3 text-sm" /></span>
        </label>
        <label className="text-xs font-bold">Sortowanie
          <select name="sort" defaultValue={sort} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal">
            <option value="name">Nazwa A-Z</option><option value="places">Najwięcej miejsc</option><option value="updated">Ostatnio zmienione</option>
          </select>
        </label>
        <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold hover:bg-brand-soft">Zastosuj</button>
      </form>

      <div>
        <div className="mb-1.5 hidden grid-cols-[minmax(180px,1.3fr)_100px_minmax(150px,1fr)_minmax(130px,.8fr)_105px_150px] gap-3 px-3 text-[11px] font-bold uppercase text-muted-foreground xl:grid">
          <span>Organizacja</span><span>Miejsca</span><span>Kontakt</span><span>WWW</span><span>Edycja</span><span>Akcje</span>
        </div>
        <ol className="space-y-1.5">
          {organizations.map((organization) => (
            <li key={organization.id} className={`grid min-w-0 gap-2.5 rounded-md border border-border px-3 py-3 xl:grid-cols-[minmax(180px,1.3fr)_100px_minmax(150px,1fr)_minmax(130px,.8fr)_105px_150px] xl:items-center xl:gap-3 xl:py-2.5 ${organization.active ? "bg-white" : "bg-surface-muted/70"}`}>
              <div className="min-w-0"><strong className="block text-sm">{organization.name}</strong><span className="mt-0.5 inline-flex text-xs font-semibold text-muted-foreground"><Building2 aria-hidden="true" className="mr-1" size={14} /> {organization.active ? "Aktywna" : "Zarchiwizowana"}</span></div>
              <span className="text-sm font-semibold">{placeCountLabel(organization._count.places)}</span>
              <span className="min-w-0 truncate text-sm">{organization.phone || organization.email || "Brak kontaktu"}</span>
              <span className="min-w-0 truncate text-sm">{organization.website || "Brak"}</span>
              <span className="text-xs text-muted-foreground">{formatDate(organization.updatedAt)}</span>
              <div className="flex flex-wrap gap-1.5 xl:flex-nowrap xl:justify-end">
                <Link href={`/admin/organizacje/${organization.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-sm font-bold text-brand-strong hover:bg-brand-soft"><Eye aria-hidden="true" size={16} /> Podgląd</Link>
                <Link href={`/admin/organizacje/${organization.id}/edytuj`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-sm font-bold text-brand-strong hover:bg-brand-soft"><Pencil aria-hidden="true" size={16} /> Edytuj</Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
